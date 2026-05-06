import type { BenefitRule, GovernmentContributionSetting } from '../types/benefitsTypes';
export const benefitRules: BenefitRule[] = [{ id: 'benefit_001', name: 'Configured Allowance Benefit', eligibilityFormulaCode: 'BENEFIT_ELIGIBILITY_CONFIGURED', amountFormulaCode: 'BENEFIT_AMOUNT_CONFIGURED', active: true }];
export const governmentContributionSettings: GovernmentContributionSetting[] = [{ id: 'gov_001', agencyName: 'Configurable PH Agency Placeholder', employeeFormulaCode: 'EMPLOYEE_CONTRIBUTION_CONFIGURED', employerFormulaCode: 'EMPLOYER_CONTRIBUTION_CONFIGURED', effectiveDate: '2026-05-06', active: false }];
export const benefitsService = { async listBenefits() { return benefitRules; }, async listGovernmentSettings() { return governmentContributionSettings; } };
