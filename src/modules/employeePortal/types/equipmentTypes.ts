export interface ToolDeposit { id: string; employeeId: string; equipmentItemId?: string; amountFormulaCode: string; balance: number; status: 'active' | 'refunded' | 'waived'; }
export interface EquipmentItem { id: string; assetTag: string; name: string; category: string; photoReference?: string; status: 'available' | 'assigned' | 'maintenance' | 'retired'; }
export interface EquipmentAssignment { id: string; employeeId: string; equipmentItemId: string; toolDepositId?: string; assignedOn: string; returnedOn?: string; }
