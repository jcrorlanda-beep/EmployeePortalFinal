import type { AuditMetadata } from '../types/auditTypes';
import type {
  TrainingAssignment,
  TrainingAssignmentDraft,
  TrainingModule,
  TrainingModuleDraft,
  TrainingProgressUpdate,
} from '../types/trainingTypes';
import { auditLogService } from './auditLogService';
import { createId, mockDelay, PortalApiError, portalApiFetch } from './employeePortalApi';

type ServiceMode = 'api' | 'fallback';

interface ServiceStatus {
  mode: ServiceMode;
  message?: string;
}

const now = () => new Date().toISOString();

let serviceStatus: ServiceStatus = { mode: 'fallback', message: 'Using local fallback data until the backend is available.' };

export let trainingModules: TrainingModule[] = [
  {
    id: 'training_safety',
    title: 'Workshop Safety Basics',
    description: 'Baseline safety orientation for workshop floors, tool handling, and hazard reporting.',
    category: 'Safety',
    level: 'Beginner',
    targetRole: 'role_general_mechanic',
    estimatedMinutes: 45,
    contentType: 'Checklist',
    contentReference: 'future-document-store://workshop-safety-basics',
    status: 'Active',
    certificationEligible: true,
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
  },
  {
    id: 'training_vehicle_intake',
    title: 'Vehicle Intake SOP Review',
    description: 'Service desk and technician walkthrough for intake documentation and customer handoff notes.',
    category: 'Operations',
    level: 'Intermediate',
    targetRole: 'role_service_advisor',
    estimatedMinutes: 35,
    contentType: 'SOP',
    contentReference: 'sop_001',
    status: 'Active',
    certificationEligible: false,
    createdAt: '2026-05-06T00:10:00.000Z',
    updatedAt: '2026-05-06T00:10:00.000Z',
  },
];

export let trainingAssignments: TrainingAssignment[] = [
  {
    id: 'assign_001',
    trainingModuleId: 'training_safety',
    employeeId: 'emp_002',
    dueDate: '2026-05-20',
    status: 'In Progress',
    assignedAt: '2026-05-06T00:20:00.000Z',
    supervisorNotes: 'Initial safety checklist assigned during onboarding.',
    certificationIssued: false,
  },
];

const sortModules = (records: TrainingModule[]) =>
  [...records].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

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

export const getTrainingServiceStatus = () => serviceStatus;

export const trainingService = {
  async listTrainingModules(): Promise<TrainingModule[]> {
    return withFallback(
      async () => sortModules(await portalApiFetch<TrainingModule[]>('/training/modules')),
      async () => {
        await mockDelay();
        return sortModules(trainingModules);
      },
    );
  },

  async createTrainingModule(draft: TrainingModuleDraft, audit: AuditMetadata): Promise<TrainingModule> {
    return withFallback(
      async () => portalApiFetch<TrainingModule>('/training/modules', { method: 'POST', body: JSON.stringify(draft) }),
      async () => {
        await mockDelay();
        const timestamp = now();
        const module: TrainingModule = {
          ...draft,
          id: createId('training'),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        trainingModules = [module, ...trainingModules];
        await auditLogService.recordEvent('training.module.created', module.id, audit, `Created training module ${module.title}.`);
        return module;
      },
    );
  },

  async updateTrainingModule(id: string, patch: Partial<TrainingModuleDraft>, audit: AuditMetadata): Promise<TrainingModule | null> {
    return withFallback(
      async () => portalApiFetch<TrainingModule>(`/training/modules/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      async () => {
        await mockDelay();
        let updated: TrainingModule | null = null;
        trainingModules = trainingModules.map((module) => {
          if (module.id !== id) return module;
          updated = { ...module, ...patch, updatedAt: now() };
          return updated;
        });
        if (updated) {
          const moduleTitle = (updated as TrainingModule).title;
          await auditLogService.recordEvent('training.module.updated', id, audit, `Updated training module ${moduleTitle}.`);
        }
        return updated;
      },
    );
  },

  async listAssignments(): Promise<TrainingAssignment[]> {
    return withFallback(
      async () => {
        const assignments = await portalApiFetch<TrainingAssignment[]>('/training/assignments');
        return [...assignments].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
      },
      async () => {
        await mockDelay();
        return [...trainingAssignments].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
      },
    );
  },

  async assignTraining(draft: TrainingAssignmentDraft, audit: AuditMetadata): Promise<TrainingAssignment | null> {
    return withFallback(
      async () => portalApiFetch<TrainingAssignment>('/training/assignments', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: draft.employeeId,
          trainingModuleId: draft.trainingModuleId,
          dueDate: draft.dueDate,
          supervisorNotes: draft.supervisorNotes,
        }),
      }),
      async () => {
        await mockDelay();
        const module = trainingModules.find((item) => item.id === draft.trainingModuleId);
        if (!module) return null;
        const assignment: TrainingAssignment = {
          id: createId('training_assign'),
          employeeId: draft.employeeId,
          trainingModuleId: draft.trainingModuleId,
          status: 'Assigned',
          assignedAt: now(),
          dueDate: draft.dueDate || undefined,
          supervisorNotes: draft.supervisorNotes?.trim() || undefined,
          certificationIssued: false,
        };
        trainingAssignments = [assignment, ...trainingAssignments];
        await auditLogService.recordEvent('training.assigned', assignment.id, audit, `Assigned ${module.title} to employee ${draft.employeeId}.`);
        return assignment;
      },
    );
  },

  async updateAssignmentProgress(id: string, patch: TrainingProgressUpdate, audit: AuditMetadata): Promise<TrainingAssignment | null> {
    return withFallback(
      async () => portalApiFetch<TrainingAssignment>(`/training/assignments/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...patch,
          completedAt: patch.status === 'Completed' ? now() : undefined,
        }),
      }),
      async () => {
        await mockDelay();
        let updated: TrainingAssignment | null = null;
        trainingAssignments = trainingAssignments.map((assignment) => {
          if (assignment.id !== id) return assignment;
          const completedAt = patch.status === 'Completed' ? assignment.completedAt ?? now() : undefined;
          updated = {
            ...assignment,
            status: patch.status,
            score: patch.score,
            supervisorNotes: patch.supervisorNotes?.trim() || undefined,
            certificationIssued: patch.certificationIssued ?? assignment.certificationIssued,
            completedAt,
          };
          return updated;
        });
        if (updated) {
          const nextStatus = (updated as TrainingAssignment).status;
          const certificationIssued = (updated as TrainingAssignment).certificationIssued;
          await auditLogService.recordEvent(
            patch.status === 'Completed' ? 'training.completed' : 'training.progress.updated',
            id,
            audit,
            `Updated training assignment ${id} to ${nextStatus}.`,
          );
          if (certificationIssued) {
            await auditLogService.recordEvent('training.certification.issued', id, audit, `Certification marked issued for training assignment ${id}.`);
          }
        }
        return updated;
      },
    );
  },

  async issueCertification(id: string, audit: AuditMetadata): Promise<TrainingAssignment | null> {
    return this.updateAssignmentProgress(id, { status: 'Completed', certificationIssued: true }, audit);
  },
};
