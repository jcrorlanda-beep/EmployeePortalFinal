import type {
  FormulaComponentType,
  FormulaEvaluationInput,
  FormulaEvaluationResult,
  PayrollFormula,
} from '../types/formulaTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface FormulaServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: FormulaServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Formula API is unavailable.';
  serviceStatus = { available: false, message };
};

const callApi = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    const result = await run();
    markAvailable();
    return result;
  } catch (error) {
    if (error instanceof PortalApiError) {
      markUnavailable(error);
    }
    throw error;
  }
};

export const getFormulaServiceStatus = () => serviceStatus;

export const formulaService = {
  async listFormulas(): Promise<PayrollFormula[]> {
    return callApi(() => portalApiFetch<PayrollFormula[]>('/formulas'));
  },

  async createFormula(
    code: string,
    name: string,
    expression: string,
    variables: string[],
    componentType: FormulaComponentType,
    taxable: boolean,
    effectiveDate: string,
  ): Promise<PayrollFormula> {
    return callApi(() =>
      portalApiFetch<PayrollFormula>('/formulas', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          expression: expression.trim(),
          variables,
          componentType,
          taxable,
          effectiveDate,
          active: true,
        }),
      }),
    );
  },

  async updateFormula(id: string, patch: Partial<Omit<PayrollFormula, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PayrollFormula> {
    return callApi(() =>
      portalApiFetch<PayrollFormula>(`/formulas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async toggleActive(id: string, active: boolean): Promise<PayrollFormula> {
    return this.updateFormula(id, { active });
  },

  async previewFormula(input: FormulaEvaluationInput): Promise<FormulaEvaluationResult> {
    return callApi(() =>
      portalApiFetch<FormulaEvaluationResult>('/formulas/preview', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
  },
};
