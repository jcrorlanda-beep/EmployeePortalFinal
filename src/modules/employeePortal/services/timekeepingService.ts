import type { AttendanceRecord, TimesheetRecord } from '../types/attendanceTypes';
export const attendanceRecords: AttendanceRecord[] = [{ id: 'att_001', employeeId: 'emp_001', clockedAt: '2026-05-06T08:00:00.000Z', type: 'in', source: 'manual-mvp', correctionStatus: 'none' }];
export const timesheetRecords: TimesheetRecord[] = [{ id: 'time_001', employeeId: 'emp_001', periodStart: '2026-05-01', periodEnd: '2026-05-15', regularHours: 80, overtimeHours: 0, status: 'draft' }];
export const timekeepingService = { async listAttendance() { return attendanceRecords; }, async listTimesheets() { return timesheetRecords; } };
