import type { AuditMetadata } from '../types/auditTypes';
import type {
  EmployeeOnboardingChecklist,
  OnboardingStep,
  OnboardingStepProgress,
  OnboardingStepProgressStatus,
  OnboardingTemplate,
  OnboardingTemplateDraft,
} from '../types/onboardingTypes';
import { auditLogService } from './auditLogService';
import { createId, mockDelay, PortalApiError, portalApiFetch } from './employeePortalApi';

type ServiceMode = 'api' | 'fallback';

interface ServiceStatus {
  mode: ServiceMode;
  message?: string;
}

const createInitialProgress = (steps: OnboardingStep[]): OnboardingStepProgress[] =>
  steps.map((step) => ({ stepId: step.id, status: 'Not Started' }));

let serviceStatus: ServiceStatus = { mode: 'fallback', message: 'Using local fallback data until the backend is available.' };

let onboardingTemplates: OnboardingTemplate[] = [
  {
    id: 'onboard_general',
    name: 'General Workshop Onboarding',
    description: 'Baseline onboarding for new workshop and service team members.',
    targetRole: 'role_employee',
    targetDepartmentId: 'dept_shop',
    status: 'active',
    steps: [
      { id: 'step_profile', title: 'Verify employee profile', description: 'Confirm employee personal and emergency contact information.', category: 'HR', required: true, estimatedMinutes: 20, sortOrder: 10 },
      { id: 'step_tools', title: 'Issue tool and safety checklist', description: 'Review safety expectations and record initial tool issuance.', category: 'Tools & Safety', required: true, estimatedMinutes: 45, sortOrder: 20 },
      { id: 'step_sop', title: 'Review vehicle intake SOP', description: 'Introduce SOP library usage and initial acknowledgment workflow.', category: 'SOP', required: true, estimatedMinutes: 30, sortOrder: 30 },
    ],
  },
];

let employeeChecklists: EmployeeOnboardingChecklist[] = [
  {
    id: 'employee_onboard_001',
    employeeId: 'emp_002',
    templateId: 'onboard_general',
    status: 'in-progress',
    assignedAt: '2026-05-06T00:00:00.000Z',
    stepProgress: [
      { stepId: 'step_profile', status: 'Completed', completedAt: '2026-05-06T01:00:00.000Z', notes: 'Profile reviewed by HR.' },
      { stepId: 'step_tools', status: 'In Progress', notes: 'Tool checklist underway.' },
      { stepId: 'step_sop', status: 'Not Started' },
    ],
  },
];

const sortTemplateSteps = (template: OnboardingTemplate): OnboardingTemplate => ({
  ...template,
  steps: [...template.steps].sort((a, b) => a.sortOrder - b.sortOrder),
});

const calculateChecklistStatus = (stepProgress: OnboardingStepProgress[]): EmployeeOnboardingChecklist['status'] => {
  if (stepProgress.length > 0 && stepProgress.every((step) => step.status === 'Completed' || step.status === 'Skipped')) {
    return 'pending-approval';
  }
  if (stepProgress.some((step) => step.status === 'Completed' || step.status === 'In Progress' || step.status === 'Skipped')) {
    return 'in-progress';
  }
  return 'assigned';
};

const normalizeTemplate = (template: OnboardingTemplate): OnboardingTemplate => sortTemplateSteps(template);
const normalizeChecklist = (checklist: EmployeeOnboardingChecklist): EmployeeOnboardingChecklist => ({
  ...checklist,
  stepProgress: [...checklist.stepProgress],
});

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

export const getOnboardingServiceStatus = () => serviceStatus;

export const onboardingService = {
  async listTemplates(): Promise<OnboardingTemplate[]> {
    return withFallback(
      async () => {
        const templates = await portalApiFetch<OnboardingTemplate[]>('/onboarding/templates');
        return templates.map(normalizeTemplate);
      },
      async () => {
        await mockDelay();
        return onboardingTemplates.map(normalizeTemplate);
      },
    );
  },

  async createTemplate(draft: OnboardingTemplateDraft, audit: AuditMetadata): Promise<OnboardingTemplate> {
    return withFallback(
      async () => normalizeTemplate(await portalApiFetch<OnboardingTemplate>('/onboarding/templates', { method: 'POST', body: JSON.stringify(draft) })),
      async () => {
        await mockDelay();
        const template: OnboardingTemplate = {
          ...draft,
          id: createId('onboard_template'),
          steps: draft.steps.map((step) => ({ ...step, id: step.id || createId('onboard_step') })),
        };
        onboardingTemplates = [template, ...onboardingTemplates];
        await auditLogService.recordEvent('onboarding.template.created', template.id, audit, `Created onboarding template ${template.name}.`);
        return normalizeTemplate(template);
      },
    );
  },

  async updateTemplate(id: string, patch: Partial<OnboardingTemplateDraft>, audit: AuditMetadata): Promise<OnboardingTemplate | null> {
    return withFallback(
      async () => normalizeTemplate(await portalApiFetch<OnboardingTemplate>(`/onboarding/templates/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })),
      async () => {
        await mockDelay();
        let updated: OnboardingTemplate | null = null;
        onboardingTemplates = onboardingTemplates.map((template) => {
          if (template.id !== id) return template;
          updated = {
            ...template,
            ...patch,
            steps: patch.steps ? patch.steps.map((step) => ({ ...step, id: step.id || createId('onboard_step') })) : template.steps,
          };
          return updated;
        });
        if (updated) {
          const templateName = (updated as OnboardingTemplate).name;
          await auditLogService.recordEvent('onboarding.template.updated', id, audit, `Updated onboarding template ${templateName}.`);
        }
        return updated ? normalizeTemplate(updated) : null;
      },
    );
  },

  async listEmployeeChecklists(): Promise<EmployeeOnboardingChecklist[]> {
    return withFallback(
      async () => {
        const checklists = await portalApiFetch<EmployeeOnboardingChecklist[]>('/onboarding/checklists');
        return checklists.map(normalizeChecklist);
      },
      async () => {
        await mockDelay();
        return employeeChecklists.map(normalizeChecklist);
      },
    );
  },

  async assignTemplate(employeeId: string, templateId: string, audit: AuditMetadata): Promise<EmployeeOnboardingChecklist | null> {
    return withFallback(
      async () => normalizeChecklist(await portalApiFetch<EmployeeOnboardingChecklist>('/onboarding/checklists', {
        method: 'POST',
        body: JSON.stringify({ employeeId, templateId }),
      })),
      async () => {
        await mockDelay();
        const template = onboardingTemplates.find((item) => item.id === templateId);
        if (!template) return null;
        const checklist: EmployeeOnboardingChecklist = {
          id: createId('employee_onboard'),
          employeeId,
          templateId,
          status: 'assigned',
          assignedAt: new Date().toISOString(),
          stepProgress: createInitialProgress(template.steps),
        };
        employeeChecklists = [checklist, ...employeeChecklists];
        await auditLogService.recordEvent('onboarding.assigned', checklist.id, audit, `Assigned template ${template.name} to employee ${employeeId}.`);
        return normalizeChecklist(checklist);
      },
    );
  },

  async updateStepProgress(checklistId: string, stepId: string, status: OnboardingStepProgressStatus, notes: string | undefined, audit: AuditMetadata): Promise<EmployeeOnboardingChecklist | null> {
    return withFallback(
      async () => normalizeChecklist(await portalApiFetch<EmployeeOnboardingChecklist>(`/onboarding/checklists/${checklistId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ stepId, status, notes }),
      })),
      async () => {
        await mockDelay();
        let updated: EmployeeOnboardingChecklist | null = null;
        employeeChecklists = employeeChecklists.map((checklist) => {
          if (checklist.id !== checklistId) return checklist;
          const stepProgress = checklist.stepProgress.map((step) => {
            if (step.stepId !== stepId) return step;
            return { ...step, status, notes, completedAt: status === 'Completed' ? new Date().toISOString() : undefined };
          });
          const checklistStatus = calculateChecklistStatus(stepProgress);
          updated = {
            ...checklist,
            status: checklistStatus,
            completedAt: checklistStatus === 'pending-approval' ? new Date().toISOString() : undefined,
            stepProgress,
          };
          return updated;
        });
        if (updated) {
          await auditLogService.recordEvent('onboarding.step.updated', checklistId, audit, `Updated onboarding step ${stepId} to ${status}.`);
        }
        return updated ? normalizeChecklist(updated) : null;
      },
    );
  },

  async approveChecklist(checklistId: string, approvedBy: string, audit: AuditMetadata): Promise<EmployeeOnboardingChecklist | null> {
    return withFallback(
      async () => normalizeChecklist(await portalApiFetch<EmployeeOnboardingChecklist>(`/onboarding/checklists/${checklistId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ approvedBy }),
      })),
      async () => {
        await mockDelay();
        let updated: EmployeeOnboardingChecklist | null = null;
        employeeChecklists = employeeChecklists.map((checklist) => {
          if (checklist.id !== checklistId) return checklist;
          updated = {
            ...checklist,
            status: 'approved',
            completedAt: checklist.completedAt ?? new Date().toISOString(),
            approvedBy,
            approvedAt: new Date().toISOString(),
          };
          return updated;
        });
        if (updated) {
          await auditLogService.recordEvent('onboarding.approved', checklistId, audit, `Supervisor approval placeholder completed by ${approvedBy}.`);
        }
        return updated ? normalizeChecklist(updated) : null;
      },
    );
  },
};

export const onboardingChecklists = onboardingTemplates;
export const onboardingSteps = onboardingTemplates.flatMap((template) => template.steps.map((step) => ({ ...step, checklistId: template.id, ownerRole: template.targetRole, order: step.sortOrder })));
