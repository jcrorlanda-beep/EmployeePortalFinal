import { prisma } from '../prisma/client';
import { writeAuditLog } from './auditService';

const toDayArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
};

const toIsoDate = (value: Date | null | undefined) => value?.toISOString().slice(0, 10);
const toIsoDateTime = (value: Date | null | undefined) => value?.toISOString();

const toNumber = (value: number | { toNumber: () => number }) =>
  typeof value === 'number' ? value : value.toNumber();

export const mapScheduleTemplate = (template: {
  id: string;
  name: string;
  employeeId: string | null;
  departmentId: string | null;
  positionId: string | null;
  timezone: string | null;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
  status: string;
  startTime: string;
  endTime: string;
  days: unknown;
  restDays: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: template.id,
  name: template.name,
  employeeId: template.employeeId ?? undefined,
  departmentId: template.departmentId ?? undefined,
  positionId: template.positionId ?? undefined,
  timezone: template.timezone ?? undefined,
  effectiveStartDate: toIsoDate(template.effectiveStartDate),
  effectiveEndDate: toIsoDate(template.effectiveEndDate),
  status: template.status,
  startTime: template.startTime,
  endTime: template.endTime,
  days: toDayArray(template.days),
  restDays: toDayArray(template.restDays),
  notes: template.notes ?? undefined,
  createdAt: template.createdAt.toISOString(),
  updatedAt: template.updatedAt.toISOString(),
});

export const mapScheduleInstance = (instance: {
  id: string;
  employeeId: string;
  templateId: string;
  scheduleTemplateId: string | null;
  workDate: Date;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
  isRestDay: boolean;
  isHoliday: boolean;
  isTemporary: boolean;
  sourceType: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: instance.id,
  employeeId: instance.employeeId,
  templateId: instance.scheduleTemplateId ?? instance.templateId,
  scheduleTemplateId: instance.scheduleTemplateId ?? undefined,
  workDate: toIsoDate(instance.workDate) ?? '',
  startTime: instance.startTime ?? undefined,
  endTime: instance.endTime ?? undefined,
  breakMinutes: instance.breakMinutes,
  isRestDay: instance.isRestDay,
  isHoliday: instance.isHoliday,
  isTemporary: instance.isTemporary,
  sourceType: instance.sourceType,
  status: instance.status,
  notes: instance.notes ?? undefined,
  createdAt: instance.createdAt.toISOString(),
  updatedAt: instance.updatedAt.toISOString(),
});

export const mapLeaveRequest = (request: {
  id: string;
  employeeId: string;
  leaveType: string | null;
  type: string | null;
  startDate: Date | null;
  endDate: Date | null;
  startsOn: Date;
  endsOn: Date;
  isHalfDay: boolean;
  halfDay: boolean | null;
  halfDayPortion: string | null;
  isPaid: boolean;
  reason: string;
  attachmentUrl: string | null;
  status: string;
  requestedAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: request.id,
  employeeId: request.employeeId,
  type: (request.leaveType ?? request.type ?? 'Other') as string,
  leaveType: (request.leaveType ?? request.type ?? 'Other') as string,
  startsOn: toIsoDate(request.startsOn) ?? '',
  startDate: toIsoDate(request.startDate ?? request.startsOn) ?? '',
  endsOn: toIsoDate(request.endsOn) ?? '',
  endDate: toIsoDate(request.endDate ?? request.endsOn) ?? '',
  halfDay: request.halfDay ?? request.isHalfDay,
  isHalfDay: request.isHalfDay,
  halfDayPortion: request.halfDayPortion ?? undefined,
  isPaid: request.isPaid,
  reason: request.reason,
  attachmentUrl: request.attachmentUrl ?? undefined,
  status: request.status,
  requestedAt: request.requestedAt.toISOString(),
  reviewedBy: request.reviewedBy ?? undefined,
  reviewedAt: toIsoDateTime(request.reviewedAt),
  reviewNotes: request.reviewNotes ?? undefined,
  approvedBy: request.approvedBy ?? undefined,
  approvedAt: toIsoDateTime(request.approvedAt),
  createdAt: request.createdAt.toISOString(),
  updatedAt: request.updatedAt.toISOString(),
});

export const mapPtoBalance = (balance: {
  id: string;
  employeeId: string;
  leaveType: string;
  earned: number | { toNumber: () => number };
  used: number | { toNumber: () => number };
  remaining: number | { toNumber: () => number };
  year: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: balance.id,
  employeeId: balance.employeeId,
  leaveType: balance.leaveType,
  earned: toNumber(balance.earned),
  used: toNumber(balance.used),
  remaining: toNumber(balance.remaining),
  year: balance.year,
  notes: balance.notes ?? undefined,
  createdAt: balance.createdAt.toISOString(),
  updatedAt: balance.updatedAt.toISOString(),
});

export const mapScheduleSwap = (swap: {
  id: string;
  requesterEmployeeId: string;
  requestingEmployeeId: string | null;
  targetEmployeeId: string;
  scheduleInstanceId: string;
  requesterScheduleInstanceId: string | null;
  targetScheduleInstanceId: string | null;
  requestedDate: Date | null;
  targetDate: Date | null;
  reason: string | null;
  requesterNotes: string | null;
  requesterNote: string | null;
  targetEmployeeNotes: string | null;
  targetNote: string | null;
  managerNotes: string | null;
  managerNote: string | null;
  targetEmployeeAcceptedAt: Date | null;
  managerApprovedBy: string | null;
  managerApprovedAt: Date | null;
  status: string;
  temporaryOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: swap.id,
  requesterEmployeeId: swap.requestingEmployeeId ?? swap.requesterEmployeeId,
  requestingEmployeeId: swap.requestingEmployeeId ?? undefined,
  targetEmployeeId: swap.targetEmployeeId,
  scheduleInstanceId: swap.requesterScheduleInstanceId ?? swap.scheduleInstanceId,
  requesterScheduleInstanceId: swap.requesterScheduleInstanceId ?? undefined,
  targetScheduleInstanceId: swap.targetScheduleInstanceId ?? undefined,
  requestedDate: toIsoDate(swap.requestedDate),
  targetDate: toIsoDate(swap.targetDate),
  reason: swap.reason ?? undefined,
  requesterNote: swap.requesterNote ?? swap.requesterNotes ?? undefined,
  requesterNotes: swap.requesterNotes ?? undefined,
  targetNote: swap.targetNote ?? swap.targetEmployeeNotes ?? undefined,
  targetEmployeeNotes: swap.targetEmployeeNotes ?? undefined,
  managerNote: swap.managerNote ?? swap.managerNotes ?? undefined,
  managerNotes: swap.managerNotes ?? undefined,
  targetEmployeeAcceptedAt: toIsoDateTime(swap.targetEmployeeAcceptedAt),
  managerApprovedBy: swap.managerApprovedBy ?? undefined,
  managerApprovedAt: toIsoDateTime(swap.managerApprovedAt),
  status: swap.status,
  temporaryOnly: swap.temporaryOnly,
  createdAt: swap.createdAt.toISOString(),
  updatedAt: swap.updatedAt.toISOString(),
});

export const recordSchedulingAudit = async (input: {
  module: string;
  action: string;
  actor: string;
  entityId: string;
  summary: string;
  beforePayload?: unknown;
  afterPayload?: unknown;
}) =>
  writeAuditLog({
    module: input.module,
    action: input.action,
    actor: input.actor,
    entityId: input.entityId,
    summary: input.summary,
    beforePayload: input.beforePayload,
    afterPayload: input.afterPayload,
  });

export const getScheduleInstanceDate = async (id: string) => {
  const instance = await prisma.scheduleInstance.findUnique({
    where: { id },
    select: { id: true, workDate: true },
  });
  return instance;
};
