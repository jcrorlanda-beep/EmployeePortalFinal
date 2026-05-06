export interface AuditLogEntry {
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

export interface AuditLogListResult {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditMetadata {
  actor: string;
  reason?: string;
  source: 'employee-portal-mvp';
}
