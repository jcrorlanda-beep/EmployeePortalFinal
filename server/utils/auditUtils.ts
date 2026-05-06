import type { Request } from 'express';
import type {
  AuditActorContext,
  AuditContextEnvelope,
  AuditPayloadEnvelope,
  ExpandedAuditLogEntry,
} from '../types/auditTypes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getAuditActorContext = (request?: Request): AuditActorContext => ({
  actorUserId: request?.user?.id,
  actorLabel: request?.user?.email ?? 'anonymous',
  actorRole: request?.user?.role,
});

export const getAuditRequestId = (request?: Request) => {
  const headerValue = request?.headers['x-request-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) return headerValue.trim();
  return undefined;
};

export const buildAuditPayloadEnvelope = (
  snapshot: unknown,
  context: AuditContextEnvelope,
): AuditPayloadEnvelope | undefined => {
  const hasSnapshot = snapshot !== undefined;
  const hasContext = Object.values(context).some((value) => value !== undefined);
  if (!hasSnapshot && !hasContext) return undefined;
  return {
    snapshot: hasSnapshot ? snapshot : undefined,
    context: hasContext ? context : undefined,
  };
};

export const parseAuditPayloadEnvelope = (value: unknown): AuditPayloadEnvelope => {
  if (!isRecord(value)) {
    return { snapshot: value };
  }
  const snapshot = Object.prototype.hasOwnProperty.call(value, 'snapshot') ? value.snapshot : value;
  const context = isRecord(value.context) ? (value.context as unknown as AuditContextEnvelope) : undefined;
  return { snapshot, context };
};

const inferEntityType = (module: string) => {
  switch (module) {
    case 'Employee':
      return 'employee';
    case 'Department':
      return 'department';
    case 'Position':
      return 'position';
    case 'Onboarding':
      return 'onboarding';
    case 'Training':
      return 'training';
    case 'SOP':
      return 'sop';
    case 'Timekeeping':
      return 'attendance';
    case 'Timesheet':
      return 'timesheet';
    case 'Scheduling':
      return 'schedule';
    case 'Benefits':
      return 'benefit';
    case 'GovernmentContribution':
      return 'government_contribution';
    case 'ToolDeposit':
      return 'tool_deposit';
    case 'Canteen':
      return 'canteen_transaction';
    case 'Equipment':
      return 'equipment';
    case 'Inventory':
      return 'inventory';
    case 'Discipline':
      return 'discipline';
    case 'PerformanceReview':
      return 'review';
    default:
      return module.toLowerCase();
  }
};

export const projectExpandedAuditLog = (entry: {
  id: string;
  module: string;
  action: string;
  actor: string;
  entityId: string;
  summary: string;
  beforePayload: unknown;
  afterPayload: unknown;
  createdAt: Date;
}): ExpandedAuditLogEntry => {
  const before = parseAuditPayloadEnvelope(entry.beforePayload);
  const after = parseAuditPayloadEnvelope(entry.afterPayload);
  const context = after.context ?? before.context;

  return {
    id: entry.id,
    actorUserId: context?.actorUserId,
    actorName: context?.actorLabel ?? entry.actor,
    actorLabel: context?.actorLabel ?? entry.actor,
    actorRole: context?.actorRole,
    module: entry.module,
    action: entry.action,
    entityType: context?.entityType ?? inferEntityType(entry.module),
    entityId: entry.entityId,
    entityLabel: context?.entityLabel,
    requestId: context?.requestId,
    beforeSnapshot: before.snapshot,
    afterSnapshot: after.snapshot,
    summary: entry.summary,
    metadata: context?.metadata,
    createdAt: entry.createdAt.toISOString(),
  };
};
