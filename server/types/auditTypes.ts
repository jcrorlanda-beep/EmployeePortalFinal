import type { Request } from 'express';

export interface AuditActorContext {
  actorUserId?: string;
  actorLabel: string;
  actorRole?: string;
}

export interface AuditContextEnvelope {
  actorUserId?: string;
  actorLabel: string;
  actorRole?: string;
  entityType?: string;
  entityLabel?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditPayloadEnvelope {
  snapshot?: unknown;
  context?: AuditContextEnvelope;
}

export interface RecordAuditEventInput {
  request?: Request;
  module: string;
  action: string;
  entityType?: string;
  entityId: string;
  entityLabel?: string;
  summary: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AuditLogListFilters {
  module?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ExpandedAuditLogEntry {
  id: string;
  actorUserId?: string;
  actorName?: string;
  actorLabel: string;
  actorRole?: string;
  module: string;
  action: string;
  entityType?: string;
  entityId: string;
  entityLabel?: string;
  requestId?: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
