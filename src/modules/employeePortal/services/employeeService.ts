import type { AuditMetadata } from '../types/auditTypes';
import type { Department, DepartmentDraft, Employee, EmployeeDraft, EmployeeRole, Position, PositionDraft } from '../types/employeeTypes';
import { createId, mockDelay } from './employeePortalApi';
import { auditLogService } from './auditLogService';

let employees: Employee[] = [
  {
    id: 'emp_001',
    employeeNumber: 'NCCC-001',
    firstName: 'Maria',
    lastName: 'Santos',
    preferredName: 'Maria',
    departmentId: 'dept_service',
    positionId: 'pos_service_advisor',
    role: 'role_manager',
    employmentStatus: 'active',
    hireDate: '2026-01-08',
    phone: '+63 900 000 0001',
    email: 'maria@nccc.example',
    emergencyContactName: 'Luis Santos',
    emergencyContactPhone: '+63 900 000 0101',
    notes: 'Service desk lead for MVP sample data.',
  },
  {
    id: 'emp_002',
    employeeNumber: 'NCCC-002',
    firstName: 'Jose',
    lastName: 'Reyes',
    preferredName: 'Joey',
    departmentId: 'dept_shop',
    positionId: 'pos_technician',
    role: 'role_employee',
    employmentStatus: 'probation',
    hireDate: '2026-03-18',
    phone: '+63 900 000 0002',
    email: 'jose@nccc.example',
    emergencyContactName: 'Elena Reyes',
    emergencyContactPhone: '+63 900 000 0202',
    notes: 'Probationary technician sample record.',
  },
];

let departments: Department[] = [
  { id: 'dept_service', name: 'Service Desk', description: 'Customer intake, service advising, estimates, and release coordination.', status: 'active' },
  { id: 'dept_shop', name: 'Workshop', description: 'Mechanical diagnosis, repair work, quality checks, and bay coordination.', status: 'active' },
];

let positions: Position[] = [
  { id: 'pos_service_advisor', title: 'Service Advisor', departmentId: 'dept_service', description: 'Coordinates customer intake, estimates, and service updates.', status: 'active' },
  { id: 'pos_technician', title: 'Automotive Technician', departmentId: 'dept_shop', description: 'Performs inspection, repair, and maintenance work.', status: 'active' },
];

export const roles: EmployeeRole[] = [
  { id: 'role_hr_admin', name: 'HR Admin', description: 'Manages employee portal records.', permissions: ['employee:write', 'audit:read'] },
  { id: 'role_manager', name: 'Department Manager', description: 'Reviews attendance, schedules, and performance.', permissions: ['schedule:approve', 'review:write'] },
  { id: 'role_employee', name: 'Employee', description: 'Employee self-service foundation for future portal access.', permissions: ['profile:read'] },
];

const sortByName = <T extends { name?: string; title?: string; employeeNumber?: string }>(records: T[]) =>
  [...records].sort((a, b) => (a.name ?? a.title ?? a.employeeNumber ?? '').localeCompare(b.name ?? b.title ?? b.employeeNumber ?? ''));

export const employeeService = {
  async listEmployees(): Promise<Employee[]> {
    await mockDelay();
    return [...employees];
  },

  async createEmployee(draft: EmployeeDraft, audit: AuditMetadata): Promise<Employee> {
    await mockDelay();
    const employee = { ...draft, id: createId('emp') };
    employees = [employee, ...employees];
    await auditLogService.recordEvent('employee.created', employee.id, audit, `Created employee ${employee.employeeNumber} (${employee.firstName} ${employee.lastName}).`);
    return employee;
  },

  async updateEmployee(id: string, patch: Partial<EmployeeDraft>, audit: AuditMetadata): Promise<Employee | null> {
    await mockDelay();
    let updated: Employee | null = null;
    employees = employees.map((employee) => {
      if (employee.id !== id) return employee;
      updated = { ...employee, ...patch };
      return updated;
    });
    if (updated) {
      await auditLogService.recordEvent('employee.updated', id, audit, `Updated employee ${(updated as Employee).employeeNumber}.`);
    }
    return updated;
  },

  async listDepartments(): Promise<Department[]> {
    await mockDelay();
    return sortByName(departments);
  },

  async createDepartment(draft: DepartmentDraft, audit: AuditMetadata): Promise<Department> {
    await mockDelay();
    const department = { ...draft, id: createId('dept') };
    departments = [department, ...departments];
    await auditLogService.recordEvent('department.created', department.id, audit, `Created department ${department.name}.`);
    return department;
  },

  async updateDepartment(id: string, patch: Partial<DepartmentDraft>, audit: AuditMetadata): Promise<Department | null> {
    await mockDelay();
    let updated: Department | null = null;
    departments = departments.map((department) => {
      if (department.id !== id) return department;
      updated = { ...department, ...patch };
      return updated;
    });
    if (updated) {
      await auditLogService.recordEvent('department.updated', id, audit, `Updated department ${(updated as Department).name}.`);
    }
    return updated;
  },

  async listPositions(): Promise<Position[]> {
    await mockDelay();
    return sortByName(positions);
  },

  async createPosition(draft: PositionDraft, audit: AuditMetadata): Promise<Position> {
    await mockDelay();
    const position = { ...draft, id: createId('pos') };
    positions = [position, ...positions];
    await auditLogService.recordEvent('position.created', position.id, audit, `Created position ${position.title}.`);
    return position;
  },

  async updatePosition(id: string, patch: Partial<PositionDraft>, audit: AuditMetadata): Promise<Position | null> {
    await mockDelay();
    let updated: Position | null = null;
    positions = positions.map((position) => {
      if (position.id !== id) return position;
      updated = { ...position, ...patch };
      return updated;
    });
    if (updated) {
      await auditLogService.recordEvent('position.updated', id, audit, `Updated position ${(updated as Position).title}.`);
    }
    return updated;
  },

  async listRoles(): Promise<EmployeeRole[]> {
    await mockDelay();
    return [...roles];
  },
};
