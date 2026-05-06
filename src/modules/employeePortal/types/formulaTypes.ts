export interface PayrollFormula { id: string; code: string; name: string; expression: string; variables: string[]; active: boolean; }
export interface FormulaEvaluationInput { formulaCode: string; variables: Record<string, number>; }
export interface FormulaEvaluationResult { formulaCode: string; previewAmount: number | null; warnings: string[]; }
