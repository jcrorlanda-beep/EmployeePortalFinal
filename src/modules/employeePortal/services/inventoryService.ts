import type { InventoryItem, InventoryMovement } from '../types/inventoryTypes';
export const inventoryItems: InventoryItem[] = [{ id: 'inv_001', sku: 'OIL-FILTER-GEN', name: 'General Oil Filter', quantityOnHand: 24, reorderPoint: 10 }];
export const inventoryMovements: InventoryMovement[] = [{ id: 'move_001', inventoryItemId: 'inv_001', movementType: 'out', quantity: 1, reason: 'MVP service usage sample', createdAt: '2026-05-06T00:00:00.000Z' }];
export const inventoryService = { async listItems() { return inventoryItems; }, async listMovements() { return inventoryMovements; } };
