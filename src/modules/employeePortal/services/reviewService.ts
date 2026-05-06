import type {
  PerformanceReview,
  PerformanceReviewTemplate,
  ReviewStatus,
  ReviewTemplateItem,
} from '../types/performanceReviewTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface ReviewServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: ReviewServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Review API is unavailable.';
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

export const getReviewServiceStatus = () => serviceStatus;

export const reviewService = {
  async listTemplates(): Promise<PerformanceReviewTemplate[]> {
    return callApi(() => portalApiFetch<PerformanceReviewTemplate[]>('/reviews/templates'));
  },

  async createTemplate(name: string, items: ReviewTemplateItem[]): Promise<PerformanceReviewTemplate> {
    return callApi(() =>
      portalApiFetch<PerformanceReviewTemplate>('/reviews/templates', {
        method: 'POST',
        body: JSON.stringify({ name, items, active: true }),
      }),
    );
  },

  async updateTemplate(id: string, patch: Partial<Omit<PerformanceReviewTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PerformanceReviewTemplate> {
    return callApi(() =>
      portalApiFetch<PerformanceReviewTemplate>(`/reviews/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async listReviews(): Promise<PerformanceReview[]> {
    return callApi(() => portalApiFetch<PerformanceReview[]>('/reviews'));
  },

  async createReview(employeeId: string, templateId: string, reviewMonth: string): Promise<PerformanceReview> {
    return callApi(() =>
      portalApiFetch<PerformanceReview>('/reviews', {
        method: 'POST',
        body: JSON.stringify({ employeeId, templateId, reviewMonth, status: 'draft' }),
      }),
    );
  },

  async updateReviewItemScore(reviewId: string, itemId: string, score: number, notes?: string, expectedUpdatedAt?: string): Promise<PerformanceReview> {
    return callApi(() =>
      portalApiFetch<PerformanceReview>(`/reviews/${reviewId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ score, notes, expectedUpdatedAt }),
      }),
    );
  },

  async updateReviewStatus(id: string, status: ReviewStatus, expectedUpdatedAt?: string): Promise<PerformanceReview> {
    return callApi(() =>
      portalApiFetch<PerformanceReview>(`/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, expectedUpdatedAt }),
      }),
    );
  },
};
