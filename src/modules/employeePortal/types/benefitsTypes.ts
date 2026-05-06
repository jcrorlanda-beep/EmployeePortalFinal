export interface BenefitRule {
  id: string;
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
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentContributionSetting {
  id: string;
  contributionType: 'SSS' | 'PhilHealth' | 'PagIBIG' | 'BIR';
  name: string;
  description: string;
  ruleType: 'Formula' | 'Table' | 'Bracket' | 'Manual';
  formulaId?: string;
  tableJson?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  status: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
