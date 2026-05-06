import type { BenefitRule, GovernmentContributionSetting } from '../types/benefitsTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface BenefitsServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: BenefitsServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Benefits API is unavailable.';
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

export const getBenefitsServiceStatus = () => serviceStatus;

export const benefitsService = {
  async listBenefits(): Promise<BenefitRule[]> {
    return callApi(() => portalApiFetch<BenefitRule[]>('/benefits'));
  },

  async createBenefit(input: {
    name: string;
    description: string;
    benefitType: string;
    eligibilityType: string;
    eligibilityRuleCode: string;
    formulaId?: string;
    taxableFlag: boolean;
    effectiveStartDate: string;
    effectiveEndDate?: string;
    status: string;
  }): Promise<BenefitRule> {
    return callApi(() =>
      portalApiFetch<BenefitRule>('/benefits', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
  },

  async updateBenefit(id: string, patch: Partial<Omit<BenefitRule, 'id' | 'createdAt' | 'updatedAt' | 'active'>>): Promise<BenefitRule> {
    return callApi(() =>
      portalApiFetch<BenefitRule>(`/benefits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async deactivateBenefit(id: string): Promise<BenefitRule> {
    return callApi(() =>
      portalApiFetch<BenefitRule>(`/benefits/${id}/deactivate`, {
        method: 'PATCH',
      }),
    );
  },

  async listGovernmentSettings(): Promise<GovernmentContributionSetting[]> {
    return callApi(() => portalApiFetch<GovernmentContributionSetting[]>('/government-contributions'));
  },

  async createGovernmentSetting(input: {
    contributionType: GovernmentContributionSetting['contributionType'];
    name: string;
    description: string;
    ruleType: GovernmentContributionSetting['ruleType'];
    formulaId?: string;
    tableJson?: string;
    effectiveStartDate: string;
    effectiveEndDate?: string;
    status: string;
  }): Promise<GovernmentContributionSetting> {
    return callApi(() =>
      portalApiFetch<GovernmentContributionSetting>('/government-contributions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
  },

  async updateGovernmentSetting(
    id: string,
    patch: Partial<Omit<GovernmentContributionSetting, 'id' | 'createdAt' | 'updatedAt' | 'active'>>,
  ): Promise<GovernmentContributionSetting> {
    return callApi(() =>
      portalApiFetch<GovernmentContributionSetting>(`/government-contributions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async deactivateGovernmentSetting(id: string): Promise<GovernmentContributionSetting> {
    return callApi(() =>
      portalApiFetch<GovernmentContributionSetting>(`/government-contributions/${id}/deactivate`, {
        method: 'PATCH',
      }),
    );
  },
};
