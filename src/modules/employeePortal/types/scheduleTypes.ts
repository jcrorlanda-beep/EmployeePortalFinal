export interface ScheduleTemplate { id: string; name: string; departmentId: string; startTime: string; endTime: string; days: string[]; }
export interface ScheduleInstance { id: string; employeeId: string; templateId: string; workDate: string; status: 'draft' | 'published' | 'changed'; }
export interface PtoRequest { id: string; employeeId: string; startsOn: string; endsOn: string; reason: string; status: 'pending' | 'approved' | 'declined'; }
export interface ScheduleSwapRequest { id: string; requesterEmployeeId: string; targetEmployeeId: string; scheduleInstanceId: string; status: 'pending' | 'accepted' | 'declined'; }
