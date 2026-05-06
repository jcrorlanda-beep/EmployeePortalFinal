import type { PtoRequest, ScheduleInstance, ScheduleSwapRequest, ScheduleTemplate } from '../types/scheduleTypes';
export const scheduleTemplates: ScheduleTemplate[] = [{ id: 'sched_day', name: 'Day Shift', departmentId: 'dept_shop', startTime: '08:00', endTime: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }];
export const scheduleInstances: ScheduleInstance[] = [{ id: 'inst_001', employeeId: 'emp_002', templateId: 'sched_day', workDate: '2026-05-07', status: 'published' }];
export const ptoRequests: PtoRequest[] = [{ id: 'pto_001', employeeId: 'emp_001', startsOn: '2026-05-22', endsOn: '2026-05-22', reason: 'Personal leave', status: 'pending' }];
export const scheduleSwapRequests: ScheduleSwapRequest[] = [{ id: 'swap_001', requesterEmployeeId: 'emp_001', targetEmployeeId: 'emp_002', scheduleInstanceId: 'inst_001', status: 'pending' }];
export const schedulingService = { async listTemplates() { return scheduleTemplates; }, async listInstances() { return scheduleInstances; }, async listPtoRequests() { return ptoRequests; }, async listSwapRequests() { return scheduleSwapRequests; } };
