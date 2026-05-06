export type PayType = 'hourly' | 'salary' | 'contract';
export type PayrollPeriodStatus = 'draft' | 'review';
export type PayslipStatus = 'preview' | 'void';
export type PayrollComponentType = 'earning' | 'deduction' | 'benefit' | 'deposit' | '13th-month-preview';

export interface PayrollProfile {
  id: string;
  employeeId: string;
  payType: PayType;
  baseFormulaCode: string;
  allowanceFormulaCodes: string[];
  deductionFormulaCodes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: PayrollPeriodStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollComponent {
  id: string;
  profileId: string;
  type: PayrollComponentType;
  formulaCode: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayslipLineItem {
  id: string;
  payslipId: string;
  label: string;
  componentType: PayrollComponentType;
  formulaCode: string;
  previewAmount: number | null;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payrollPeriodId: string;
  status: PayslipStatus;
  lineItems: PayslipLineItem[];
  createdAt: string;
}
