export type ToolDepositStatus = 'active' | 'refunded' | 'forfeited' | 'waived';
export type EquipmentStatus = 'available' | 'assigned' | 'maintenance' | 'retired';
export type DamageStatus = 'none' | 'minor' | 'major' | 'lost';

export interface ToolDeposit {
  id: string;
  employeeId: string;
  equipmentItemId?: string;
  description: string;
  amountFormulaCode: string;
  initialAmount: number;
  balance: number;
  refundable: boolean;
  status: ToolDepositStatus;
  payrollFormulaCode?: string;
  notes?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentItem {
  id: string;
  assetTag: string;
  name: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  category: string;
  condition: 'new' | 'good' | 'fair' | 'poor';
  location?: string;
  photoReference?: string;
  serialNumberPhotoReference?: string;
  damagePhotoReference?: string;
  status: EquipmentStatus;
  assignedEmployeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentAssignment {
  id: string;
  employeeId: string;
  equipmentItemId: string;
  toolDepositId?: string;
  assignedOn: string;
  returnedOn?: string;
  conditionNotes?: string;
  damageStatus: DamageStatus;
  photoProofReference?: string;
  createdAt: string;
  updatedAt?: string;
}
