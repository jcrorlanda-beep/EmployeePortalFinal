export type CanteenDeductionType = 'cash' | 'salary-deduction';
export type CanteenTransactionStatus = 'open' | 'partially-paid' | 'paid' | 'deducted' | 'void';

export interface CanteenTransaction {
  id: string;
  employeeId: string;
  amount: number;
  description: string;
  transactionDate: string;
  deductionType: CanteenDeductionType;
  payrollFormulaCode: string;
  status: CanteenTransactionStatus;
  settledAmount?: number;
  notes?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployeeDebtLedger {
  id: string;
  employeeId: string;
  source: 'canteen' | 'tool-deposit' | 'other';
  balance: number;
  formulaCode: string;
  notes?: string;
  lastUpdatedAt: string;
  createdAt?: string;
  updatedAt?: string;
}
