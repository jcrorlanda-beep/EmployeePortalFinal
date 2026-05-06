export type ReviewStatus = 'draft' | 'submitted' | 'employee-acknowledged' | 'hr-approved';

export interface ReviewTemplateItem {
  label: string;
  weight: number;
  maxScore: number;
}

export interface PerformanceReviewTemplate {
  id: string;
  name: string;
  items: ReviewTemplateItem[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceReviewItem {
  id: string;
  reviewId: string;
  label: string;
  weight: number;
  score: number;
  maxScore: number;
  notes?: string;
  updatedAt?: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  templateId: string;
  reviewMonth: string;
  supervisorNotes?: string;
  status: ReviewStatus;
  items: PerformanceReviewItem[];
  employeeAcknowledgedAt?: string;
  hrApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
}
