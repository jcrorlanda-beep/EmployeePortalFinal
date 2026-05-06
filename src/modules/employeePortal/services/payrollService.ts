import type {
  PayrollComponent,
  PayrollPeriod,
  PayrollPeriodStatus,
  PayrollProfile,
  Payslip,
  PayslipLineItem,
  PayType,
} from '../types/payrollTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface PayrollServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: PayrollServiceStatus = { available: true };
const now = () => new Date().toISOString();

let payslips: Payslip[] = [
  {
    id: 'payslip_preview_001',
    employeeId: 'emp_001',
    payrollPeriodId: 'period_2026_05',
    status: 'preview',
    lineItems: [],
    createdAt: '2026-05-06T00:00:00.000Z',
  },
];

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Payroll API is unavailable.';
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

export const getPayrollServiceStatus = () => serviceStatus;

export const payrollService = {
  async listProfiles(): Promise<PayrollProfile[]> {
    return callApi(() => portalApiFetch<PayrollProfile[]>('/payroll/profiles'));
  },

  async createProfile(employeeId: string, payType: PayType, baseFormulaCode: string): Promise<PayrollProfile> {
    return callApi(() =>
      portalApiFetch<PayrollProfile>('/payroll/profiles', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          payType,
          baseFormulaCode,
          allowanceFormulaCodes: [],
          deductionFormulaCodes: [],
          active: true,
        }),
      }),
    );
  },

  async updateProfile(id: string, patch: Partial<Omit<PayrollProfile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PayrollProfile> {
    return callApi(() =>
      portalApiFetch<PayrollProfile>(`/payroll/profiles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async listPeriods(): Promise<PayrollPeriod[]> {
    return callApi(() => portalApiFetch<PayrollPeriod[]>('/payroll/periods'));
  },

  async createPeriod(name: string, startsOn: string, endsOn: string): Promise<PayrollPeriod> {
    return callApi(() =>
      portalApiFetch<PayrollPeriod>('/payroll/periods', {
        method: 'POST',
        body: JSON.stringify({ name, startsOn, endsOn, status: 'draft' }),
      }),
    );
  },

  async updatePeriodStatus(id: string, status: PayrollPeriodStatus): Promise<PayrollPeriod> {
    return callApi(() =>
      portalApiFetch<PayrollPeriod>(`/payroll/periods/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    );
  },

  async listComponents(): Promise<PayrollComponent[]> {
    return callApi(() => portalApiFetch<PayrollComponent[]>('/payroll/components'));
  },

  async createComponent(profileId: string, type: PayrollComponent['type'], formulaCode: string, label: string): Promise<PayrollComponent> {
    return callApi(() =>
      portalApiFetch<PayrollComponent>('/payroll/components', {
        method: 'POST',
        body: JSON.stringify({ profileId, type, formulaCode, label }),
      }),
    );
  },

  async updateComponent(id: string, patch: Partial<Omit<PayrollComponent, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PayrollComponent> {
    return callApi(() =>
      portalApiFetch<PayrollComponent>(`/payroll/components/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async listPayslips(): Promise<Payslip[]> {
    return [...payslips].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createPayslip(employeeId: string, payrollPeriodId: string): Promise<Payslip> {
    const payslip: Payslip = {
      id: `payslip_${Math.random().toString(36).slice(2, 9)}`,
      employeeId,
      payrollPeriodId,
      status: 'preview',
      lineItems: [],
      createdAt: now(),
    };
    payslips = [payslip, ...payslips];
    return payslip;
  },

  async addLineItem(payslipId: string, label: string, componentType: PayslipLineItem['componentType'], formulaCode: string): Promise<Payslip | null> {
    let updated: Payslip | null = null;
    payslips = payslips.map((payslip) => {
      if (payslip.id !== payslipId) return payslip;
      const lineItem: PayslipLineItem = {
        id: `li_${Math.random().toString(36).slice(2, 9)}`,
        payslipId,
        label,
        componentType,
        formulaCode,
        previewAmount: null,
      };
      updated = { ...payslip, lineItems: [...payslip.lineItems, lineItem] };
      return updated;
    });
    return updated;
  },
};
