import type { PerformanceReview, PerformanceReviewTemplate } from '../types/performanceReviewTypes';
export const reviewTemplates: PerformanceReviewTemplate[] = [{ id: 'review_template_001', name: 'Monthly Performance Review', items: ['Quality', 'Attendance', 'Teamwork'], active: true }];
export const performanceReviews: PerformanceReview[] = [{ id: 'review_001', employeeId: 'emp_001', templateId: 'review_template_001', reviewMonth: '2026-05', status: 'draft', items: [] }];
export const reviewService = { async listTemplates() { return reviewTemplates; }, async listReviews() { return performanceReviews; } };
