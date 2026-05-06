import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { portalPermissions } from '../types/permissions';

export const employeeRouter = Router();

employeeRouter.use('/api/employee-portal/employees', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.employeesManage), auditWrites('Employee'));

const employeeSchema = z.object({
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  status: z.string().min(1),
  hireDate: z.string().min(1),
  departmentId: z.string().min(1),
  positionId: z.string().min(1),
  email: z.string().email().optional(),
  emergencyContact: z.string().optional(),
});

const employeeUpdateSchema = employeeSchema.partial();

// GET /api/employee-portal/employees
employeeRouter.get('/api/employee-portal/employees', requireAuth, async (_req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: employees });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee-portal/employees/:id
employeeRouter.get('/api/employee-portal/employees/:id', requireAuth, async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: String(req.params.id) } });
    if (!employee) {
      return next(Object.assign(new Error('Employee not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/employees
employeeRouter.post('/api/employee-portal/employees', requireAuth, async (req, res, next) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { hireDate, ...rest } = parsed.data;
    const employee = await prisma.employee.create({
      data: { ...rest, hireDate: new Date(hireDate) },
    });
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employee-portal/employees/:id
employeeRouter.patch('/api/employee-portal/employees/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = employeeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { hireDate, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (hireDate) data.hireDate = new Date(hireDate);

    const employee = await prisma.employee.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});
