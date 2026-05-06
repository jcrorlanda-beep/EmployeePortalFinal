import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { portalPermissions } from '../types/permissions';

export const positionRouter = Router();

positionRouter.use('/api/employee-portal/positions', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.employeesManage), auditWrites('Position'));

const positionSchema = z.object({
  title: z.string().min(1),
  departmentId: z.string().min(1),
  level: z.string().min(1),
});

const positionUpdateSchema = positionSchema.partial();

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
    const position = await prisma.position.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    res.json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});
