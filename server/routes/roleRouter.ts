import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { portalPermissions } from '../types/permissions';

export const roleRouter = Router();

roleRouter.use('/api/employee-portal/roles', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.rolesManage), auditWrites('EmployeeRole'));

const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  permissions: z.array(z.string()),
});

const roleUpdateSchema = roleSchema.partial();

// GET /api/employee-portal/roles
roleRouter.get('/api/employee-portal/roles', requireAuth, async (_req, res, next) => {
  try {
    const roles = await prisma.employeeRole.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/roles
roleRouter.post('/api/employee-portal/roles', requireAuth, async (req, res, next) => {
  try {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const role = await prisma.employeeRole.create({ data: parsed.data });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employee-portal/roles/:id
roleRouter.patch('/api/employee-portal/roles/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = roleUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const role = await prisma.employeeRole.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    res.json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
});
