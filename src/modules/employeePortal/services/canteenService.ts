import type { CanteenDeductionType, CanteenTransaction, CanteenTransactionStatus, EmployeeDebtLedger } from '../types/canteenTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface CanteenServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: CanteenServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Canteen API is unavailable.';
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

export const getCanteenServiceStatus = () => serviceStatus;

export const canteenService = {
  async listTransactions(): Promise<CanteenTransaction[]> {
    return callApi(() => portalApiFetch<CanteenTransaction[]>('/canteen/transactions'));
  },

  async createTransaction(
    employeeId: string,
    amount: number,
    description: string,
    transactionDate: string,
    deductionType: CanteenDeductionType,
    payrollFormulaCode: string,
    notes?: string,
  ): Promise<CanteenTransaction> {
    return callApi(() =>
      portalApiFetch<CanteenTransaction>('/canteen/transactions', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          amount,
          description,
          transactionDate,
          deductionType,
          payrollFormulaCode,
          notes,
        }),
      }),
    );
  },

  async updateTransaction(id: string, patch: Partial<Omit<CanteenTransaction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CanteenTransaction> {
    return callApi(() =>
      portalApiFetch<CanteenTransaction>(`/canteen/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async recordPayment(id: string, amount?: number, notes?: string): Promise<CanteenTransaction> {
    return callApi(() =>
      portalApiFetch<CanteenTransaction>(`/canteen/transactions/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          notes,
        }),
      }),
    );
  },

  async markPayrollDeduction(id: string, notes?: string): Promise<CanteenTransaction> {
    return callApi(() =>
      portalApiFetch<CanteenTransaction>(`/canteen/transactions/${id}/mark-payroll-deduction`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    );
  },

  async listLedgers(): Promise<EmployeeDebtLedger[]> {
    return callApi(() => portalApiFetch<EmployeeDebtLedger[]>('/canteen/ledger'));
  },
};
