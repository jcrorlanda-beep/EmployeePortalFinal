import type {
  PtoBalance,
  PtoRequest,
  PtoStatus,
  PtoType,
  ScheduleDay,
  ScheduleInstance,
  ScheduleInstanceStatus,
  ScheduleSwapRequest,
  ScheduleTemplate,
  SwapStatus,
} from '../types/scheduleTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface SchedulingServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: SchedulingServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Scheduling API is unavailable.';
  serviceStatus = { available: false, message };
};

const callApi = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    const result = await run();
    markAvailable();
    return result;
  } catch (error) {
    if (error instanceof PortalApiError) {
      markUnavailable(error);
    }
    throw error;
  }
};

export const getSchedulingServiceStatus = () => serviceStatus;

export const schedulingService = {
  async listTemplates(): Promise<ScheduleTemplate[]> {
    return callApi(() => portalApiFetch<ScheduleTemplate[]>('/schedules/templates'));
  },

  async createTemplate(
    name: string,
    departmentId: string,
    startTime: string,
    endTime: string,
    days: ScheduleDay[],
    restDays?: ScheduleDay[],
  ): Promise<ScheduleTemplate> {
    return callApi(() =>
      portalApiFetch<ScheduleTemplate>('/schedules/templates', {
        method: 'POST',
        body: JSON.stringify({
          name,
          departmentId: departmentId || undefined,
          startTime,
          endTime,
          days,
          restDays: restDays ?? [],
        }),
      }),
    );
  },

  async updateTemplate(id: string, patch: Partial<Omit<ScheduleTemplate, 'id' | 'createdAt'>>): Promise<ScheduleTemplate> {
    return callApi(() =>
      portalApiFetch<ScheduleTemplate>(`/schedules/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async listInstances(): Promise<ScheduleInstance[]> {
    return callApi(() => portalApiFetch<ScheduleInstance[]>('/schedules/instances'));
  },

  async publishInstance(employeeId: string, scheduleTemplateId: string, workDate: string): Promise<ScheduleInstance> {
    return callApi(() =>
      portalApiFetch<ScheduleInstance>('/schedules/instances', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          scheduleTemplateId,
          workDate,
          status: 'published',
        }),
      }),
    );
  },

  async updateInstanceStatus(id: string, status: ScheduleInstanceStatus): Promise<ScheduleInstance> {
    return callApi(() =>
      portalApiFetch<ScheduleInstance>(`/schedules/instances/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    );
  },

  async listPtoRequests(): Promise<PtoRequest[]> {
    return callApi(() => portalApiFetch<PtoRequest[]>('/leave-requests'));
  },

  async createPtoRequest(
    employeeId: string,
    type: PtoType,
    startsOn: string,
    endsOn: string,
    reason: string,
    halfDay?: boolean,
  ): Promise<PtoRequest> {
    return callApi(() =>
      portalApiFetch<PtoRequest>('/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          leaveType: type,
          startDate: startsOn,
          endDate: endsOn,
          isHalfDay: halfDay ?? false,
          reason,
          isPaid: type !== 'Unpaid',
        }),
      }),
    );
  },

  async updatePtoStatus(id: string, status: PtoStatus, reviewNotes?: string): Promise<PtoRequest> {
    const path = status === 'approved' ? `/leave-requests/${id}/approve` : `/leave-requests/${id}/reject`;
    return callApi(() =>
      portalApiFetch<PtoRequest>(path, {
        method: 'POST',
        body: JSON.stringify({ reviewNotes }),
      }),
    );
  },

  async listPtoBalances(): Promise<PtoBalance[]> {
    return callApi(() => portalApiFetch<PtoBalance[]>('/pto-balances'));
  },

  async listSwapRequests(): Promise<ScheduleSwapRequest[]> {
    return callApi(() => portalApiFetch<ScheduleSwapRequest[]>('/schedule-swaps'));
  },

  async createSwapRequest(
    requesterEmployeeId: string,
    targetEmployeeId: string,
    requesterScheduleInstanceId: string,
    requesterNotes?: string,
  ): Promise<ScheduleSwapRequest> {
    return callApi(() =>
      portalApiFetch<ScheduleSwapRequest>('/schedule-swaps', {
        method: 'POST',
        body: JSON.stringify({
          requestingEmployeeId: requesterEmployeeId,
          targetEmployeeId,
          requesterScheduleInstanceId,
          reason: requesterNotes?.trim() || 'Temporary swap requested',
          requesterNotes: requesterNotes?.trim() || undefined,
        }),
      }),
    );
  },

  async acceptSwapRequest(id: string, targetEmployeeNotes?: string): Promise<ScheduleSwapRequest> {
    return callApi(() =>
      portalApiFetch<ScheduleSwapRequest>(`/schedule-swaps/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ targetEmployeeNotes }),
      }),
    );
  },

  async approveSwapRequest(id: string, managerNotes?: string): Promise<ScheduleSwapRequest> {
    return callApi(() =>
      portalApiFetch<ScheduleSwapRequest>(`/schedule-swaps/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ managerNotes }),
      }),
    );
  },

  async rejectSwapRequest(id: string, managerNotes?: string): Promise<ScheduleSwapRequest> {
    return callApi(() =>
      portalApiFetch<ScheduleSwapRequest>(`/schedule-swaps/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ managerNotes }),
      }),
    );
  },

  async cancelSwapRequest(id: string): Promise<ScheduleSwapRequest> {
    return callApi(() =>
      portalApiFetch<ScheduleSwapRequest>(`/schedule-swaps/${id}/cancel`, {
        method: 'POST',
      }),
    );
  },
};
