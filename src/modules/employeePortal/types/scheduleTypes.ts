export type ScheduleDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type ScheduleInstanceStatus = 'draft' | 'published' | 'changed';
export type PtoType = 'Vacation' | 'Sick' | 'Emergency' | 'Unpaid' | 'Other';
export type PtoStatus = 'pending' | 'approved' | 'rejected' | 'declined';
export type SwapStatus = 'pending' | 'accepted' | 'approved' | 'manager-approved' | 'rejected' | 'declined' | 'cancelled';
export type ScheduleSourceType = 'Regular' | 'Temporary' | 'PTO' | 'Swap' | 'Manual';

export interface ScheduleTemplate {
  id: string;
  name: string;
  employeeId?: string;
  departmentId?: string;
  positionId?: string;
  timezone?: string;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  status?: string;
  startTime: string;
  endTime: string;
  days: ScheduleDay[];
  restDays?: ScheduleDay[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleInstance {
  id: string;
  employeeId: string;
  templateId: string;
  scheduleTemplateId?: string;
  workDate: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  isRestDay?: boolean;
  status: ScheduleInstanceStatus;
  isTemporary?: boolean;
  isHoliday?: boolean;
  sourceType?: ScheduleSourceType;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PtoRequest {
  id: string;
  employeeId: string;
  type: PtoType;
  leaveType?: PtoType;
  startsOn: string;
  startDate?: string;
  endsOn: string;
  endDate?: string;
  halfDay?: boolean;
  isHalfDay?: boolean;
  halfDayPortion?: string;
  isPaid?: boolean;
  reason: string;
  attachmentUrl?: string;
  status: PtoStatus;
  requestedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PtoBalance {
  id: string;
  employeeId: string;
  leaveType: PtoType | string;
  earned: number;
  used: number;
  remaining: number;
  year: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleSwapRequest {
  id: string;
  requesterEmployeeId: string;
  requestingEmployeeId?: string;
  targetEmployeeId: string;
  scheduleInstanceId: string;
  requesterScheduleInstanceId?: string;
  targetScheduleInstanceId?: string;
  requestedDate?: string;
  targetDate?: string;
  reason?: string;
  status: SwapStatus;
  requesterNote?: string;
  requesterNotes?: string;
  targetNote?: string;
  targetEmployeeNotes?: string;
  managerNote?: string;
  managerNotes?: string;
  targetEmployeeAcceptedAt?: string;
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  temporaryOnly?: boolean;
  createdAt: string;
  updatedAt?: string;
}
