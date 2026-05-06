import { prisma } from '../prisma/client';
import type { AuditLogListFilters, RecordAuditEventInput } from '../types/auditTypes';
import { buildAuditPayloadEnvelope, getAuditActorContext, getAuditRequestId, projectExpandedAuditLog } from '../utils/auditUtils';

export const recordAuditEvent = async (input: RecordAuditEventInput) => {
  const actor = getAuditActorContext(input.request);
  const context = {
    actorUserId: actor.actorUserId,
    actorLabel: actor.actorLabel,
    actorRole: actor.actorRole,
    entityType: input.entityType,
    entityLabel: input.entityLabel,
    requestId: getAuditRequestId(input.request),
    metadata: input.metadata,
  };

  const entry = await prisma.auditLogEntry.create({
    data: {
      module: input.module,
      action: input.action,
      actor: actor.actorLabel,
      entityId: input.entityId,
      summary: input.summary,
      beforePayload: buildAuditPayloadEnvelope(input.beforeSnapshot, context) as never,
      afterPayload: buildAuditPayloadEnvelope(input.afterSnapshot, context) as never,
    },
  });

  return projectExpandedAuditLog(entry);
};

export const listExpandedAuditLogs = async (filters: AuditLogListFilters) => {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  const rawEntries = await prisma.auditLogEntry.findMany({
    where: {
      module: filters.module,
      action: filters.action,
      entityId: filters.entityId,
      createdAt: filters.dateFrom || filters.dateTo
        ? {
            gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
          }
        : undefined,
    },
    orderBy: { createdAt: 'desc' },
  });

  const expanded = rawEntries.map(projectExpandedAuditLog).filter((entry) => {
    if (filters.entityType && entry.entityType !== filters.entityType) return false;
    if (filters.actorUserId && entry.actorUserId !== filters.actorUserId) return false;
    return true;
  });

  const total = expanded.length;
  const start = (page - 1) * pageSize;
  const items = expanded.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};
