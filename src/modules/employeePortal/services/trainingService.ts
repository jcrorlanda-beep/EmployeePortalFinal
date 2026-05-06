import type { SopDocument, TrainingAssignment, TrainingModule } from '../types/trainingTypes';
export const trainingModules: TrainingModule[] = [{ id: 'training_safety', title: 'Workshop Safety Basics', category: 'Safety', active: true }];
export const trainingAssignments: TrainingAssignment[] = [{ id: 'assign_001', moduleId: 'training_safety', employeeId: 'emp_002', dueDate: '2026-05-20', status: 'assigned' }];
export const sopDocuments: SopDocument[] = [{ id: 'sop_001', title: 'Vehicle Intake SOP', category: 'Operations', version: 'draft-1', owner: 'Service Desk', fileReference: 'future-document-store://vehicle-intake', active: true }];
export const trainingService = { async listTrainingModules() { return trainingModules; }, async listAssignments() { return trainingAssignments; }, async listSopDocuments() { return sopDocuments; } };
