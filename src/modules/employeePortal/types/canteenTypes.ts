export interface CanteenTransaction { id: string; employeeId: string; amount: number; transactionDate: string; payrollFormulaCode: string; status: 'open' | 'deducted' | 'void'; }
export interface EmployeeDebtLedger { id: string; employeeId: string; source: 'canteen' | 'tool-deposit' | 'other'; balance: number; formulaCode: string; }
