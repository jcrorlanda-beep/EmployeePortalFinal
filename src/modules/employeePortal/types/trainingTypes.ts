export type TrainingLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Specialist';
export type TrainingContentType = 'SOP' | 'Video' | 'Checklist' | 'Quiz' | 'Hands-On' | 'External Link';
export type TrainingModuleStatus = 'Draft' | 'Active' | 'Archived';
export type TrainingAssignmentStatus = 'Assigned' | 'In Progress' | 'Completed' | 'Failed' | 'Waived';

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  level: TrainingLevel;
  targetRole?: string;
  estimatedMinutes: number;
  contentType: TrainingContentType;
  contentReference?: string;
  status: TrainingModuleStatus;
  certificationEligible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingAssignment {
  id: string;
  employeeId: string;
  trainingModuleId: string;
  status: TrainingAssignmentStatus;
  assignedAt: string;
  dueDate?: string;
  completedAt?: string;
  score?: number;
  supervisorNotes?: string;
  certificationIssued: boolean;
}

export type TrainingModuleDraft = Omit<TrainingModule, 'id' | 'createdAt' | 'updatedAt'>;

export interface TrainingAssignmentDraft {
  employeeId: string;
  trainingModuleId: string;
  dueDate?: string;
  supervisorNotes?: string;
}

export interface TrainingProgressUpdate {
  status: TrainingAssignmentStatus;
  score?: number;
  supervisorNotes?: string;
  certificationIssued?: boolean;
}

export type { SopDocument } from './sopTypes';
