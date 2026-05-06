import { prisma } from '../prisma/client';

interface AuditWriteInput {
  module: string;
  action: string;
  actor: string;
  entityId: string;
  summary: string;
  beforePayload?: unknown;
  afterPayload?: unknown;
}

export const writeAuditLog = async (input: AuditWriteInput) =>
  prisma.auditLogEntry.create({
    data: {
      module: input.module,
      action: input.action,
      actor: input.actor,
      entityId: input.entityId,
      summary: input.summary,
      beforePayload: input.beforePayload as never,
      afterPayload: input.afterPayload as never,
    },
  });
