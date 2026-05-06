export const requiresConfiguredFormula = (formulaCode?: string) => Boolean(formulaCode && formulaCode.includes('CONFIGURED'));
export const payrollFormulaSafetyChecklist = ['No hardcoded statutory rates', 'No payroll finalization', 'All components reference formula codes', 'Preview calculations require configured evaluator'];
