export interface DisciplineCategory { id: string; name: string; active: boolean; }
export interface DisciplineRecord { id: string; employeeId: string; categoryId: string; incidentDate: string; summary: string; status: 'draft' | 'issued' | 'acknowledged'; }
