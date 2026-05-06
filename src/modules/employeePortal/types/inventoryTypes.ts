export type MovementType = 'in' | 'out' | 'adjustment';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderPoint: number;
  supplier?: string;
  costPlaceholder?: string;
  photoReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  movementType: MovementType;
  quantity: number;
  reason: string;
  createdAt: string;
  updatedAt?: string;
}
