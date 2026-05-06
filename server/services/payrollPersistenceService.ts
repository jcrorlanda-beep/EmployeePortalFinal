import { prisma } from '../prisma/client';
import { writeAuditLog } from './auditService';

const toDate = (value: Date | null | undefined) => value?.toISOString().slice(0, 10);
const toNumber = (value: number | { toNumber: () => number }) =>
  typeof value === 'number' ? value : value.toNumber();

export const mapPayrollProfile = (profile: {
  id: string;
  employeeId: string;
  payType: string;
  baseFormulaCode: string;
  allowanceFormulaCodes: unknown;
  deductionFormulaCodes: unknown;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: profile.id,
  employeeId: profile.employeeId,
  payType: profile.payType,
  baseFormulaCode: profile.baseFormulaCode,
  allowanceFormulaCodes: Array.isArray(profile.allowanceFormulaCodes) ? profile.allowanceFormulaCodes.filter((item): item is string => typeof item === 'string') : [],
  deductionFormulaCodes: Array.isArray(profile.deductionFormulaCodes) ? profile.deductionFormulaCodes.filter((item): item is string => typeof item === 'string') : [],
  active: profile.active,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});

export const mapPayrollPeriod = (period: {
  id: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: period.id,
  name: period.name,
  startsOn: toDate(period.startsOn) ?? '',
  endsOn: toDate(period.endsOn) ?? '',
  status: period.status,
  createdAt: period.createdAt.toISOString(),
  updatedAt: period.updatedAt.toISOString(),
});

export const mapPayrollComponent = (component: {
  id: string;
  profileId: string;
  type: string;
  formulaCode: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: component.id,
  profileId: component.profileId,
  type: component.type,
  formulaCode: component.formulaCode,
  label: component.label,
  createdAt: component.createdAt.toISOString(),
  updatedAt: component.updatedAt.toISOString(),
});

export interface FormulaMetadata {
  names: string[];
  componentType: string;
  taxable: boolean;
  effectiveDate: string;
}

const defaultFormulaMetadata = (): FormulaMetadata => ({
  names: [],
  componentType: 'earning',
  taxable: false,
  effectiveDate: new Date().toISOString().slice(0, 10),
});

export const parseFormulaVariablesPayload = (value: unknown): FormulaMetadata => {
  if (Array.isArray(value)) {
    return {
      ...defaultFormulaMetadata(),
      names: value.filter((entry): entry is string => typeof entry === 'string'),
    };
  }

  if (!value || typeof value !== 'object') {
    return defaultFormulaMetadata();
  }

  const record = value as Record<string, unknown>;
  const names = Array.isArray(record.names)
    ? record.names.filter((entry): entry is string => typeof entry === 'string')
    : Array.isArray(record.variables)
      ? record.variables.filter((entry): entry is string => typeof entry === 'string')
      : [];

  const meta = record.meta && typeof record.meta === 'object' ? (record.meta as Record<string, unknown>) : {};
  return {
    names,
    componentType: typeof meta.componentType === 'string' ? meta.componentType : 'earning',
    taxable: Boolean(meta.taxable),
    effectiveDate: typeof meta.effectiveDate === 'string' ? meta.effectiveDate : defaultFormulaMetadata().effectiveDate,
  };
};

export const serializeFormulaVariablesPayload = (input: FormulaMetadata) => ({
  names: input.names,
  meta: {
    componentType: input.componentType,
    taxable: input.taxable,
    effectiveDate: input.effectiveDate,
  },
});

export const mapPayrollFormula = (formula: {
  id: string;
  code: string;
  name: string;
  expression: string;
  variables: unknown;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => {
  const parsed = parseFormulaVariablesPayload(formula.variables);
  return {
    id: formula.id,
    code: formula.code,
    name: formula.name,
    expression: formula.expression,
    variables: parsed.names,
    componentType: parsed.componentType,
    taxable: parsed.taxable,
    effectiveDate: parsed.effectiveDate,
    active: formula.active,
    createdAt: formula.createdAt.toISOString(),
    updatedAt: formula.updatedAt.toISOString(),
  };
};

export const recordPayrollAudit = async (input: {
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

export const toDecimalNumber = toNumber;
export { prisma };
