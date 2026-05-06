import type {
  DamageStatus,
  EquipmentAssignment,
  EquipmentItem,
  ToolDeposit,
  ToolDepositStatus,
} from '../types/equipmentTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface EquipmentServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: EquipmentServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Equipment API is unavailable.';
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

export const getEquipmentServiceStatus = () => serviceStatus;

export const equipmentService = {
  async listEquipment(): Promise<EquipmentItem[]> {
    return callApi(() => portalApiFetch<EquipmentItem[]>('/equipment/items'));
  },

  async createEquipmentItem(
    assetTag: string,
    name: string,
    category: string,
    condition: EquipmentItem['condition'],
    opts?: Partial<
      Pick<
        EquipmentItem,
        | 'serialNumber'
        | 'brand'
        | 'model'
        | 'location'
        | 'photoReference'
        | 'serialNumberPhotoReference'
        | 'damagePhotoReference'
      >
    >,
  ): Promise<EquipmentItem> {
    return callApi(() =>
      portalApiFetch<EquipmentItem>('/equipment/items', {
        method: 'POST',
        body: JSON.stringify({
          assetTag,
          name,
          category,
          condition,
          status: 'available',
          ...opts,
        }),
      }),
    );
  },

  async updateEquipmentItem(id: string, patch: Partial<Omit<EquipmentItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<EquipmentItem> {
    return callApi(() =>
      portalApiFetch<EquipmentItem>(`/equipment/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async listAssignments(): Promise<EquipmentAssignment[]> {
    return callApi(() => portalApiFetch<EquipmentAssignment[]>('/equipment/assignments'));
  },

  async assignEquipment(
    employeeId: string,
    equipmentItemId: string,
    conditionNotes?: string,
    toolDepositId?: string,
  ): Promise<EquipmentAssignment> {
    return callApi(() =>
      portalApiFetch<EquipmentAssignment>('/equipment/assignments', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          equipmentItemId,
          toolDepositId,
          assignedOn: new Date().toISOString().slice(0, 10),
          conditionNotes,
        }),
      }),
    );
  },

  async returnEquipment(id: string, damageStatus: DamageStatus, conditionNotes?: string): Promise<EquipmentAssignment> {
    return callApi(() =>
      portalApiFetch<EquipmentAssignment>(`/equipment/assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          returnedOn: new Date().toISOString().slice(0, 10),
          damageStatus,
          conditionNotes,
        }),
      }),
    );
  },

  async listToolDeposits(): Promise<ToolDeposit[]> {
    return callApi(() => portalApiFetch<ToolDeposit[]>('/equipment/tool-deposits'));
  },

  async createToolDeposit(
    employeeId: string,
    description: string,
    amountFormulaCode: string,
    initialAmount: number,
    refundable: boolean,
    opts?: Partial<Pick<ToolDeposit, 'equipmentItemId' | 'payrollFormulaCode' | 'notes'>>,
  ): Promise<ToolDeposit> {
    return callApi(() =>
      portalApiFetch<ToolDeposit>('/equipment/tool-deposits', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          equipmentItemId: opts?.equipmentItemId,
          description,
          amountFormulaCode,
          initialAmount,
          balance: initialAmount,
          refundable,
          payrollFormulaCode: opts?.payrollFormulaCode ?? amountFormulaCode,
          notes: opts?.notes,
          status: 'active',
        }),
      }),
    );
  },

  async updateDepositStatus(id: string, status: ToolDepositStatus): Promise<ToolDeposit> {
    if (status === 'refunded') {
      return callApi(() =>
        portalApiFetch<ToolDeposit>(`/equipment/tool-deposits/${id}/refund`, {
          method: 'POST',
        }),
      );
    }
    if (status === 'forfeited') {
      return callApi(() =>
        portalApiFetch<ToolDeposit>(`/equipment/tool-deposits/${id}/forfeit`, {
          method: 'POST',
        }),
      );
    }
    return callApi(() =>
      portalApiFetch<ToolDeposit>(`/equipment/tool-deposits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          balance: status === 'waived' ? 0 : undefined,
        }),
      }),
    );
  },
};
