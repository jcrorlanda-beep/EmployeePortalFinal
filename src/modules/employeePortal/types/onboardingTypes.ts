export type OnboardingTemplateStatus = 'active' | 'inactive';
export type EmployeeOnboardingStatus = 'assigned' | 'in-progress' | 'pending-approval' | 'approved';
export type OnboardingStepProgressStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Skipped';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  category: string;
  required: boolean;
  estimatedMinutes: number;
  sortOrder: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  targetRole: string;
  targetDepartmentId?: string;
  steps: OnboardingStep[];
  status: OnboardingTemplateStatus;
}

export interface OnboardingStepProgress {
  stepId: string;
  status: OnboardingStepProgressStatus;
  completedAt?: string;
  notes?: string;
}

export interface EmployeeOnboardingChecklist {
  id: string;
  employeeId: string;
  templateId: string;
  status: EmployeeOnboardingStatus;
  assignedAt: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  stepProgress: OnboardingStepProgress[];
}

export type OnboardingTemplateDraft = Omit<OnboardingTemplate, 'id'>;
