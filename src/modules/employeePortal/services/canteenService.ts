import type { CanteenTransaction, EmployeeDebtLedger } from '../types/canteenTypes';
export const canteenTransactions: CanteenTransaction[] = [{ id: 'canteen_001', employeeId: 'emp_001', amount: 0, transactionDate: '2026-05-06', payrollFormulaCode: 'CONFIGURED_CANTEEN_DEDUCTION', status: 'open' }];
export const employeeDebtLedgers: EmployeeDebtLedger[] = [{ id: 'ledger_001', employeeId: 'emp_001', source: 'canteen', balance: 0, formulaCode: 'CONFIGURED_CANTEEN_DEDUCTION' }];
export const canteenService = { async listTransactions() { return canteenTransactions; }, async listLedgers() { return employeeDebtLedgers; } };
