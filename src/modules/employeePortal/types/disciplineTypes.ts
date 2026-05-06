export type DisciplineSeverity = 'verbal' | 'written-warning' | 'final-warning' | 'suspension-notice' | 'termination-notice';
export type DisciplineRecordStatus = 'draft' | 'issued' | 'acknowledged' | 'hr-reviewed';

export interface DisciplineCategory {
  id: string;
  name: string;
  defaultSeverity: DisciplineSeverity;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineRecord {
  id: string;
  employeeId: string;
  categoryId: string;
  severity: DisciplineSeverity;
  incidentDate: string;
  summary: string;
  correctiveAction?: string;
  status: DisciplineRecordStatus;
  employeeAcknowledgedAt?: string;
  hrReviewedAt?: string;
  attachmentReference?: string;
  createdAt: string;
  updatedAt: string;
}
