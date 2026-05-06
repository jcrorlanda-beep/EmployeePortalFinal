import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { writeAuditLog } from '../services/auditService';
import { portalPermissions } from '../types/permissions';

export const inventoryRouter = Router();

inventoryRouter.use('/api/employee-portal/inventory', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.inventoryManage));

const inventoryItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1).optional().default('pcs'),
  quantityOnHand: z.number().nonnegative().optional().default(0),
  reorderPoint: z.number().nonnegative().optional().default(0),
  supplier: z.string().optional(),
  costPlaceholder: z.string().optional(),
  photoReference: z.string().optional(),
});

const inventoryItemUpdateSchema = inventoryItemSchema.partial();

const movementSchema = z.object({
  inventoryItemId: z.string().min(1),
  movementType: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().positive(),
  reason: z.string().min(1),
});

const actorFromRequest = (request: { user?: { email?: string } }) => request.user?.email ?? 'anonymous';
const decimalToNumber = (value: { toNumber?: () => number } | number | null | undefined) =>
  typeof value === 'number' ? value : value?.toNumber?.() ?? 0;

const mapInventoryItem = (item: {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantityOnHand: { toNumber?: () => number } | number;
  reorderPoint: { toNumber?: () => number } | number;
  supplier: string | null;
  costPlaceholder: string | null;
  photoReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: item.id,
  sku: item.sku,
  name: item.name,
  unit: item.unit,
  quantityOnHand: decimalToNumber(item.quantityOnHand),
  reorderPoint: decimalToNumber(item.reorderPoint),
  supplier: item.supplier ?? undefined,
  costPlaceholder: item.costPlaceholder ?? undefined,
  photoReference: item.photoReference ?? undefined,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const mapMovement = (movement: {
  id: string;
  inventoryItemId: string;
  movementType: string;
  quantity: { toNumber?: () => number } | number;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: movement.id,
  inventoryItemId: movement.inventoryItemId,
  movementType: movement.movementType,
  quantity: decimalToNumber(movement.quantity),
  reason: movement.reason,
  createdAt: movement.createdAt.toISOString(),
  updatedAt: movement.updatedAt.toISOString(),
});

inventoryRouter.get('/api/employee-portal/inventory/items', requireAuth, async (_req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: items.map(mapInventoryItem) });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/api/employee-portal/inventory/items/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: String(req.params.id) } });
    if (!item) {
      return next(Object.assign(new Error('Inventory item not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: mapInventoryItem(item) });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post('/api/employee-portal/inventory/items', requireAuth, async (req, res, next) => {
  try {
    const parsed = inventoryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const item = await prisma.inventoryItem.create({
      data: {
        ...parsed.data,
        supplier: parsed.data.supplier?.trim() || undefined,
        costPlaceholder: parsed.data.costPlaceholder?.trim() || undefined,
        photoReference: parsed.data.photoReference?.trim() || undefined,
      },
    });
    const mapped = mapInventoryItem(item);
    await writeAuditLog({
      module: 'Inventory',
      action: 'inventory.item.created',
      actor: actorFromRequest(req),
      entityId: item.id,
      summary: `Created inventory item ${item.name}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.patch('/api/employee-portal/inventory/items/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = inventoryItemUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.inventoryItem.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Inventory item not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const item = await prisma.inventoryItem.update({
      where: { id: String(req.params.id) },
      data: {
        ...parsed.data,
        supplier: parsed.data.supplier?.trim(),
        costPlaceholder: parsed.data.costPlaceholder?.trim(),
        photoReference: parsed.data.photoReference?.trim(),
      },
    });
    const mapped = mapInventoryItem(item);
    await writeAuditLog({
      module: 'Inventory',
      action: 'inventory.item.updated',
      actor: actorFromRequest(req),
      entityId: item.id,
      summary: `Updated inventory item ${item.name}.`,
      beforePayload: mapInventoryItem(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post('/api/employee-portal/inventory/movements', requireAuth, async (req, res, next) => {
  try {
    const parsed = movementSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existingItem = await prisma.inventoryItem.findUnique({ where: { id: parsed.data.inventoryItemId } });
    if (!existingItem) {
      return next(Object.assign(new Error('Inventory item not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const movement = await prisma.inventoryMovement.create({ data: parsed.data });
    const currentQty = decimalToNumber(existingItem.quantityOnHand);
    const delta = parsed.data.movementType === 'in'
      ? parsed.data.quantity
      : parsed.data.movementType === 'out'
        ? -parsed.data.quantity
        : parsed.data.quantity;
    await prisma.inventoryItem.update({
      where: { id: parsed.data.inventoryItemId },
      data: {
        quantityOnHand: Math.max(0, currentQty + delta),
      },
    });
    const mapped = mapMovement(movement);
    await writeAuditLog({
      module: 'Inventory',
      action: 'inventory.movement.created',
      actor: actorFromRequest(req),
      entityId: movement.id,
      summary: `Recorded ${movement.movementType} inventory movement for ${existingItem.name}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/api/employee-portal/inventory/movements', requireAuth, async (_req, res, next) => {
  try {
    const movements = await prisma.inventoryMovement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: movements.map(mapMovement) });
  } catch (err) {
    next(err);
  }
});
