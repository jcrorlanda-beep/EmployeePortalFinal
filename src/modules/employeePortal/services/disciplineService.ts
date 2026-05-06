import type { DisciplineCategory, DisciplineRecord, DisciplineRecordStatus, DisciplineSeverity } from '../types/disciplineTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface DisciplineServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: DisciplineServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Discipline API is unavailable.';
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

export const getDisciplineServiceStatus = () => serviceStatus;

export const disciplineService = {
  async listCategories(): Promise<DisciplineCategory[]> {
    return callApi(() => portalApiFetch<DisciplineCategory[]>('/discipline/categories'));
  },

  async createCategory(name: string, defaultSeverity: DisciplineSeverity): Promise<DisciplineCategory> {
    return callApi(() =>
      portalApiFetch<DisciplineCategory>('/discipline/categories', {
        method: 'POST',
        body: JSON.stringify({ name, defaultSeverity, active: true }),
      }),
    );
  },

  async updateCategory(id: string, patch: Partial<Omit<DisciplineCategory, 'id' | 'createdAt'>>): Promise<DisciplineCategory> {
    return callApi(() =>
      portalApiFetch<DisciplineCategory>(`/discipline/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async listRecords(): Promise<DisciplineRecord[]> {
    return callApi(() => portalApiFetch<DisciplineRecord[]>('/discipline/records'));
  },

  async createRecord(
    employeeId: string,
    categoryId: string,
    severity: DisciplineSeverity,
    incidentDate: string,
    summary: string,
    correctiveAction?: string,
    attachmentReference?: string,
  ): Promise<DisciplineRecord> {
    return callApi(() =>
      portalApiFetch<DisciplineRecord>('/discipline/records', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          categoryId,
          severity,
          incidentDate,
          summary,
          correctiveAction,
          attachmentReference,
          status: 'draft',
        }),
      }),
    );
  },

  async updateRecordStatus(id: string, status: DisciplineRecordStatus, expectedUpdatedAt?: string): Promise<DisciplineRecord> {
    return callApi(() =>
      portalApiFetch<DisciplineRecord>(`/discipline/records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, expectedUpdatedAt }),
      }),
    );
  },
};
