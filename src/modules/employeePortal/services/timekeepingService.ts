import type { AuditMetadata } from '../types/auditTypes';
import type { AttendanceRecord, AttendanceEventType, TimesheetRecord, TimesheetStatus } from '../types/attendanceTypes';
import { auditLogService } from './auditLogService';
import { createAuditMetadata, createId, mockDelay, PortalApiError, portalApiFetch } from './employeePortalApi';

type ServiceMode = 'api' | 'fallback';

interface ServiceStatus {
  mode: ServiceMode;
  message?: string;
}

const now = () => new Date().toISOString();

let serviceStatus: ServiceStatus = { mode: 'fallback', message: 'Using local fallback data until the backend is available.' };

export let attendanceRecords: AttendanceRecord[] = [
  {
    id: 'att_001',
    employeeId: 'emp_001',
    clockedAt: '2026-05-06T08:00:00.000Z',
    type: 'in',
    source: 'manual-mvp',
    correctionStatus: 'none',
    createdAt: '2026-05-06T08:00:00.000Z',
  },
  {
    id: 'att_002',
    employeeId: 'emp_001',
    clockedAt: '2026-05-06T12:00:00.000Z',
    type: 'break-start',
    source: 'manual-mvp',
    correctionStatus: 'none',
    createdAt: '2026-05-06T12:00:00.000Z',
  },
  {
    id: 'att_003',
    employeeId: 'emp_002',
    clockedAt: '2026-05-06T08:05:00.000Z',
    type: 'in',
    source: 'manual-mvp',
    correctionStatus: 'requested',
    notes: 'Late arrival note',
    createdAt: '2026-05-06T08:05:00.000Z',
  },
];

export let timesheetRecords: TimesheetRecord[] = [
  {
    id: 'time_001',
    employeeId: 'emp_001',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    regularHours: 80,
    overtimeHours: 0,
    status: 'submitted',
    createdAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'time_002',
    employeeId: 'emp_002',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    regularHours: 72,
    overtimeHours: 4,
    status: 'draft',
    createdAt: '2026-05-01T00:00:00.000Z',
  },
];

const markApiMode = () => {
  serviceStatus = { mode: 'api' };
};

const markFallbackMode = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Employee Portal API is unavailable.';
  serviceStatus = { mode: 'fallback', message };
};

const withFallback = async <T>(runApi: () => Promise<T>, runFallback: () => Promise<T>): Promise<T> => {
  try {
    const result = await runApi();
    markApiMode();
    return result;
  } catch (error) {
    if (!(error instanceof PortalApiError) || (!error.isBackendUnavailable && !error.isAuthError)) {
      throw error;
    }
    markFallbackMode(error);
    return runFallback();
  }
};

export const getTimekeepingServiceStatus = () => serviceStatus;

export const timekeepingService = {
  async listAttendance(): Promise<AttendanceRecord[]> {
    return withFallback(
      async () => {
        const records = await portalApiFetch<AttendanceRecord[]>('/timekeeping/attendance');
        return [...records].sort((a, b) => b.clockedAt.localeCompare(a.clockedAt));
      },
      async () => {
        await mockDelay();
        return [...attendanceRecords].sort((a, b) => b.clockedAt.localeCompare(a.clockedAt));
      },
    );
  },

  async addClockEvent(employeeId: string, type: AttendanceEventType, clockedAt: string, notes?: string, audit: AuditMetadata = createAuditMetadata('mvp-admin', 'Attendance event')): Promise<AttendanceRecord> {
    return withFallback(
      async () => portalApiFetch<AttendanceRecord>('/timekeeping/attendance', {
        method: 'POST',
        body: JSON.stringify({ employeeId, type, clockedAt, notes, source: 'manual-mvp', correctionStatus: 'none' }),
      }),
      async () => {
        await mockDelay();
        const record: AttendanceRecord = {
          id: createId('att'),
          employeeId,
          clockedAt,
          type,
          source: 'manual-mvp',
          correctionStatus: 'none',
          notes: notes?.trim() || undefined,
          createdAt: now(),
        };
        attendanceRecords = [record, ...attendanceRecords];
        await auditLogService.recordEvent('attendance.clocked', record.id, audit, `Recorded ${type} clock event for employee ${employeeId}.`);
        return record;
      },
    );
  },

  async requestCorrection(id: string, notes: string, audit: AuditMetadata = createAuditMetadata('mvp-admin', 'Attendance correction request')): Promise<AttendanceRecord | null> {
    return withFallback(
      async () => portalApiFetch<AttendanceRecord>(`/timekeeping/attendance/${id}/request-correction`, {
        method: 'PATCH',
        body: JSON.stringify({ correctionStatus: 'requested', notes }),
      }),
      async () => {
        await mockDelay();
        let updated: AttendanceRecord | null = null;
        attendanceRecords = attendanceRecords.map((record) => {
          if (record.id !== id) return record;
          updated = { ...record, correctionStatus: 'requested', notes: notes.trim() || record.notes };
          return updated;
        });
        if (updated) {
          await auditLogService.recordEvent('attendance.correction.requested', id, audit, `Requested correction for attendance record ${id}.`);
        }
        return updated;
      },
    );
  },

  async listTimesheets(): Promise<TimesheetRecord[]> {
    return withFallback(
      async () => {
        const records = await portalApiFetch<TimesheetRecord[]>('/timekeeping/timesheets');
        return [...records].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
      },
      async () => {
        await mockDelay();
        return [...timesheetRecords].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
      },
    );
  },

  async createTimesheet(employeeId: string, periodStart: string, periodEnd: string, audit: AuditMetadata = createAuditMetadata('mvp-admin', 'Timesheet create')): Promise<TimesheetRecord> {
    return withFallback(
      async () => portalApiFetch<TimesheetRecord>('/timekeeping/timesheets', {
        method: 'POST',
        body: JSON.stringify({ employeeId, periodStart, periodEnd, regularHours: 0, overtimeHours: 0, status: 'draft' }),
      }),
      async () => {
        await mockDelay();
        const record: TimesheetRecord = {
          id: createId('time'),
          employeeId,
          periodStart,
          periodEnd,
          regularHours: 0,
          overtimeHours: 0,
          status: 'draft',
          createdAt: now(),
        };
        timesheetRecords = [record, ...timesheetRecords];
        await auditLogService.recordEvent('timesheet.created', record.id, audit, `Created timesheet for employee ${employeeId}.`);
        return record;
      },
    );
  },

  async updateTimesheetStatus(id: string, status: TimesheetStatus, notes?: string, audit: AuditMetadata = createAuditMetadata('mvp-admin', 'Timesheet status update')): Promise<TimesheetRecord | null> {
    return withFallback(
      async () => portalApiFetch<TimesheetRecord>(`/timekeeping/timesheets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }),
      async () => {
        await mockDelay();
        let updated: TimesheetRecord | null = null;
        timesheetRecords = timesheetRecords.map((record) => {
          if (record.id !== id) return record;
          updated = {
            ...record,
            status,
            correctionNotes: status === 'correction-requested' ? notes?.trim() || record.correctionNotes : record.correctionNotes,
            correctionReason: status === 'correction-requested' ? notes?.trim() || record.correctionReason : record.correctionReason,
            approvedBy: status === 'approved' ? 'mvp-admin' : record.approvedBy,
            approvedAt: status === 'approved' ? now() : record.approvedAt,
          };
          return updated;
        });
        if (updated) {
          const event =
            status === 'approved'
              ? 'timesheet.approved'
              : status === 'correction-requested'
                ? 'timesheet.correction.requested'
                : 'timesheet.submitted';
          await auditLogService.recordEvent(event, id, audit, `Updated timesheet ${id} to ${status}.`);
        }
        return updated;
      },
    );
  },
};
