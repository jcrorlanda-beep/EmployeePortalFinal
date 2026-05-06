import type { FormulaEvaluationInput, FormulaEvaluationResult, PayrollFormula } from '../types/formulaTypes';
export const payrollFormulas: PayrollFormula[] = [
  { id: 'formula_base_pay', code: 'BASE_PAY_CONFIGURED', name: 'Base Pay Configured Formula', expression: 'configured_rate * approved_units', variables: ['configured_rate', 'approved_units'], active: true },
  { id: 'formula_deduction', code: 'CONFIGURED_DEDUCTION', name: 'Configured Deduction Formula', expression: 'configured_amount', variables: ['configured_amount'], active: true },
];
export const formulaService = { async listFormulas() { return payrollFormulas; }, async previewFormula(input: FormulaEvaluationInput): Promise<FormulaEvaluationResult> { return { formulaCode: input.formulaCode, previewAmount: null, warnings: ['MVP does not execute arbitrary formulas; implementation must use a safe evaluator.'] }; } };
