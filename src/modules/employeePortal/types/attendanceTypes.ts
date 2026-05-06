export type AttendanceEventType = 'in' | 'out' | 'break-start' | 'break-end';
export type AttendanceSource = 'manual-mvp' | 'device-future';
export type CorrectionStatus = 'none' | 'requested' | 'approved';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'correction-requested';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  clockedAt: string;
  type: AttendanceEventType;
  source: AttendanceSource;
  correctionStatus: CorrectionStatus;
  notes?: string;
  createdAt: string;
}

export interface TimesheetRecord {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  status: TimesheetStatus;
  correctionNotes?: string;
  correctionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}
