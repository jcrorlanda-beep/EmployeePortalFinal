export interface TrainingModule { id: string; title: string; category: string; sopDocumentId?: string; active: boolean; }
export interface TrainingAssignment { id: string; moduleId: string; employeeId: string; dueDate: string; status: 'assigned' | 'in-progress' | 'completed'; }
export interface SopDocument { id: string; title: string; category: string; version: string; owner: string; fileReference: string; active: boolean; }
