import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { prisma } from '../prisma/client';
import { portalPermissions } from '../types/permissions';

export const trainingRouter = Router();

trainingRouter.use(
  '/api/employee-portal/training',
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.trainingManage),
  auditWrites('Training'),
);

const moduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  level: z.string().optional(),
  targetRole: z.string().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  contentType: z.string().optional(),
  contentReference: z.string().optional(),
  status: z.string().optional(),
  certificationEligible: z.boolean().optional(),
  sopDocumentId: z.string().optional(),
  active: z.boolean().optional(),
});

const moduleUpdateSchema = moduleSchema.partial();

const assignmentSchema = z.object({
  moduleId: z.string().optional(),
  trainingModuleId: z.string().optional(),
  employeeId: z.string().min(1),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  supervisorNotes: z.string().optional(),
});

const assignmentUpdateSchema = z.object({
  status: z.string().optional(),
  completedAt: z.string().optional(),
  score: z.number().optional(),
  supervisorNotes: z.string().optional(),
  certificationIssued: z.boolean().optional(),
});

const mapModule = (module: {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  targetRole: string | null;
  estimatedMinutes: number;
  contentType: string;
  contentReference: string | null;
  status: string;
  certificationEligible: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: module.id,
  title: module.title,
  description: module.description,
  category: module.category,
  level: module.level,
  targetRole: module.targetRole ?? undefined,
  estimatedMinutes: module.estimatedMinutes,
  contentType: module.contentType,
  contentReference: module.contentReference ?? undefined,
  status: module.status,
  certificationEligible: module.certificationEligible,
  createdAt: module.createdAt.toISOString(),
  updatedAt: module.updatedAt.toISOString(),
});

const mapAssignment = (assignment: {
  id: string;
  employeeId: string;
  moduleId: string;
  trainingModuleId: string | null;
  status: string;
  assignedAt: Date;
  dueDate: Date | null;
  completedAt: Date | null;
  score: { toNumber: () => number } | number | null;
  supervisorNotes: string | null;
  certificationIssued: boolean;
}) => ({
  id: assignment.id,
  employeeId: assignment.employeeId,
  trainingModuleId: assignment.trainingModuleId ?? assignment.moduleId,
  status: assignment.status,
  assignedAt: assignment.assignedAt.toISOString(),
  dueDate: assignment.dueDate?.toISOString().slice(0, 10),
  completedAt: assignment.completedAt?.toISOString(),
  score:
    typeof assignment.score === 'number'
      ? assignment.score
      : assignment.score && typeof assignment.score.toNumber === 'function'
        ? assignment.score.toNumber()
        : undefined,
  supervisorNotes: assignment.supervisorNotes ?? undefined,
  certificationIssued: assignment.certificationIssued,
});

trainingRouter.get('/api/employee-portal/training/modules', requireAuth, async (_req, res, next) => {
  try {
    const modules = await prisma.trainingModule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: modules.map(mapModule) });
  } catch (err) {
    next(err);
  }
});

trainingRouter.post('/api/employee-portal/training/modules', requireAuth, async (req, res, next) => {
  try {
    const parsed = moduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const module = await prisma.trainingModule.create({ data: parsed.data });
    res.status(201).json({ success: true, data: mapModule(module) });
  } catch (err) {
    next(err);
  }
});

trainingRouter.patch('/api/employee-portal/training/modules/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = moduleUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const module = await prisma.trainingModule.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    res.json({ success: true, data: mapModule(module) });
  } catch (err) {
    next(err);
  }
});

trainingRouter.get('/api/employee-portal/training/assignments', requireAuth, async (_req, res, next) => {
  try {
    const assignments = await prisma.trainingAssignment.findMany({ orderBy: { assignedAt: 'desc' } });
    res.json({ success: true, data: assignments.map(mapAssignment) });
  } catch (err) {
    next(err);
  }
});

trainingRouter.post('/api/employee-portal/training/assignments', requireAuth, async (req, res, next) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const moduleId = parsed.data.trainingModuleId ?? parsed.data.moduleId;
    if (!moduleId) {
      return next(Object.assign(new Error('Training module id is required'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const assignment = await prisma.trainingAssignment.create({
      data: {
        moduleId,
        trainingModuleId: moduleId,
        employeeId: parsed.data.employeeId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        status: parsed.data.status ?? 'Assigned',
        supervisorNotes: parsed.data.supervisorNotes?.trim() || undefined,
      },
    });
    res.status(201).json({ success: true, data: mapAssignment(assignment) });
  } catch (err) {
    next(err);
  }
});

trainingRouter.patch('/api/employee-portal/training/assignments/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const parsed = assignmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { completedAt, ...rest } = parsed.data;
    const status = rest.status;
    const assignment = await prisma.trainingAssignment.update({
      where: { id: String(req.params.id) },
      data: {
        ...rest,
        supervisorNotes: rest.supervisorNotes?.trim() || undefined,
        completedAt: completedAt ? new Date(completedAt) : status === 'Completed' ? new Date() : undefined,
      },
    });
    res.json({ success: true, data: mapAssignment(assignment) });
  } catch (err) {
    next(err);
  }
});
