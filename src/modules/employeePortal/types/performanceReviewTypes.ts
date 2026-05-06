export interface PerformanceReviewTemplate { id: string; name: string; items: string[]; active: boolean; }
export interface PerformanceReviewItem { id: string; reviewId: string; label: string; score: number; notes?: string; }
export interface PerformanceReview { id: string; employeeId: string; templateId: string; reviewMonth: string; status: 'draft' | 'submitted' | 'acknowledged'; items: PerformanceReviewItem[]; }
