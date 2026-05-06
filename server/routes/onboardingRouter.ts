import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { prisma } from '../prisma/client';
import { portalPermissions } from '../types/permissions';

export const onboardingRouter = Router();

onboardingRouter.use(
  '/api/employee-portal/onboarding',
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.onboardingManage),
  auditWrites('Onboarding'),
);

const progressStatuses = ['Not Started', 'In Progress', 'Completed', 'Skipped'] as const;

const templateStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  required: z.boolean(),
  estimatedMinutes: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0),
});

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetRole: z.string().min(1),
  targetDepartmentId: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  steps: z.array(templateStepSchema).min(1),
});

const templateUpdateSchema = templateSchema.partial();

const checklistCreateSchema = z.object({
  templateId: z.string().min(1),
  employeeId: z.string().min(1),
});

const progressUpdateSchema = z.object({
  stepId: z.string().min(1),
  status: z.enum(progressStatuses),
  notes: z.string().optional(),
});

const checklistApproveSchema = z.object({
  approvedBy: z.string().min(1).optional(),
});

type StepProgressRecord = {
  stepId: string;
  status: (typeof progressStatuses)[number];
  completedAt?: string;
  notes?: string;
};

const normalizeTemplateStatus = (status?: string | null) => (status === 'inactive' ? 'inactive' : 'active');

const normalizeChecklistStatus = (status?: string | null) =>
  status === 'approved' || status === 'pending-approval' || status === 'in-progress' ? status : 'assigned';

const parseProgress = (value: unknown): StepProgressRecord[] => {
  if (!Array.isArray(value)) return [];
  const result: StepProgressRecord[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.stepId !== 'string') continue;
    const status = progressStatuses.includes(record.status as (typeof progressStatuses)[number])
      ? (record.status as StepProgressRecord['status'])
      : 'Not Started';
    result.push({
      stepId: record.stepId,
      status,
      completedAt: typeof record.completedAt === 'string' ? record.completedAt : undefined,
      notes: typeof record.notes === 'string' ? record.notes : undefined,
    });
  }
  return result;
};

const calculateChecklistStatus = (stepProgress: StepProgressRecord[]) => {
  if (stepProgress.length > 0 && stepProgress.every((step) => step.status === 'Completed' || step.status === 'Skipped')) {
    return 'pending-approval';
  }
  if (stepProgress.some((step) => step.status !== 'Not Started')) {
    return 'in-progress';
  }
  return 'assigned';
};

const mapTemplate = (
  checklist: {
    id: string;
    name: string;
    description: string;
    targetRole: string | null;
    targetDepartmentId: string | null;
    status: string;
  },
  steps: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    required: boolean;
    estimatedMinutes: number;
    sortOrder: number;
    order: number;
  }>,
) => ({
  id: checklist.id,
  name: checklist.name,
  description: checklist.description,
  targetRole: checklist.targetRole ?? 'role_employee',
  targetDepartmentId: checklist.targetDepartmentId ?? undefined,
  status: normalizeTemplateStatus(checklist.status),
  steps: steps
    .map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      category: step.category,
      required: step.required,
      estimatedMinutes: step.estimatedMinutes,
      sortOrder: step.sortOrder || step.order,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder),
});

const mapChecklist = (checklist: {
  id: string;
  employeeId: string | null;
  templateId: string | null;
  status: string;
  assignedAt: Date | null;
  completedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  stepProgress: unknown;
}) => ({
  id: checklist.id,
  employeeId: checklist.employeeId ?? '',
  templateId: checklist.templateId ?? '',
  status: normalizeChecklistStatus(checklist.status),
  assignedAt: (checklist.assignedAt ?? checklist.completedAt ?? checklist.approvedAt ?? new Date()).toISOString(),
  completedAt: checklist.completedAt?.toISOString(),
  approvedBy: checklist.approvedBy ?? undefined,
  approvedAt: checklist.approvedAt?.toISOString(),
  stepProgress: parseProgress(checklist.stepProgress),
});

const getTemplateSteps = async (templateIds: string[]) => {
  const steps = await prisma.onboardingStep.findMany({
    where: { checklistId: { in: templateIds } },
    orderBy: [{ sortOrder: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });

  const stepMap = new Map<string, typeof steps>();
  for (const step of steps) {
    const current = stepMap.get(step.checklistId) ?? [];
    current.push(step);
    stepMap.set(step.checklistId, current);
  }
  return stepMap;
};

onboardingRouter.get('/api/employee-portal/onboarding/templates', requireAuth, async (_req, res, next) => {
  try {
    const templates = await prisma.onboardingChecklist.findMany({
      where: { employeeId: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        targetRole: true,
        targetDepartmentId: true,
        status: true,
      },
    });

    const stepMap = await getTemplateSteps(templates.map((template) => template.id));
    res.json({
      success: true,
      data: templates.map((template) => mapTemplate(template, stepMap.get(template.id) ?? [])),
    });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.post('/api/employee-portal/onboarding/templates', requireAuth, async (req, res, next) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const payload = parsed.data;
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.onboardingChecklist.create({
        data: {
          name: payload.name,
          description: payload.description ?? '',
          targetRole: payload.targetRole,
          targetDepartmentId: payload.targetDepartmentId,
          status: payload.status ?? 'active',
          active: (payload.status ?? 'active') === 'active',
        },
      });

      await tx.onboardingStep.createMany({
        data: payload.steps.map((step, index) => ({
          checklistId: created.id,
          title: step.title,
          description: step.description ?? '',
          category: step.category ?? 'General',
          ownerRole: payload.targetRole,
          required: step.required,
          order: step.sortOrder ?? (index + 1) * 10,
          estimatedMinutes: step.estimatedMinutes ?? 0,
          sortOrder: step.sortOrder ?? (index + 1) * 10,
        })),
      });

      return created;
    });

    const stepMap = await getTemplateSteps([template.id]);
    res.status(201).json({ success: true, data: mapTemplate(template, stepMap.get(template.id) ?? []) });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.patch('/api/employee-portal/onboarding/templates/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = templateUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const templateId = String(req.params.id);
    const payload = parsed.data;

    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.onboardingChecklist.update({
        where: { id: templateId },
        data: {
          name: payload.name,
          description: payload.description,
          targetRole: payload.targetRole,
          targetDepartmentId: payload.targetDepartmentId,
          status: payload.status,
          active: payload.status ? payload.status === 'active' : undefined,
        },
      });

      if (payload.steps) {
        await tx.onboardingStep.deleteMany({ where: { checklistId: templateId } });
        await tx.onboardingStep.createMany({
          data: payload.steps.map((step, index) => ({
            checklistId: templateId,
            title: step.title,
            description: step.description ?? '',
            category: step.category ?? 'General',
            ownerRole: payload.targetRole ?? updated.targetRole ?? 'role_employee',
            required: step.required,
            order: step.sortOrder ?? (index + 1) * 10,
            estimatedMinutes: step.estimatedMinutes ?? 0,
            sortOrder: step.sortOrder ?? (index + 1) * 10,
          })),
        });
      }

      return updated;
    });

    const stepMap = await getTemplateSteps([template.id]);
    res.json({ success: true, data: mapTemplate(template, stepMap.get(template.id) ?? []) });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.get('/api/employee-portal/onboarding/checklists', requireAuth, async (_req, res, next) => {
  try {
    const checklists = await prisma.onboardingChecklist.findMany({
      where: { employeeId: { not: null } },
      orderBy: [{ assignedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        employeeId: true,
        templateId: true,
        status: true,
        assignedAt: true,
        completedAt: true,
        approvedBy: true,
        approvedAt: true,
        stepProgress: true,
      },
    });

    res.json({ success: true, data: checklists.map(mapChecklist) });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.post('/api/employee-portal/onboarding/checklists', requireAuth, async (req, res, next) => {
  try {
    const parsed = checklistCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const template = await prisma.onboardingChecklist.findFirst({
      where: { id: parsed.data.templateId, employeeId: null },
      select: {
        id: true,
        name: true,
        description: true,
        targetRole: true,
        targetDepartmentId: true,
      },
    });

    if (!template) {
      return next(Object.assign(new Error('Template not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const steps = await prisma.onboardingStep.findMany({
      where: { checklistId: template.id },
      orderBy: [{ sortOrder: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });

    const checklist = await prisma.onboardingChecklist.create({
      data: {
        name: template.name,
        description: template.description,
        targetRole: template.targetRole ?? undefined,
        targetDepartmentId: template.targetDepartmentId ?? undefined,
        employeeId: parsed.data.employeeId,
        templateId: template.id,
        status: 'assigned',
        assignedAt: new Date(),
        active: true,
        stepProgress: steps.map((step) => ({ stepId: step.id, status: 'Not Started' })),
      },
    });

    res.status(201).json({ success: true, data: mapChecklist(checklist) });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.patch('/api/employee-portal/onboarding/checklists/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const parsed = progressUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const checklistId = String(req.params.id);
    const checklist = await prisma.onboardingChecklist.findUnique({
      where: { id: checklistId },
      select: {
        id: true,
        employeeId: true,
        templateId: true,
        status: true,
        assignedAt: true,
        completedAt: true,
        approvedBy: true,
        approvedAt: true,
        stepProgress: true,
      },
    });

    if (!checklist) {
      return next(Object.assign(new Error('Checklist not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const currentProgress = parseProgress(checklist.stepProgress);
    const nextProgress = currentProgress.map((step) =>
      step.stepId === parsed.data.stepId
        ? {
            ...step,
            status: parsed.data.status,
            notes: parsed.data.notes?.trim() || undefined,
            completedAt: parsed.data.status === 'Completed' ? new Date().toISOString() : undefined,
          }
        : step,
    );

    const status = calculateChecklistStatus(nextProgress);
    const updated = await prisma.onboardingChecklist.update({
      where: { id: checklistId },
      data: {
        status,
        completedAt: status === 'pending-approval' ? new Date() : null,
        stepProgress: nextProgress,
      },
    });

    res.json({ success: true, data: mapChecklist(updated) });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.patch('/api/employee-portal/onboarding/checklists/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const parsed = checklistApproveSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const actor = ((req as { auth?: { email?: string; role?: string } }).auth?.email ?? parsed.data.approvedBy ?? 'Supervisor placeholder');
    const checklist = await prisma.onboardingChecklist.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'approved',
        completedAt: new Date(),
        approvedBy: actor,
        approvedAt: new Date(),
      },
    });

    res.json({ success: true, data: mapChecklist(checklist) });
  } catch (err) {
    next(err);
  }
});
