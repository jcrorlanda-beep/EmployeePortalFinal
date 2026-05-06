import { prisma } from '../prisma/client';
import { writeAuditLog } from './auditService';

const safeParseJson = (value: string) => {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);

export interface BenefitMetadata {
  description: string;
  benefitType: string;
  eligibilityType: string;
  eligibilityRuleCode?: string;
  formulaId?: string;
  taxableFlag: boolean;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  status: string;
}

export interface GovernmentContributionMetadata {
  contributionType: string;
  description: string;
  ruleType: string;
  formulaId?: string;
  tableJson?: string;
  effectiveEndDate?: string;
  status: string;
}

const defaultBenefitMetadata = (): BenefitMetadata => ({
  description: '',
  benefitType: 'Allowance',
  eligibilityType: 'Formula',
  taxableFlag: false,
  effectiveStartDate: new Date().toISOString().slice(0, 10),
  status: 'active',
});

const defaultGovernmentMetadata = (): GovernmentContributionMetadata => ({
  contributionType: 'SSS',
  description: '',
  ruleType: 'Formula',
  status: 'active',
});

export const parseBenefitMetadata = (eligibilityFormulaCode: string, amountFormulaCode: string): BenefitMetadata => {
  const eligibilityPayload = safeParseJson(eligibilityFormulaCode);
  const amountPayload = safeParseJson(amountFormulaCode);

  if (!eligibilityPayload && !amountPayload) {
    return {
      ...defaultBenefitMetadata(),
      eligibilityRuleCode: eligibilityFormulaCode,
      formulaId: amountFormulaCode,
    };
  }

  return {
    ...defaultBenefitMetadata(),
    description: typeof amountPayload?.description === 'string' ? amountPayload.description : '',
    benefitType: typeof amountPayload?.benefitType === 'string' ? amountPayload.benefitType : 'Allowance',
    eligibilityType: typeof eligibilityPayload?.eligibilityType === 'string' ? eligibilityPayload.eligibilityType : 'Formula',
    eligibilityRuleCode:
      typeof eligibilityPayload?.eligibilityRuleCode === 'string'
        ? eligibilityPayload.eligibilityRuleCode
        : (!eligibilityPayload && eligibilityFormulaCode ? eligibilityFormulaCode : undefined),
    formulaId:
      typeof amountPayload?.formulaId === 'string'
        ? amountPayload.formulaId
        : (!amountPayload && amountFormulaCode ? amountFormulaCode : undefined),
    taxableFlag: Boolean(amountPayload?.taxableFlag),
    effectiveStartDate: isIsoDate(amountPayload?.effectiveStartDate) ? amountPayload.effectiveStartDate : defaultBenefitMetadata().effectiveStartDate,
    effectiveEndDate: isIsoDate(amountPayload?.effectiveEndDate) ? amountPayload.effectiveEndDate : undefined,
    status: typeof amountPayload?.status === 'string' ? amountPayload.status : 'active',
  };
};

export const serializeBenefitEligibility = (input: { eligibilityType: string; eligibilityRuleCode?: string }) =>
  JSON.stringify({
    eligibilityType: input.eligibilityType,
    eligibilityRuleCode: input.eligibilityRuleCode ?? '',
  });

export const serializeBenefitAmount = (input: Omit<BenefitMetadata, 'eligibilityType' | 'eligibilityRuleCode'>) =>
  JSON.stringify({
    description: input.description,
    benefitType: input.benefitType,
    formulaId: input.formulaId ?? '',
    taxableFlag: input.taxableFlag,
    effectiveStartDate: input.effectiveStartDate,
    effectiveEndDate: input.effectiveEndDate ?? '',
    status: input.status,
  });

export const mapBenefitRule = (rule: {
  id: string;
  name: string;
  eligibilityFormulaCode: string;
  amountFormulaCode: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => {
  const meta = parseBenefitMetadata(rule.eligibilityFormulaCode, rule.amountFormulaCode);
  return {
    id: rule.id,
    name: rule.name,
    description: meta.description,
    benefitType: meta.benefitType,
    eligibilityType: meta.eligibilityType,
    eligibilityRuleCode: meta.eligibilityRuleCode ?? '',
    formulaId: meta.formulaId ?? '',
    taxableFlag: meta.taxableFlag,
    effectiveStartDate: meta.effectiveStartDate,
    effectiveEndDate: meta.effectiveEndDate,
    status: meta.status,
    active: rule.active,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
};

export const parseGovernmentMetadata = (employeeFormulaCode: string, employerFormulaCode: string): GovernmentContributionMetadata => {
  const meta = safeParseJson(employerFormulaCode);
  return {
    ...defaultGovernmentMetadata(),
    contributionType: typeof meta?.contributionType === 'string' ? meta.contributionType : 'SSS',
    description: typeof meta?.description === 'string' ? meta.description : '',
    ruleType: typeof meta?.ruleType === 'string' ? meta.ruleType : 'Formula',
    formulaId: typeof meta?.formulaId === 'string' ? meta.formulaId : employeeFormulaCode,
    tableJson: typeof meta?.tableJson === 'string' ? meta.tableJson : undefined,
    effectiveEndDate: isIsoDate(meta?.effectiveEndDate) ? meta.effectiveEndDate : undefined,
    status: typeof meta?.status === 'string' ? meta.status : 'active',
  };
};

export const serializeGovernmentMetadata = (input: GovernmentContributionMetadata) =>
  JSON.stringify({
    contributionType: input.contributionType,
    description: input.description,
    ruleType: input.ruleType,
    formulaId: input.formulaId ?? '',
    tableJson: input.tableJson ?? '',
    effectiveEndDate: input.effectiveEndDate ?? '',
    status: input.status,
  });

export const mapGovernmentContribution = (setting: {
  id: string;
  agencyName: string;
  employeeFormulaCode: string;
  employerFormulaCode: string;
  effectiveDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => {
  const meta = parseGovernmentMetadata(setting.employeeFormulaCode, setting.employerFormulaCode);
  return {
    id: setting.id,
    contributionType: meta.contributionType,
    name: setting.agencyName,
    description: meta.description,
    ruleType: meta.ruleType,
    formulaId: meta.formulaId ?? '',
    tableJson: meta.tableJson,
    effectiveStartDate: setting.effectiveDate.toISOString().slice(0, 10),
    effectiveEndDate: meta.effectiveEndDate,
    status: meta.status,
    active: setting.active,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
};

export const recordBenefitsAudit = async (input: {
  module: string;
  action: string;
  actor: string;
  entityId: string;
  summary: string;
  beforePayload?: unknown;
  afterPayload?: unknown;
}) =>
  writeAuditLog({
    module: input.module,
    action: input.action,
    actor: input.actor,
    entityId: input.entityId,
    summary: input.summary,
    beforePayload: input.beforePayload,
    afterPayload: input.afterPayload,
  });

export { prisma };
