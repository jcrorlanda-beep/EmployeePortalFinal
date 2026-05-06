import type { Department, Employee, EmployeeDraft, EmployeeRole, Position } from '../types/employeeTypes';
import type { AuditMetadata } from '../types/auditTypes';
import { createId, mockDelay } from './employeePortalApi';

let employees: Employee[] = [
  { id: 'emp_001', employeeNumber: 'NCCC-001', firstName: 'Maria', lastName: 'Santos', departmentId: 'dept_service', positionId: 'pos_service_advisor', status: 'active', hireDate: '2026-01-08', email: 'maria@nccc.example' },
  { id: 'emp_002', employeeNumber: 'NCCC-002', firstName: 'Jose', lastName: 'Reyes', departmentId: 'dept_shop', positionId: 'pos_technician', status: 'probation', hireDate: '2026-03-18' },
];
let departments: Department[] = [
  { id: 'dept_service', name: 'Service Desk', managerName: 'Ana Cruz', active: true },
  { id: 'dept_shop', name: 'Workshop', managerName: 'Ben Ramos', active: true },
];
let positions: Position[] = [
  { id: 'pos_service_advisor', title: 'Service Advisor', departmentId: 'dept_service', level: 'L2', active: true },
  { id: 'pos_technician', title: 'Automotive Technician', departmentId: 'dept_shop', level: 'L2', active: true },
];
export const roles: EmployeeRole[] = [
  { id: 'role_hr_admin', name: 'HR Admin', description: 'Manages employee portal records.', permissions: ['employee:write', 'audit:read'] },
  { id: 'role_manager', name: 'Department Manager', description: 'Reviews attendance, schedules, and performance.', permissions: ['schedule:approve', 'review:write'] },
];
export const employeeService = {
  async listEmployees() { await mockDelay(); return employees; },
  async createEmployee(draft: EmployeeDraft, _audit: AuditMetadata) { const employee = { ...draft, id: createId('emp') }; employees = [employee, ...employees]; return employee; },
  async updateEmployee(id: string, patch: Partial<EmployeeDraft>, _audit: AuditMetadata) { employees = employees.map((employee) => employee.id === id ? { ...employee, ...patch } : employee); return employees.find((employee) => employee.id === id) ?? null; },
  async listDepartments() { await mockDelay(); return departments; },
  async createDepartment(draft: Omit<Department, 'id'>, _audit: AuditMetadata) { const department = { ...draft, id: createId('dept') }; departments = [department, ...departments]; return department; },
  async listPositions() { await mockDelay(); return positions; },
  async createPosition(draft: Omit<Position, 'id'>, _audit: AuditMetadata) { const position = { ...draft, id: createId('pos') }; positions = [position, ...positions]; return position; },
  async listRoles() { await mockDelay(); return roles; },
};
