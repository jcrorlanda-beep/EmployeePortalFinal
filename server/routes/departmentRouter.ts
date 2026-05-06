import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { portalPermissions } from '../types/permissions';

export const departmentRouter = Router();

const staleRecordMessage = 'Record was updated by another user. Please refresh and try again.';
const staleRecordError = () => Object.assign(new Error(staleRecordMessage), { status: 409, code: 'STALE_RECORD' });
const assertFreshRecord = (expectedUpdatedAt: string | undefined, actualUpdatedAt: Date) => {
  if (expectedUpdatedAt && actualUpdatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
    throw staleRecordError();
  }
};

departmentRouter.use('/api/employee-portal/departments', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.employeesManage), auditWrites('Department'));

const departmentSchema = z.object({
  name: z.string().min(1),
  managerName: z.string().optional(),
  notes: z.string().optional(),
});

const departmentUpdateSchema = departmentSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const departmentDeactivateSchema = z.object({
  expectedUpdatedAt: z.string().optional(),
}).optional();

// GET /api/employee-portal/departments
departmentRouter.get('/api/employee-portal/departments', requireAuth, async (_req, res, next) => {
  try {
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee-portal/departments/:id
departmentRouter.get('/api/employee-portal/departments/:id', requireAuth, async (req, res, next) => {
  try {
    const department = await prisma.department.findUnique({ where: { id: String(req.params.id) } });
    if (!department) {
      return next(Object.assign(new Error('Department not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/departments
departmentRouter.post('/api/employee-portal/departments', requireAuth, async (req, res, next) => {
  try {
    const parsed = departmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const department = await prisma.department.create({ data: parsed.data });
    res.status(201).json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employee-portal/departments/:id
departmentRouter.patch('/api/employee-portal/departments/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = departmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.department.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Department not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const { expectedUpdatedAt, ...data } = parsed.data;
    assertFreshRecord(expectedUpdatedAt, existing.updatedAt);
    const department = await prisma.department.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employee-portal/departments/:id (soft delete: set active=false)
departmentRouter.delete('/api/employee-portal/departments/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = departmentDeactivateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.department.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Department not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    assertFreshRecord(parsed.data?.expectedUpdatedAt, existing.updatedAt);
    const department = await prisma.department.update({
      where: { id: String(req.params.id) },
      data: { active: false },
    });
    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
});
