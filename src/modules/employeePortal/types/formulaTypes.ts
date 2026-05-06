export type FormulaComponentType = 'earning' | 'deduction' | 'benefit' | 'contribution' | 'deposit';

export interface PayrollFormula {
  id: string;
  code: string;
  name: string;
  expression: string;
  variables: string[];
  componentType: FormulaComponentType;
  taxable: boolean;
  effectiveDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormulaEvaluationInput {
  formulaCode: string;
  variables: Record<string, number>;
}

export interface FormulaEvaluationResult {
  formulaCode: string;
  previewAmount: number | null;
  warnings: string[];
}
