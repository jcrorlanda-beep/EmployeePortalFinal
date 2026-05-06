import type { InventoryItem, InventoryMovement, MovementType } from '../types/inventoryTypes';
import { PortalApiError, portalApiFetch } from './employeePortalApi';

interface InventoryServiceStatus {
  available: boolean;
  message?: string;
}

let serviceStatus: InventoryServiceStatus = { available: true };

const markAvailable = () => {
  serviceStatus = { available: true };
};

const markUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Inventory API is unavailable.';
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

export const getInventoryServiceStatus = () => serviceStatus;

export const inventoryService = {
  async listItems(): Promise<InventoryItem[]> {
    return callApi(() => portalApiFetch<InventoryItem[]>('/inventory/items'));
  },

  async createItem(
    sku: string,
    name: string,
    unit: string,
    quantityOnHand: number,
    reorderPoint: number,
    opts?: Partial<Pick<InventoryItem, 'supplier' | 'costPlaceholder' | 'photoReference'>>,
  ): Promise<InventoryItem> {
    return callApi(() =>
      portalApiFetch<InventoryItem>('/inventory/items', {
        method: 'POST',
        body: JSON.stringify({
          sku,
          name,
          unit,
          quantityOnHand,
          reorderPoint,
          supplier: opts?.supplier,
          costPlaceholder: opts?.costPlaceholder,
          photoReference: opts?.photoReference,
        }),
      }),
    );
  },

  async updateItem(id: string, patch: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<InventoryItem> {
    return callApi(() =>
      portalApiFetch<InventoryItem>(`/inventory/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    );
  },

  async listMovements(): Promise<InventoryMovement[]> {
    return callApi(() => portalApiFetch<InventoryMovement[]>('/inventory/movements'));
  },

  async recordMovement(
    inventoryItemId: string,
    movementType: MovementType,
    quantity: number,
    reason: string,
  ): Promise<InventoryMovement> {
    return callApi(() =>
      portalApiFetch<InventoryMovement>('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          inventoryItemId,
          movementType,
          quantity,
          reason,
        }),
      }),
    );
  },
};
