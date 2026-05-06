import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { recordAuditEvent } from '../services/auditPersistenceService';
import { syncAttachmentReference } from '../services/attachmentPersistenceService';
import { portalPermissions } from '../types/permissions';

export const equipmentRouter = Router();

const staleRecordMessage = 'Record was updated by another user. Please refresh and try again.';
const staleRecordError = () => Object.assign(new Error(staleRecordMessage), { status: 409, code: 'STALE_RECORD' });
const assertFreshRecord = (expectedUpdatedAt: string | undefined, actualUpdatedAt: Date) => {
  if (expectedUpdatedAt && actualUpdatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
    throw staleRecordError();
  }
};

equipmentRouter.use('/api/employee-portal/equipment', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.equipmentManage));

const toolDepositSchema = z.object({
  employeeId: z.string().min(1),
  equipmentItemId: z.string().optional(),
  description: z.string().optional(),
  amountFormulaCode: z.string().min(1),
  initialAmount: z.number().nonnegative().optional().default(0),
  balance: z.number().nonnegative().optional(),
  refundable: z.boolean().optional().default(true),
  payrollFormulaCode: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional().default('active'),
});

const toolDepositUpdateSchema = toolDepositSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
const toolDepositResolutionSchema = z.object({
  notes: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
});

const equipmentItemSchema = z.object({
  assetTag: z.string().min(1),
  name: z.string().min(1),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string().min(1),
  condition: z.enum(['new', 'good', 'fair', 'poor']).optional().default('good'),
  location: z.string().optional(),
  photoReference: z.string().optional(),
  serialNumberPhotoReference: z.string().optional(),
  damagePhotoReference: z.string().optional(),
  status: z.string().optional().default('available'),
});

const equipmentItemUpdateSchema = equipmentItemSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const assignmentSchema = z.object({
  employeeId: z.string().min(1),
  equipmentItemId: z.string().min(1),
  toolDepositId: z.string().optional(),
  assignedOn: z.string().min(1),
  returnedOn: z.string().optional(),
  conditionNotes: z.string().optional(),
  damageStatus: z.enum(['none', 'minor', 'major', 'lost']).optional().default('none'),
  photoProofReference: z.string().optional(),
});

const assignmentUpdateSchema = assignmentSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const decimalToNumber = (value: { toNumber?: () => number } | number | null | undefined) =>
  typeof value === 'number' ? value : value?.toNumber?.() ?? 0;

const mapToolDeposit = (deposit: {
  id: string;
  employeeId: string;
  equipmentItemId: string | null;
  description: string;
  amountFormulaCode: string;
  initialAmount: { toNumber?: () => number } | number;
  balance: { toNumber?: () => number } | number;
  refundable: boolean;
  payrollFormulaCode: string | null;
  notes: string | null;
  status: string;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: deposit.id,
  employeeId: deposit.employeeId,
  equipmentItemId: deposit.equipmentItemId ?? undefined,
  description: deposit.description,
  amountFormulaCode: deposit.amountFormulaCode,
  initialAmount: decimalToNumber(deposit.initialAmount),
  balance: decimalToNumber(deposit.balance),
  refundable: deposit.refundable,
  payrollFormulaCode: deposit.payrollFormulaCode ?? undefined,
  notes: deposit.notes ?? undefined,
  status: deposit.status,
  resolvedAt: deposit.resolvedAt?.toISOString(),
  resolutionNotes: deposit.resolutionNotes ?? undefined,
  createdAt: deposit.createdAt.toISOString(),
  updatedAt: deposit.updatedAt.toISOString(),
});

const mapEquipmentItem = (item: {
  id: string;
  assetTag: string;
  name: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  category: string;
  condition: string;
  location: string | null;
  photoReference: string | null;
  serialNumberPhotoReference: string | null;
  damagePhotoReference: string | null;
  status: string;
  assignedEmployeeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: item.id,
  assetTag: item.assetTag,
  name: item.name,
  serialNumber: item.serialNumber ?? undefined,
  brand: item.brand ?? undefined,
  model: item.model ?? undefined,
  category: item.category,
  condition: item.condition,
  location: item.location ?? undefined,
  photoReference: item.photoReference ?? undefined,
  serialNumberPhotoReference: item.serialNumberPhotoReference ?? undefined,
  damagePhotoReference: item.damagePhotoReference ?? undefined,
  status: item.status,
  assignedEmployeeId: item.assignedEmployeeId ?? undefined,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const mapAssignment = (assignment: {
  id: string;
  employeeId: string;
  equipmentItemId: string;
  toolDepositId: string | null;
  assignedOn: Date;
  returnedOn: Date | null;
  conditionNotes: string | null;
  damageStatus: string;
  photoProofReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: assignment.id,
  employeeId: assignment.employeeId,
  equipmentItemId: assignment.equipmentItemId,
  toolDepositId: assignment.toolDepositId ?? undefined,
  assignedOn: assignment.assignedOn.toISOString().slice(0, 10),
  returnedOn: assignment.returnedOn?.toISOString().slice(0, 10),
  conditionNotes: assignment.conditionNotes ?? undefined,
  damageStatus: assignment.damageStatus,
  photoProofReference: assignment.photoProofReference ?? undefined,
  createdAt: assignment.createdAt.toISOString(),
  updatedAt: assignment.updatedAt.toISOString(),
});

const syncToolDepositLedger = async (employeeId: string, fallbackFormulaCode: string) => {
  const deposits = await prisma.toolDeposit.findMany({ where: { employeeId } });
  const outstandingBalance = deposits.reduce((total, deposit) => {
    if (['refunded', 'forfeited', 'waived'].includes(deposit.status)) {
      return total;
    }
    return total + decimalToNumber(deposit.balance);
  }, 0);
  const latestLedger = await prisma.employeeDebtLedger.findFirst({
    where: { employeeId, source: 'tool-deposit' },
    orderBy: { updatedAt: 'desc' },
  });
  const formulaCode = deposits.find((deposit) => deposit.payrollFormulaCode || deposit.amountFormulaCode)?.payrollFormulaCode
    ?? deposits.find((deposit) => deposit.payrollFormulaCode || deposit.amountFormulaCode)?.amountFormulaCode
    ?? fallbackFormulaCode;

  if (latestLedger) {
    await prisma.employeeDebtLedger.update({
      where: { id: latestLedger.id },
      data: {
        balance: outstandingBalance,
        formulaCode,
        notes: outstandingBalance > 0 ? 'Tool deposit balances pending refund/forfeit resolution.' : 'No outstanding tool deposit balance.',
      },
    });
    return;
  }

  await prisma.employeeDebtLedger.create({
    data: {
      employeeId,
      source: 'tool-deposit',
      balance: outstandingBalance,
      formulaCode,
      notes: outstandingBalance > 0 ? 'Tool deposit balances pending refund/forfeit resolution.' : 'No outstanding tool deposit balance.',
    },
  });
};

// Tool deposit routes
equipmentRouter.get('/api/employee-portal/equipment/tool-deposits', requireAuth, async (_req, res, next) => {
  try {
    const deposits = await prisma.toolDeposit.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: deposits.map(mapToolDeposit) });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.get('/api/employee-portal/equipment/tool-deposits/:id', requireAuth, async (req, res, next) => {
  try {
    const deposit = await prisma.toolDeposit.findUnique({ where: { id: String(req.params.id) } });
    if (!deposit) {
      return next(Object.assign(new Error('Tool deposit not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: mapToolDeposit(deposit) });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.post('/api/employee-portal/equipment/tool-deposits', requireAuth, async (req, res, next) => {
  try {
    const parsed = toolDepositSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const payload = parsed.data;
    const initialAmount = payload.initialAmount ?? 0;
    const deposit = await prisma.toolDeposit.create({
      data: {
        employeeId: payload.employeeId,
        equipmentItemId: payload.equipmentItemId,
        description: payload.description?.trim() || '',
        amountFormulaCode: payload.amountFormulaCode.trim(),
        initialAmount,
        balance: payload.balance ?? initialAmount,
        refundable: payload.refundable ?? true,
        payrollFormulaCode: payload.payrollFormulaCode?.trim() || payload.amountFormulaCode.trim(),
        notes: payload.notes?.trim() || undefined,
        status: payload.status ?? 'active',
      },
    });
    await syncToolDepositLedger(deposit.employeeId, deposit.payrollFormulaCode ?? deposit.amountFormulaCode);
    const mapped = mapToolDeposit(deposit);
    await recordAuditEvent({
      request: req,
      module: 'ToolDeposit',
      action: 'tool_deposit.created',
      entityType: 'tool_deposit',
      entityId: deposit.id,
      entityLabel: deposit.description || deposit.id,
      summary: `Created tool deposit ${deposit.description || deposit.id}.`,
      afterSnapshot: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.patch('/api/employee-portal/equipment/tool-deposits/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = toolDepositUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.toolDeposit.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Tool deposit not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const payload = parsed.data;
    assertFreshRecord(payload.expectedUpdatedAt, existing.updatedAt);
    const deposit = await prisma.toolDeposit.update({
      where: { id: String(req.params.id) },
      data: {
        employeeId: payload.employeeId,
        equipmentItemId: payload.equipmentItemId,
        description: payload.description?.trim(),
        amountFormulaCode: payload.amountFormulaCode?.trim(),
        initialAmount: payload.initialAmount,
        balance: payload.balance,
        refundable: payload.refundable,
        payrollFormulaCode: payload.payrollFormulaCode?.trim(),
        notes: payload.notes?.trim(),
        status: payload.status,
      },
    });
    await syncToolDepositLedger(deposit.employeeId, deposit.payrollFormulaCode ?? deposit.amountFormulaCode);
    const mapped = mapToolDeposit(deposit);
    await recordAuditEvent({
      request: req,
      module: 'ToolDeposit',
      action: 'tool_deposit.updated',
      entityType: 'tool_deposit',
      entityId: deposit.id,
      entityLabel: deposit.description || deposit.id,
      summary: `Updated tool deposit ${deposit.description || deposit.id}.`,
      beforeSnapshot: mapToolDeposit(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.post('/api/employee-portal/equipment/tool-deposits/:id/refund', requireAuth, async (req, res, next) => {
  try {
    const parsed = toolDepositResolutionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.toolDeposit.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Tool deposit not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const deposit = await prisma.toolDeposit.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'refunded',
        balance: 0,
        resolvedAt: new Date(),
        resolutionNotes: parsed.data.notes?.trim() || 'Marked refunded.',
      },
    });
    await syncToolDepositLedger(deposit.employeeId, deposit.payrollFormulaCode ?? deposit.amountFormulaCode);
    const mapped = mapToolDeposit(deposit);
    await recordAuditEvent({
      request: req,
      module: 'ToolDeposit',
      action: 'tool_deposit.refund_marked',
      entityType: 'tool_deposit',
      entityId: deposit.id,
      entityLabel: deposit.description || deposit.id,
      summary: `Marked tool deposit ${deposit.description || deposit.id} as refunded.`,
      beforeSnapshot: mapToolDeposit(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.post('/api/employee-portal/equipment/tool-deposits/:id/forfeit', requireAuth, async (req, res, next) => {
  try {
    const parsed = toolDepositResolutionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.toolDeposit.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Tool deposit not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const deposit = await prisma.toolDeposit.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'forfeited',
        balance: 0,
        resolvedAt: new Date(),
        resolutionNotes: parsed.data.notes?.trim() || 'Marked forfeited.',
      },
    });
    await syncToolDepositLedger(deposit.employeeId, deposit.payrollFormulaCode ?? deposit.amountFormulaCode);
    const mapped = mapToolDeposit(deposit);
    await recordAuditEvent({
      request: req,
      module: 'ToolDeposit',
      action: 'tool_deposit.forfeit_marked',
      entityType: 'tool_deposit',
      entityId: deposit.id,
      entityLabel: deposit.description || deposit.id,
      summary: `Marked tool deposit ${deposit.description || deposit.id} as forfeited.`,
      beforeSnapshot: mapToolDeposit(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

// Equipment item routes
equipmentRouter.get('/api/employee-portal/equipment/items', requireAuth, async (_req, res, next) => {
  try {
    const items = await prisma.equipmentItem.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: items.map(mapEquipmentItem) });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.get('/api/employee-portal/equipment/items/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await prisma.equipmentItem.findUnique({ where: { id: String(req.params.id) } });
    if (!item) {
      return next(Object.assign(new Error('Equipment item not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: mapEquipmentItem(item) });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.post('/api/employee-portal/equipment/items', requireAuth, async (req, res, next) => {
  try {
    const parsed = equipmentItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const item = await prisma.equipmentItem.create({
      data: {
        ...parsed.data,
        serialNumber: parsed.data.serialNumber?.trim() || undefined,
        brand: parsed.data.brand?.trim() || undefined,
        model: parsed.data.model?.trim() || undefined,
        location: parsed.data.location?.trim() || undefined,
        photoReference: parsed.data.photoReference?.trim() || undefined,
        serialNumberPhotoReference: parsed.data.serialNumberPhotoReference?.trim() || undefined,
        damagePhotoReference: parsed.data.damagePhotoReference?.trim() || undefined,
      },
    });
    const mapped = mapEquipmentItem(item);
    await Promise.all([
      syncAttachmentReference({
        request: req,
        module: 'Equipment',
        entityType: 'equipment_item',
        entityId: item.id,
        referenceKey: 'equipment-photo',
        referenceUrl: item.photoReference,
        description: `Primary equipment photo for ${item.name}.`,
      }),
      syncAttachmentReference({
        request: req,
        module: 'Equipment',
        entityType: 'equipment_item',
        entityId: item.id,
        referenceKey: 'serial-number-photo',
        referenceUrl: item.serialNumberPhotoReference,
        description: `Serial number photo for ${item.name}.`,
      }),
      syncAttachmentReference({
        request: req,
        module: 'Equipment',
        entityType: 'equipment_item',
        entityId: item.id,
        referenceKey: 'damage-photo',
        referenceUrl: item.damagePhotoReference,
        description: `Damage photo for ${item.name}.`,
      }),
    ]);
    await recordAuditEvent({
      request: req,
      module: 'Equipment',
      action: 'equipment.created',
      entityType: 'equipment_item',
      entityId: item.id,
      entityLabel: item.name,
      summary: `Created equipment item ${item.name}.`,
      afterSnapshot: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.patch('/api/employee-portal/equipment/items/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = equipmentItemUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.equipmentItem.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Equipment item not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const { expectedUpdatedAt, ...payload } = parsed.data;
    assertFreshRecord(expectedUpdatedAt, existing.updatedAt);
    const item = await prisma.equipmentItem.update({
      where: { id: String(req.params.id) },
      data: {
        ...payload,
        serialNumber: payload.serialNumber?.trim(),
        brand: payload.brand?.trim(),
        model: payload.model?.trim(),
        location: payload.location?.trim(),
        photoReference: payload.photoReference?.trim(),
        serialNumberPhotoReference: payload.serialNumberPhotoReference?.trim(),
        damagePhotoReference: payload.damagePhotoReference?.trim(),
      },
    });
    const mapped = mapEquipmentItem(item);
    await Promise.all([
      syncAttachmentReference({
        request: req,
        module: 'Equipment',
        entityType: 'equipment_item',
        entityId: item.id,
        referenceKey: 'equipment-photo',
        referenceUrl: item.photoReference,
        description: `Primary equipment photo for ${item.name}.`,
      }),
      syncAttachmentReference({
        request: req,
        module: 'Equipment',
        entityType: 'equipment_item',
        entityId: item.id,
        referenceKey: 'serial-number-photo',
        referenceUrl: item.serialNumberPhotoReference,
        description: `Serial number photo for ${item.name}.`,
      }),
      syncAttachmentReference({
        request: req,
        module: 'Equipment',
        entityType: 'equipment_item',
        entityId: item.id,
        referenceKey: 'damage-photo',
        referenceUrl: item.damagePhotoReference,
        description: `Damage photo for ${item.name}.`,
      }),
    ]);
    await recordAuditEvent({
      request: req,
      module: 'Equipment',
      action: 'equipment.updated',
      entityType: 'equipment_item',
      entityId: item.id,
      entityLabel: item.name,
      summary: `Updated equipment item ${item.name}.`,
      beforeSnapshot: mapEquipmentItem(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

// Assignment routes
equipmentRouter.get('/api/employee-portal/equipment/assignments', requireAuth, async (_req, res, next) => {
  try {
    const assignments = await prisma.equipmentAssignment.findMany({ orderBy: { assignedOn: 'desc' } });
    res.json({ success: true, data: assignments.map(mapAssignment) });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.get('/api/employee-portal/equipment/assignments/:id', requireAuth, async (req, res, next) => {
  try {
    const assignment = await prisma.equipmentAssignment.findUnique({ where: { id: String(req.params.id) } });
    if (!assignment) {
      return next(Object.assign(new Error('Equipment assignment not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: mapAssignment(assignment) });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.post('/api/employee-portal/equipment/assignments', requireAuth, async (req, res, next) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const payload = parsed.data;
    const assignment = await prisma.equipmentAssignment.create({
      data: {
        employeeId: payload.employeeId,
        equipmentItemId: payload.equipmentItemId,
        toolDepositId: payload.toolDepositId,
        assignedOn: new Date(payload.assignedOn),
        returnedOn: payload.returnedOn ? new Date(payload.returnedOn) : undefined,
        conditionNotes: payload.conditionNotes?.trim() || undefined,
        damageStatus: payload.damageStatus ?? 'none',
        photoProofReference: payload.photoProofReference?.trim() || undefined,
      },
    });
    await prisma.equipmentItem.update({
      where: { id: payload.equipmentItemId },
      data: {
        status: 'assigned',
        assignedEmployeeId: payload.employeeId,
      },
    });
    const mapped = mapAssignment(assignment);
    await syncAttachmentReference({
      request: req,
      module: 'Equipment',
      entityType: 'equipment_assignment',
      entityId: assignment.id,
      referenceKey: 'assignment-proof-photo',
      referenceUrl: assignment.photoProofReference,
      description: `Assignment proof photo for equipment assignment ${assignment.id}.`,
    });
    await recordAuditEvent({
      request: req,
      module: 'Equipment',
      action: 'equipment.assigned',
      entityType: 'equipment_assignment',
      entityId: assignment.id,
      entityLabel: assignment.equipmentItemId,
      summary: `Assigned equipment item ${assignment.equipmentItemId} to employee ${assignment.employeeId}.`,
      afterSnapshot: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.patch('/api/employee-portal/equipment/assignments/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = assignmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.equipmentAssignment.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Equipment assignment not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const payload = parsed.data;
    assertFreshRecord(payload.expectedUpdatedAt, existing.updatedAt);
    const assignment = await prisma.equipmentAssignment.update({
      where: { id: String(req.params.id) },
      data: {
        employeeId: payload.employeeId,
        equipmentItemId: payload.equipmentItemId,
        toolDepositId: payload.toolDepositId,
        assignedOn: payload.assignedOn ? new Date(payload.assignedOn) : undefined,
        returnedOn: payload.returnedOn ? new Date(payload.returnedOn) : undefined,
        conditionNotes: payload.conditionNotes?.trim(),
        damageStatus: payload.damageStatus,
        photoProofReference: payload.photoProofReference?.trim(),
      },
    });
    const equipmentItemId = payload.equipmentItemId ?? existing.equipmentItemId;
    if (payload.returnedOn) {
      await prisma.equipmentItem.update({
        where: { id: equipmentItemId },
        data: {
          status: payload.damageStatus === 'lost' ? 'retired' : 'available',
          assignedEmployeeId: null,
          damagePhotoReference: payload.damageStatus && payload.damageStatus !== 'none'
            ? payload.photoProofReference?.trim() || undefined
            : undefined,
        },
      });
    } else if (payload.employeeId || payload.equipmentItemId) {
      await prisma.equipmentItem.update({
        where: { id: equipmentItemId },
        data: {
          status: 'assigned',
          assignedEmployeeId: payload.employeeId ?? existing.employeeId,
        },
      });
    }
    const mapped = mapAssignment(assignment);
    await syncAttachmentReference({
      request: req,
      module: 'Equipment',
      entityType: 'equipment_assignment',
      entityId: assignment.id,
      referenceKey: 'assignment-proof-photo',
      referenceUrl: assignment.photoProofReference,
      description: `Assignment proof photo for equipment assignment ${assignment.id}.`,
    });
    if (payload.returnedOn) {
      await recordAuditEvent({
        request: req,
        module: 'Equipment',
        action: 'equipment.returned',
        entityType: 'equipment_assignment',
        entityId: assignment.id,
        entityLabel: equipmentItemId,
        summary: `Returned equipment item ${equipmentItemId}.`,
        beforeSnapshot: mapAssignment(existing),
        afterSnapshot: mapped,
      });
      if (payload.damageStatus && payload.damageStatus !== 'none') {
        await recordAuditEvent({
          request: req,
          module: 'Equipment',
          action: 'equipment.damage_reported',
          entityType: 'equipment_assignment',
          entityId: assignment.id,
          entityLabel: equipmentItemId,
          summary: `Reported ${payload.damageStatus} damage for equipment item ${equipmentItemId}.`,
          beforeSnapshot: mapAssignment(existing),
          afterSnapshot: mapped,
        });
      }
    } else {
      await recordAuditEvent({
        request: req,
        module: 'Equipment',
        action: 'equipment.updated',
        entityType: 'equipment_assignment',
        entityId: assignment.id,
        entityLabel: assignment.id,
        summary: `Updated equipment assignment ${assignment.id}.`,
        beforeSnapshot: mapAssignment(existing),
        afterSnapshot: mapped,
      });
    }
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});
