export interface PayrollProfile { id: string; employeeId: string; payType: 'hourly' | 'salary' | 'contract'; baseFormulaCode: string; allowanceFormulaCodes: string[]; deductionFormulaCodes: string[]; active: boolean; }
export interface PayrollPeriod { id: string; name: string; startsOn: string; endsOn: string; status: 'draft' | 'review'; }
export interface PayrollComponent { id: string; profileId: string; type: 'earning' | 'deduction' | 'benefit' | 'deposit' | '13th-month-preview'; formulaCode: string; label: string; }
export interface PayslipLineItem { id: string; payslipId: string; label: string; componentType: PayrollComponent['type']; formulaCode: string; previewAmount: number | null; }
export interface Payslip { id: string; employeeId: string; payrollPeriodId: string; status: 'preview' | 'void'; lineItems: PayslipLineItem[]; }
