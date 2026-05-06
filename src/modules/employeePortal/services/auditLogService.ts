import type { AuditLogEntry, AuditMetadata } from '../types/auditTypes';
import { createId, mockDelay } from './employeePortalApi';

export type EmployeePortalAuditEvent =
  | 'employee.created'
  | 'employee.updated'
  | 'department.created'
  | 'department.updated'
  | 'department.deactivated'
  | 'position.created'
  | 'position.updated'
  | 'position.deactivated'
  | 'role.created'
  | 'role.updated'
  | 'role.permissions.updated'
  | 'onboarding.template.created'
  | 'onboarding.template.updated'
  | 'onboarding.assigned'
  | 'onboarding.step.updated'
  | 'onboarding.approved'
  | 'training.module.created'
  | 'training.module.updated'
  | 'training.assigned'
  | 'training.progress.updated'
  | 'training.completed'
  | 'training.certification.issued'
  | 'sop.created'
  | 'sop.updated'
  | 'sop.acknowledged'
  | 'sop.archived'
  | 'attendance.clocked'
  | 'attendance.correction.requested'
  | 'timesheet.created'
  | 'timesheet.submitted'
  | 'timesheet.approved'
  | 'timesheet.correction.requested';

export const auditLogEntries: AuditLogEntry[] = [
  { id: 'audit_001', module: 'Employee', action: 'create', actor: 'mvp-admin', entityId: 'emp_001', summary: 'Seeded employee record for MVP preview.', createdAt: '2026-05-06T00:00:00.000Z' },
  { id: 'audit_002', module: 'PayrollFormula', action: 'preview', actor: 'mvp-admin', entityId: 'formula_base_pay', summary: 'Formula preview only; no payroll finalization performed.', createdAt: '2026-05-06T00:05:00.000Z' },
];

const moduleLabelByEvent: Record<EmployeePortalAuditEvent, string> = {
  'employee.created': 'Employee',
  'employee.updated': 'Employee',
  'department.created': 'Department',
  'department.updated': 'Department',
  'department.deactivated': 'Department',
  'position.created': 'Position',
  'position.updated': 'Position',
  'position.deactivated': 'Position',
  'role.created': 'EmployeeRole',
  'role.updated': 'EmployeeRole',
  'role.permissions.updated': 'EmployeeRole',
  'onboarding.template.created': 'Onboarding',
  'onboarding.template.updated': 'Onboarding',
  'onboarding.assigned': 'Onboarding',
  'onboarding.step.updated': 'Onboarding',
  'onboarding.approved': 'Onboarding',
  'training.module.created': 'Training',
  'training.module.updated': 'Training',
  'training.assigned': 'Training',
  'training.progress.updated': 'Training',
  'training.completed': 'Training',
  'training.certification.issued': 'Training',
  'sop.created': 'SOP',
  'sop.updated': 'SOP',
  'sop.acknowledged': 'SOP',
  'sop.archived': 'SOP',
  'attendance.clocked': 'Timekeeping',
  'attendance.correction.requested': 'Timekeeping',
  'timesheet.created': 'Timesheet',
  'timesheet.submitted': 'Timesheet',
  'timesheet.approved': 'Timesheet',
  'timesheet.correction.requested': 'Timesheet',
};

const actionByEvent = (event: EmployeePortalAuditEvent): AuditLogEntry['action'] => {
  if (event.endsWith('.created') || event.endsWith('.assigned')) return 'create';
  if (event.endsWith('.approved') || event.endsWith('.issued') || event.endsWith('.acknowledged')) return 'approve';
  return 'update';
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
      action: actionByEvent(event),
      actor: metadata.actor,
      entityId,
      summary: `${event}: ${summary}${metadata.reason ? ` Reason: ${metadata.reason}` : ''}`,
      createdAt: new Date().toISOString(),
    };
    auditLogEntries.unshift(entry);
    return entry;
  },
};
