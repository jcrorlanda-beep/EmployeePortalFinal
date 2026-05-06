import type { EquipmentAssignment, EquipmentItem, ToolDeposit } from '../types/equipmentTypes';
export const equipmentItems: EquipmentItem[] = [{ id: 'eq_001', assetTag: 'NCCC-TOOL-001', name: 'Diagnostic Scanner', category: 'Diagnostic', photoReference: 'future-media-store://scanner-photo', status: 'assigned' }];
export const equipmentAssignments: EquipmentAssignment[] = [{ id: 'assign_eq_001', employeeId: 'emp_002', equipmentItemId: 'eq_001', toolDepositId: 'deposit_001', assignedOn: '2026-05-01' }];
export const toolDeposits: ToolDeposit[] = [{ id: 'deposit_001', employeeId: 'emp_002', equipmentItemId: 'eq_001', amountFormulaCode: 'CONFIGURED_TOOL_DEPOSIT', balance: 0, status: 'active' }];
export const equipmentService = { async listEquipment() { return equipmentItems; }, async listAssignments() { return equipmentAssignments; }, async listToolDeposits() { return toolDeposits; } };
