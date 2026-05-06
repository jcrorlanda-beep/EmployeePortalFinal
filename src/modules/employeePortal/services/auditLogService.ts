import type { AuditLogEntry, AuditMetadata } from '../types/auditTypes';
import { createId, mockDelay } from './employeePortalApi';

export type EmployeePortalAuditEvent =
  | 'employee.created'
  | 'employee.updated'
  | 'department.created'
  | 'department.updated'
  | 'position.created'
  | 'position.updated';

export const auditLogEntries: AuditLogEntry[] = [
  { id: 'audit_001', module: 'Employee', action: 'create', actor: 'mvp-admin', entityId: 'emp_001', summary: 'Seeded employee record for MVP preview.', createdAt: '2026-05-06T00:00:00.000Z' },
  { id: 'audit_002', module: 'PayrollFormula', action: 'preview', actor: 'mvp-admin', entityId: 'formula_base_pay', summary: 'Formula preview only; no payroll finalization performed.', createdAt: '2026-05-06T00:05:00.000Z' },
];

const moduleLabelByEvent: Record<EmployeePortalAuditEvent, string> = {
  'employee.created': 'Employee',
  'employee.updated': 'Employee',
  'department.created': 'Department',
  'department.updated': 'Department',
  'position.created': 'Position',
  'position.updated': 'Position',
};

export const auditLogService = {
  async listAuditLogs() {
    await mockDelay();
    return [...auditLogEntries];
  },

  async recordEvent(event: EmployeePortalAuditEvent, entityId: string, metadata: AuditMetadata, summary: string) {
    await mockDelay();
    const entry: AuditLogEntry = {
      id: createId('audit'),
      module: moduleLabelByEvent[event],
      action: event.endsWith('.created') ? 'create' : 'update',
      actor: metadata.actor,
      entityId,
      summary: `${event}: ${summary}${metadata.reason ? ` Reason: ${metadata.reason}` : ''}`,
      createdAt: new Date().toISOString(),
    };
    auditLogEntries.unshift(entry);
    return entry;
  },
};
