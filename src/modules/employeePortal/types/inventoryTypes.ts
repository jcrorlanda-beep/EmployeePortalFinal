export interface InventoryItem { id: string; sku: string; name: string; quantityOnHand: number; reorderPoint: number; }
export interface InventoryMovement { id: string; inventoryItemId: string; movementType: 'in' | 'out' | 'adjustment'; quantity: number; reason: string; createdAt: string; }
