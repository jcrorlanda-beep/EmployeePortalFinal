import type { AuditLogEntry } from '../types/auditTypes';

export const auditLogEntries: AuditLogEntry[] = [
  { id: 'audit_001', module: 'Employee', action: 'create', actor: 'mvp-admin', entityId: 'emp_001', summary: 'Seeded employee record for MVP preview.', createdAt: '2026-05-06T00:00:00.000Z' },
  { id: 'audit_002', module: 'PayrollFormula', action: 'preview', actor: 'mvp-admin', entityId: 'formula_base_pay', summary: 'Formula preview only; no payroll finalization performed.', createdAt: '2026-05-06T00:05:00.000Z' },
];
export const auditLogService = { async listAuditLogs() { return auditLogEntries; } };
