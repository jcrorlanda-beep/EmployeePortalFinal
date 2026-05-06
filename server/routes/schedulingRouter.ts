import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { prisma } from '../prisma/client';
import {
  getScheduleInstanceDate,
  mapLeaveRequest,
  mapPtoBalance,
  mapScheduleInstance,
  mapScheduleSwap,
  mapScheduleTemplate,
  recordSchedulingAudit,
} from '../services/schedulingPersistenceService';
import { portalPermissions } from '../types/permissions';

export const schedulingRouter = Router();

const staleRecordMessage = 'Record was updated by another user. Please refresh and try again.';
const staleRecordError = () => Object.assign(new Error(staleRecordMessage), { status: 409, code: 'STALE_RECORD' });
const assertFreshRecord = (expectedUpdatedAt: string | undefined, actualUpdatedAt: Date) => {
  if (expectedUpdatedAt && actualUpdatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
    throw staleRecordError();
  }
};

schedulingRouter.use(
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.schedulesManage),
);

const scheduleDaySchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

const templateSchema = z.object({
  name: z.string().min(1),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  timezone: z.string().optional(),
  effectiveStartDate: z.string().optional(),
  effectiveEndDate: z.string().optional(),
  status: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  days: z.array(scheduleDaySchema).min(1),
  restDays: z.array(scheduleDaySchema).optional(),
  notes: z.string().optional(),
});

const templateUpdateSchema = templateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const instanceSchema = z.object({
  employeeId: z.string().min(1),
  scheduleTemplateId: z.string().optional(),
  templateId: z.string().optional(),
  workDate: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  breakMinutes: z.number().int().min(0).optional(),
  isRestDay: z.boolean().optional(),
  isHoliday: z.boolean().optional(),
  isTemporary: z.boolean().optional(),
  sourceType: z.enum(['Regular', 'Temporary', 'PTO', 'Swap', 'Manual']).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const instanceUpdateSchema = instanceSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const leaveSchema = z.object({
  employeeId: z.string().min(1),
  leaveType: z.enum(['Vacation', 'Sick', 'Emergency', 'Unpaid', 'Other']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  isHalfDay: z.boolean().optional(),
  halfDayPortion: z.string().optional(),
  isPaid: z.boolean().optional(),
  reason: z.string().min(1),
  attachmentUrl: z.string().optional(),
  status: z.string().optional(),
});

const leaveUpdateSchema = leaveSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const leaveDecisionSchema = z.object({
  reviewNotes: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
});

const swapSchema = z.object({
  requestingEmployeeId: z.string().min(1),
  targetEmployeeId: z.string().min(1),
  requesterScheduleInstanceId: z.string().optional(),
  targetScheduleInstanceId: z.string().optional(),
  reason: z.string().min(1),
  requesterNotes: z.string().optional(),
  requestedDate: z.string().optional(),
  targetDate: z.string().optional(),
});

const swapDecisionSchema = z.object({
  targetEmployeeNotes: z.string().optional(),
  managerNotes: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
});

const swapCancelSchema = z.object({
  expectedUpdatedAt: z.string().optional(),
});

const actorFromRequest = (request: { user?: { email?: string } }) => request.user?.email ?? 'anonymous';

const toDate = (value?: string) => (value ? new Date(value) : undefined);

schedulingRouter.get('/api/employee-portal/schedules/templates', requireAuth, async (_req, res, next) => {
  try {
    const templates = await prisma.scheduleTemplate.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: templates.map(mapScheduleTemplate) });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/schedules/templates', requireAuth, async (req, res, next) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const payload = parsed.data;
    const template = await prisma.scheduleTemplate.create({
      data: {
        name: payload.name,
        employeeId: payload.employeeId,
        departmentId: payload.departmentId,
        positionId: payload.positionId,
        timezone: payload.timezone,
        effectiveStartDate: toDate(payload.effectiveStartDate),
        effectiveEndDate: toDate(payload.effectiveEndDate),
        status: payload.status ?? 'active',
        startTime: payload.startTime,
        endTime: payload.endTime,
        days: payload.days,
        restDays: payload.restDays ?? [],
        notes: payload.notes?.trim() || undefined,
      },
    });

    const mapped = mapScheduleTemplate(template);
    await recordSchedulingAudit({
      module: 'Scheduling',
      action: 'schedule.template.created',
      actor: actorFromRequest(req),
      entityId: template.id,
      summary: `Created schedule template ${template.name}.`,
      afterPayload: mapped,
    });

    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.patch('/api/employee-portal/schedules/templates/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = templateUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const existing = await prisma.scheduleTemplate.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Schedule template not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const payload = parsed.data;
    const updated = await prisma.scheduleTemplate.update({
      where: { id: String(req.params.id) },
      data: {
        name: payload.name,
        employeeId: payload.employeeId,
        departmentId: payload.departmentId,
        positionId: payload.positionId,
        timezone: payload.timezone,
        effectiveStartDate: payload.effectiveStartDate ? new Date(payload.effectiveStartDate) : undefined,
        effectiveEndDate: payload.effectiveEndDate ? new Date(payload.effectiveEndDate) : undefined,
        status: payload.status,
        startTime: payload.startTime,
        endTime: payload.endTime,
        days: payload.days,
        restDays: payload.restDays,
        notes: payload.notes?.trim() || undefined,
      },
    });

    const mapped = mapScheduleTemplate(updated);
    await recordSchedulingAudit({
      module: 'Scheduling',
      action: 'schedule.template.updated',
      actor: actorFromRequest(req),
      entityId: updated.id,
      summary: `Updated schedule template ${updated.name}.`,
      beforePayload: mapScheduleTemplate(existing),
      afterPayload: mapped,
    });

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.get('/api/employee-portal/schedules/instances', requireAuth, async (_req, res, next) => {
  try {
    const instances = await prisma.scheduleInstance.findMany({ orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }] });
    res.json({ success: true, data: instances.map(mapScheduleInstance) });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/schedules/instances', requireAuth, async (req, res, next) => {
  try {
    const parsed = instanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const payload = parsed.data;
    const templateId = payload.scheduleTemplateId ?? payload.templateId;
    if (!templateId) {
      return next(Object.assign(new Error('Schedule template is required'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const template = await prisma.scheduleTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return next(Object.assign(new Error('Schedule template not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const instance = await prisma.scheduleInstance.create({
      data: {
        employeeId: payload.employeeId,
        templateId,
        scheduleTemplateId: templateId,
        workDate: new Date(payload.workDate),
        startTime: payload.startTime ?? template.startTime,
        endTime: payload.endTime ?? template.endTime,
        breakMinutes: payload.breakMinutes ?? 0,
        isRestDay: payload.isRestDay ?? false,
        isHoliday: payload.isHoliday ?? false,
        isTemporary: payload.isTemporary ?? false,
        sourceType: payload.sourceType ?? 'Regular',
        status: payload.status ?? 'published',
        notes: payload.notes?.trim() || undefined,
      },
    });

    const mapped = mapScheduleInstance(instance);
    await recordSchedulingAudit({
      module: 'Scheduling',
      action: 'schedule.instance.created',
      actor: actorFromRequest(req),
      entityId: instance.id,
      summary: `Created schedule instance for employee ${instance.employeeId}.`,
      afterPayload: mapped,
    });

    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.patch('/api/employee-portal/schedules/instances/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = instanceUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const existing = await prisma.scheduleInstance.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Schedule instance not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const payload = parsed.data;
    const templateId = payload.scheduleTemplateId ?? payload.templateId;
    const updated = await prisma.scheduleInstance.update({
      where: { id: String(req.params.id) },
      data: {
        employeeId: payload.employeeId,
        templateId,
        scheduleTemplateId: templateId,
        workDate: payload.workDate ? new Date(payload.workDate) : undefined,
        startTime: payload.startTime,
        endTime: payload.endTime,
        breakMinutes: payload.breakMinutes,
        isRestDay: payload.isRestDay,
        isHoliday: payload.isHoliday,
        isTemporary: payload.isTemporary,
        sourceType: payload.sourceType,
        status: payload.status,
        notes: payload.notes?.trim() || undefined,
      },
    });

    const mapped = mapScheduleInstance(updated);
    await recordSchedulingAudit({
      module: 'Scheduling',
      action: 'schedule.instance.updated',
      actor: actorFromRequest(req),
      entityId: updated.id,
      summary: `Updated schedule instance ${updated.id}.`,
      beforePayload: mapScheduleInstance(existing),
      afterPayload: mapped,
    });

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.get('/api/employee-portal/leave-requests', requireAuth, async (_req, res, next) => {
  try {
    const requests = await prisma.ptoRequest.findMany({ orderBy: { requestedAt: 'desc' } });
    res.json({ success: true, data: requests.map(mapLeaveRequest) });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/leave-requests', requireAuth, async (req, res, next) => {
  try {
    const parsed = leaveSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const payload = parsed.data;
    const request = await prisma.ptoRequest.create({
      data: {
        employeeId: payload.employeeId,
        leaveType: payload.leaveType,
        type: payload.leaveType,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
        startsOn: new Date(payload.startDate),
        endsOn: new Date(payload.endDate),
        isHalfDay: payload.isHalfDay ?? false,
        halfDay: payload.isHalfDay ?? false,
        halfDayPortion: payload.halfDayPortion,
        isPaid: payload.isPaid ?? payload.leaveType !== 'Unpaid',
        reason: payload.reason,
        attachmentUrl: payload.attachmentUrl,
        status: payload.status ?? 'pending',
        requestedAt: new Date(),
      },
    });

    const mapped = mapLeaveRequest(request);
    await recordSchedulingAudit({
      module: 'Leave',
      action: 'leave.requested',
      actor: actorFromRequest(req),
      entityId: request.id,
      summary: `Created leave request for employee ${request.employeeId}.`,
      afterPayload: mapped,
    });

    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.patch('/api/employee-portal/leave-requests/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = leaveUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const existing = await prisma.ptoRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Leave request not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const payload = parsed.data;
    assertFreshRecord(payload.expectedUpdatedAt, existing.updatedAt);
    const updated = await prisma.ptoRequest.update({
      where: { id: String(req.params.id) },
      data: {
        employeeId: payload.employeeId,
        leaveType: payload.leaveType,
        type: payload.leaveType,
        startDate: payload.startDate ? new Date(payload.startDate) : undefined,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
        startsOn: payload.startDate ? new Date(payload.startDate) : undefined,
        endsOn: payload.endDate ? new Date(payload.endDate) : undefined,
        isHalfDay: payload.isHalfDay,
        halfDay: payload.isHalfDay,
        halfDayPortion: payload.halfDayPortion,
        isPaid: payload.isPaid,
        reason: payload.reason,
        attachmentUrl: payload.attachmentUrl,
        status: payload.status,
      },
    });

    res.json({ success: true, data: mapLeaveRequest(updated) });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/leave-requests/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const parsed = leaveDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const existing = await prisma.ptoRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Leave request not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const actor = actorFromRequest(req);
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const updated = await prisma.ptoRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'approved',
        reviewedBy: actor,
        reviewedAt: new Date(),
        reviewNotes: parsed.data.reviewNotes?.trim() || undefined,
        approvedBy: actor,
        approvedAt: new Date(),
      },
    });

    const mapped = mapLeaveRequest(updated);
    await recordSchedulingAudit({
      module: 'Leave',
      action: 'leave.approved',
      actor,
      entityId: updated.id,
      summary: `Approved leave request ${updated.id}.`,
      beforePayload: mapLeaveRequest(existing),
      afterPayload: mapped,
    });

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/leave-requests/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const parsed = leaveDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const existing = await prisma.ptoRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Leave request not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const actor = actorFromRequest(req);
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const updated = await prisma.ptoRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'rejected',
        reviewedBy: actor,
        reviewedAt: new Date(),
        reviewNotes: parsed.data.reviewNotes?.trim() || undefined,
      },
    });

    const mapped = mapLeaveRequest(updated);
    await recordSchedulingAudit({
      module: 'Leave',
      action: 'leave.rejected',
      actor,
      entityId: updated.id,
      summary: `Rejected leave request ${updated.id}.`,
      beforePayload: mapLeaveRequest(existing),
      afterPayload: mapped,
    });

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.get('/api/employee-portal/pto-balances', requireAuth, async (_req, res, next) => {
  try {
    const balances = await prisma.ptoBalance.findMany({ orderBy: [{ year: 'desc' }, { leaveType: 'asc' }] });
    res.json({ success: true, data: balances.map(mapPtoBalance) });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.get('/api/employee-portal/schedule-swaps', requireAuth, async (_req, res, next) => {
  try {
    const swaps = await prisma.scheduleSwapRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: swaps.map(mapScheduleSwap) });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/schedule-swaps', requireAuth, async (req, res, next) => {
  try {
    const parsed = swapSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const payload = parsed.data;
    const requesterInstanceId = payload.requesterScheduleInstanceId;
    if (!requesterInstanceId) {
      return next(Object.assign(new Error('Requester schedule instance is required'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const requesterInstance = await getScheduleInstanceDate(requesterInstanceId);
    if (!requesterInstance) {
      return next(Object.assign(new Error('Requester schedule instance not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const targetInstance = payload.targetScheduleInstanceId ? await getScheduleInstanceDate(payload.targetScheduleInstanceId) : null;
    const swap = await prisma.scheduleSwapRequest.create({
      data: {
        requesterEmployeeId: payload.requestingEmployeeId,
        requestingEmployeeId: payload.requestingEmployeeId,
        targetEmployeeId: payload.targetEmployeeId,
        scheduleInstanceId: requesterInstanceId,
        requesterScheduleInstanceId: requesterInstanceId,
        targetScheduleInstanceId: payload.targetScheduleInstanceId,
        requestedDate: payload.requestedDate ? new Date(payload.requestedDate) : requesterInstance.workDate,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : targetInstance?.workDate ?? requesterInstance.workDate,
        reason: payload.reason,
        requesterNotes: payload.requesterNotes?.trim() || undefined,
        requesterNote: payload.requesterNotes?.trim() || undefined,
        status: 'pending',
        temporaryOnly: true,
      },
    });

    const mapped = mapScheduleSwap(swap);
    await recordSchedulingAudit({
      module: 'ScheduleSwap',
      action: 'schedule_swap.requested',
      actor: actorFromRequest(req),
      entityId: swap.id,
      summary: `Requested temporary schedule swap ${swap.id}.`,
      afterPayload: mapped,
    });

    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/schedule-swaps/:id/accept', requireAuth, async (req, res, next) => {
  try {
    const parsed = swapDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.scheduleSwapRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Schedule swap not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const updated = await prisma.scheduleSwapRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'accepted',
        targetEmployeeNotes: parsed.data.targetEmployeeNotes?.trim() || undefined,
        targetNote: parsed.data.targetEmployeeNotes?.trim() || undefined,
        targetEmployeeAcceptedAt: new Date(),
      },
    });
    const mapped = mapScheduleSwap(updated);
    await recordSchedulingAudit({
      module: 'ScheduleSwap',
      action: 'schedule_swap.accepted',
      actor: actorFromRequest(req),
      entityId: updated.id,
      summary: `Accepted schedule swap ${updated.id}.`,
      beforePayload: mapScheduleSwap(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/schedule-swaps/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const parsed = swapDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.scheduleSwapRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Schedule swap not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const actor = actorFromRequest(req);
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const updated = await prisma.scheduleSwapRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'approved',
        managerNotes: parsed.data.managerNotes?.trim() || undefined,
        managerNote: parsed.data.managerNotes?.trim() || undefined,
        managerApprovedBy: actor,
        managerApprovedAt: new Date(),
        temporaryOnly: true,
      },
    });
    const mapped = mapScheduleSwap(updated);
    await recordSchedulingAudit({
      module: 'ScheduleSwap',
      action: 'schedule_swap.approved',
      actor,
      entityId: updated.id,
      summary: `Approved schedule swap ${updated.id} as temporary only.`,
      beforePayload: mapScheduleSwap(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/schedule-swaps/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const parsed = swapDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.scheduleSwapRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Schedule swap not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const updated = await prisma.scheduleSwapRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'rejected',
        managerNotes: parsed.data.managerNotes?.trim() || parsed.data.targetEmployeeNotes?.trim() || undefined,
        managerNote: parsed.data.managerNotes?.trim() || parsed.data.targetEmployeeNotes?.trim() || undefined,
      },
    });
    const mapped = mapScheduleSwap(updated);
    await recordSchedulingAudit({
      module: 'ScheduleSwap',
      action: 'schedule_swap.rejected',
      actor: actorFromRequest(req),
      entityId: updated.id,
      summary: `Rejected schedule swap ${updated.id}.`,
      beforePayload: mapScheduleSwap(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

schedulingRouter.post('/api/employee-portal/schedule-swaps/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const parsed = swapCancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.scheduleSwapRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Schedule swap not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const updated = await prisma.scheduleSwapRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'cancelled',
      },
    });
    const mapped = mapScheduleSwap(updated);
    await recordSchedulingAudit({
      module: 'ScheduleSwap',
      action: 'schedule_swap.cancelled',
      actor: actorFromRequest(req),
      entityId: updated.id,
      summary: `Cancelled schedule swap ${updated.id}.`,
      beforePayload: mapScheduleSwap(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});
