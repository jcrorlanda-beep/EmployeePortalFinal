export interface AuditLogEntry { id: string; module: string; action: 'create' | 'update' | 'delete' | 'approve' | 'preview'; actor: string; entityId: string; summary: string; createdAt: string; }
export interface AuditMetadata { actor: string; reason?: string; source: 'employee-portal-mvp'; }
