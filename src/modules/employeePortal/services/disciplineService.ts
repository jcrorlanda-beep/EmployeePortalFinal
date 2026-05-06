import type { DisciplineCategory, DisciplineRecord } from '../types/disciplineTypes';
export const disciplineCategories: DisciplineCategory[] = [{ id: 'cat_attendance', name: 'Attendance', active: true }];
export const disciplineRecords: DisciplineRecord[] = [{ id: 'disc_001', employeeId: 'emp_002', categoryId: 'cat_attendance', incidentDate: '2026-05-03', summary: 'Draft warning record sample.', status: 'draft' }];
export const disciplineService = { async listCategories() { return disciplineCategories; }, async listRecords() { return disciplineRecords; } };
