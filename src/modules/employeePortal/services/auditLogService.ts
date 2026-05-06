import type { AuditLogEntry, AuditLogListFilters, AuditLogListResult, AuditMetadata } from '../types/auditTypes';
import { PortalApiError, createId, mockDelay, portalApiFetch } from './employeePortalApi';

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
  | 'timesheet.correction.requested'
  | 'attachment.created'
  | 'attachment.updated'
  | 'attachment.archived';

interface AuditLogServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: AuditLogServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Audit log API is unavailable.';
  serviceStatus = { available: false, message };
};

export const getAuditLogServiceStatus = () => serviceStatus;

export const auditLogEntries: AuditLogEntry[] = [
  {
    id: 'audit_001',
    module: 'Employee',
    action: 'employee.created',
    actorLabel: 'mvp-admin',
    entityType: 'employee',
    entityId: 'emp_001',
    entityLabel: 'Seed Employee',
    summary: 'Seeded employee record for MVP preview.',
    createdAt: '2026-05-06T00:00:00.000Z',
  },
  {
    id: 'audit_002',
    module: 'PayrollFormula',
    action: 'formula.previewed',
    actorLabel: 'mvp-admin',
    entityType: 'formula',
    entityId: 'formula_base_pay',
    entityLabel: 'Base Pay Formula',
    summary: 'Formula preview only; no payroll finalization performed.',
    createdAt: '2026-05-06T00:05:00.000Z',
  },
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
  'attachment.created': 'Attachment',
  'attachment.updated': 'Attachment',
  'attachment.archived': 'Attachment',
};

const entityTypeByEvent = (event: EmployeePortalAuditEvent): string => {
  if (event.startsWith('employee.')) return 'employee';
  if (event.startsWith('department.')) return 'department';
  if (event.startsWith('position.')) return 'position';
  if (event.startsWith('role.')) return 'role';
  if (event.startsWith('onboarding.')) return 'onboarding';
  if (event.startsWith('training.')) return 'training';
  if (event.startsWith('sop.')) return 'sop';
  if (event.startsWith('attendance.')) return 'attendance';
  if (event.startsWith('attachment.')) return 'attachment';
  return 'timesheet';
};

const toSearch = (filters: AuditLogListFilters, entries: AuditLogEntry[]) =>
  entries.filter((entry) => {
    if (filters.module && entry.module !== filters.module) return false;
    if (filters.action && entry.action !== filters.action) return false;
    if (filters.entityType && entry.entityType !== filters.entityType) return false;
    if (filters.entityId && entry.entityId !== filters.entityId) return false;
    if (filters.actorUserId && entry.actorUserId !== filters.actorUserId) return false;
    if (filters.dateFrom && entry.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && entry.createdAt > `${filters.dateTo}T23:59:59.999Z`) return false;
    return true;
  });

const buildQueryString = (filters: AuditLogListFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const auditLogService = {
  async listAuditLogs(): Promise<AuditLogEntry[]> {
    const result = await this.searchAuditLogs({});
    return result.items;
  },

  async searchAuditLogs(filters: AuditLogListFilters = {}): Promise<AuditLogListResult> {
    try {
      const result = await portalApiFetch<AuditLogListResult>(`/audit-logs${buildQueryString(filters)}`);
      markAvailable();
      return result;
    } catch (error) {
      if (error instanceof PortalApiError) {
        markUnavailable(error);
      }
      await mockDelay();
      const filtered = toSearch(filters, [...auditLogEntries]);
      const page = Math.max(1, filters.page ?? 1);
      const pageSize = Math.max(1, filters.pageSize ?? 25);
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    }
  },

  async recordEvent(event: EmployeePortalAuditEvent, entityId: string, metadata: AuditMetadata, summary: string) {
    await mockDelay();
    const entry: AuditLogEntry = {
      id: createId('audit'),
      module: moduleLabelByEvent[event],
      action: event,
      actorLabel: metadata.actor,
      entityType: entityTypeByEvent(event),
      entityId,
      summary: `${event}: ${summary}${metadata.reason ? ` Reason: ${metadata.reason}` : ''}`,
      metadata: { source: metadata.source, reason: metadata.reason },
      createdAt: new Date().toISOString(),
    };
    auditLogEntries.unshift(entry);
    return entry;
  },
};
