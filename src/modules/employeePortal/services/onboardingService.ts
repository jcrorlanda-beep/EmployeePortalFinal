<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
import type { OnboardingChecklist, OnboardingStep } from '../types/onboardingTypes';
export const onboardingChecklists: OnboardingChecklist[] = [{ id: 'onboard_general', name: 'General Workshop Onboarding', active: true }];
export const onboardingSteps: OnboardingStep[] = [{ id: 'step_tools', checklistId: 'onboard_general', title: 'Issue tool and safety checklist', ownerRole: 'HR Admin', required: true, order: 1 }];
export const onboardingService = { async listChecklists() { return onboardingChecklists; }, async listSteps() { return onboardingSteps; } };
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
import { createId, mockDelay } from './employeePortalApi';

const createInitialProgress = (steps: OnboardingStep[]): OnboardingStepProgress[] =>
  steps.map((step) => ({ stepId: step.id, status: 'Not Started' }));

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

export const onboardingService = {
  async listTemplates(): Promise<OnboardingTemplate[]> {
    await mockDelay();
    return onboardingTemplates.map(sortTemplateSteps);
  },

  async createTemplate(draft: OnboardingTemplateDraft, audit: AuditMetadata): Promise<OnboardingTemplate> {
    await mockDelay();
    const template: OnboardingTemplate = {
      ...draft,
      id: createId('onboard_template'),
      steps: draft.steps.map((step) => ({ ...step, id: step.id || createId('onboard_step') })),
    };
    onboardingTemplates = [template, ...onboardingTemplates];
    await auditLogService.recordEvent('onboarding.template.created', template.id, audit, `Created onboarding template ${template.name}.`);
    return sortTemplateSteps(template);
  },

  async updateTemplate(id: string, patch: Partial<OnboardingTemplateDraft>, audit: AuditMetadata): Promise<OnboardingTemplate | null> {
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
      await auditLogService.recordEvent('onboarding.template.updated', id, audit, `Updated onboarding template ${(updated as OnboardingTemplate).name}.`);
    }
    return updated ? sortTemplateSteps(updated) : null;
  },

  async listEmployeeChecklists(): Promise<EmployeeOnboardingChecklist[]> {
    await mockDelay();
    return [...employeeChecklists];
  },

  async assignTemplate(employeeId: string, templateId: string, audit: AuditMetadata): Promise<EmployeeOnboardingChecklist | null> {
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
    return checklist;
  },

  async updateStepProgress(checklistId: string, stepId: string, status: OnboardingStepProgressStatus, notes: string | undefined, audit: AuditMetadata): Promise<EmployeeOnboardingChecklist | null> {
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
    return updated;
  },

  async approveChecklist(checklistId: string, approvedBy: string, audit: AuditMetadata): Promise<EmployeeOnboardingChecklist | null> {
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
    return updated;
  },
};

export const onboardingChecklists = onboardingTemplates;
export const onboardingSteps = onboardingTemplates.flatMap((template) => template.steps.map((step) => ({ ...step, checklistId: template.id, ownerRole: template.targetRole, order: step.sortOrder })));
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
