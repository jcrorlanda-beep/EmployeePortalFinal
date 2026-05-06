import type { PayrollPeriod, PayrollProfile, Payslip } from '../types/payrollTypes';
export const payrollProfiles: PayrollProfile[] = [{ id: 'profile_001', employeeId: 'emp_001', payType: 'salary', baseFormulaCode: 'BASE_PAY_CONFIGURED', allowanceFormulaCodes: [], deductionFormulaCodes: ['CONFIGURED_DEDUCTION'], active: true }];
export const payrollPeriods: PayrollPeriod[] = [{ id: 'period_2026_05', name: 'May 2026 Draft', startsOn: '2026-05-01', endsOn: '2026-05-31', status: 'draft' }];
export const payslips: Payslip[] = [{ id: 'payslip_preview_001', employeeId: 'emp_001', payrollPeriodId: 'period_2026_05', status: 'preview', lineItems: [] }];
export const payrollService = { async listProfiles() { return payrollProfiles; }, async listPeriods() { return payrollPeriods; }, async listPayslips() { return payslips; } };
