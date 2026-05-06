import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { portalPermissions } from '../types/permissions';

export const positionRouter = Router();

const staleRecordMessage = 'Record was updated by another user. Please refresh and try again.';
const staleRecordError = () => Object.assign(new Error(staleRecordMessage), { status: 409, code: 'STALE_RECORD' });
const assertFreshRecord = (expectedUpdatedAt: string | undefined, actualUpdatedAt: Date) => {
  if (expectedUpdatedAt && actualUpdatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
    throw staleRecordError();
  }
};

positionRouter.use('/api/employee-portal/positions', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.employeesManage), auditWrites('Position'));

const positionSchema = z.object({
  title: z.string().min(1),
  departmentId: z.string().min(1),
  level: z.string().min(1),
});

const positionUpdateSchema = positionSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

// GET /api/employee-portal/positions
positionRouter.get('/api/employee-portal/positions', requireAuth, async (_req, res, next) => {
  try {
    const positions = await prisma.position.findMany({ orderBy: { title: 'asc' } });
    res.json({ success: true, data: positions });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee-portal/positions/:id
positionRouter.get('/api/employee-portal/positions/:id', requireAuth, async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({ where: { id: String(req.params.id) } });
    if (!position) {
      return next(Object.assign(new Error('Position not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/positions
positionRouter.post('/api/employee-portal/positions', requireAuth, async (req, res, next) => {
  try {
    const parsed = positionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const position = await prisma.position.create({ data: parsed.data });
    res.status(201).json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employee-portal/positions/:id
positionRouter.patch('/api/employee-portal/positions/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = positionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.position.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Position not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const { expectedUpdatedAt, ...data } = parsed.data;
    assertFreshRecord(expectedUpdatedAt, existing.updatedAt);
    const position = await prisma.position.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});
