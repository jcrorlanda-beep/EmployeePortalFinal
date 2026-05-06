import type { AuditMetadata } from '../types/auditTypes';
import type {
  Department,
  DepartmentDraft,
  Employee,
  EmployeeDraft,
  EmployeeRole,
  EmployeeRoleDraft,
  PermissionGroup,
  Position,
  PositionDraft,
} from '../types/employeeTypes';
import { createId, mockDelay } from './employeePortalApi';
import { auditLogService } from './auditLogService';

export const permissionGroups: PermissionGroup[] = [
  { code: 'employees.view', label: 'View Employees', description: 'View employee profile and assignment records.' },
  { code: 'employees.manage', label: 'Manage Employees', description: 'Create and update employee profile records.' },
  { code: 'onboarding.manage', label: 'Manage Onboarding', description: 'Configure onboarding checklists and assignments.' },
  { code: 'training.manage', label: 'Manage Training', description: 'Configure learning modules and assignments.' },
  { code: 'timekeeping.view', label: 'View Timekeeping', description: 'View attendance and clock records.' },
  { code: 'timekeeping.manage', label: 'Manage Timekeeping', description: 'Review and correct attendance records.' },
  { code: 'schedules.manage', label: 'Manage Schedules', description: 'Create and update employee schedules.' },
  { code: 'leave.approve', label: 'Approve Leave', description: 'Review and approve leave requests.' },
  { code: 'payroll.view', label: 'View Payroll', description: 'View payroll preparation records and previews.' },
  { code: 'payroll.manage', label: 'Manage Payroll', description: 'Prepare payroll profiles and periods without finalization.' },
  { code: 'formulas.manage', label: 'Manage Formulas', description: 'Configure formula records for payroll and deductions.' },
  { code: 'benefits.manage', label: 'Manage Benefits', description: 'Configure benefit and contribution setup records.' },
  { code: 'equipment.manage', label: 'Manage Equipment', description: 'Manage tools, equipment, and assignment records.' },
  { code: 'inventory.manage', label: 'Manage Inventory', description: 'Manage inventory items and movement logs.' },
  { code: 'discipline.manage', label: 'Manage Discipline', description: 'Manage write-ups, warnings, and categories.' },
  { code: 'canteen.manage', label: 'Manage Canteen', description: 'Manage canteen debt and deduction tracking.' },
  { code: 'reviews.manage', label: 'Manage Reviews', description: 'Manage monthly review templates and records.' },
  { code: 'audit.view', label: 'View Audit Logs', description: 'View audit log records.' },
  { code: 'admin.full', label: 'Full Admin', description: 'Administrative setup foundation; not auth enforcement.' },
];

let employees: Employee[] = [
  {
    id: 'emp_001',
    employeeNumber: 'NCCC-001',
    firstName: 'Maria',
    lastName: 'Santos',
    preferredName: 'Maria',
    departmentId: 'dept_service',
    positionId: 'pos_service_advisor',
    role: 'role_branch_manager',
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
    role: 'role_general_mechanic',
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
  { id: 'dept_service', code: 'SRV', name: 'Service Desk', description: 'Customer intake, service advising, estimates, and release coordination.', managerEmployeeId: 'emp_001', status: 'active', sortOrder: 10 },
  { id: 'dept_shop', code: 'SHOP', name: 'Workshop', description: 'Mechanical diagnosis, repair work, quality checks, and bay coordination.', managerEmployeeId: 'emp_002', status: 'active', sortOrder: 20 },
];

let roles: EmployeeRole[] = [
  { id: 'role_admin', code: 'ADMIN', name: 'Admin', description: 'Portal administration foundation for trusted operators.', permissions: ['admin.full', 'audit.view'], status: 'active' },
  { id: 'role_hr_manager', code: 'HR_MANAGER', name: 'HR Manager', description: 'Manages HR records, onboarding, training, and reviews.', permissions: ['employees.view', 'employees.manage', 'onboarding.manage', 'training.manage', 'reviews.manage', 'audit.view'], status: 'active' },
  { id: 'role_branch_manager', code: 'BRANCH_MANAGER', name: 'Branch Manager', description: 'Oversees branch workforce, schedules, leave, payroll preview, and operations.', permissions: ['employees.view', 'timekeeping.view', 'schedules.manage', 'leave.approve', 'payroll.view', 'reviews.manage', 'audit.view'], status: 'active' },
  { id: 'role_supervisor', code: 'SUPERVISOR', name: 'Supervisor', description: 'Supervises daily operations and team schedules.', permissions: ['employees.view', 'timekeeping.view', 'schedules.manage', 'leave.approve'], status: 'active' },
  { id: 'role_service_advisor', code: 'SERVICE_ADVISOR', name: 'Service Advisor', description: 'Supports service desk operations and customer workflow.', permissions: ['employees.view', 'training.manage'], status: 'active' },
  { id: 'role_chief_mechanic', code: 'CHIEF_MECHANIC', name: 'Chief Mechanic', description: 'Leads workshop quality, tools, and technical team coordination.', permissions: ['employees.view', 'equipment.manage', 'inventory.manage', 'training.manage'], status: 'active' },
  { id: 'role_senior_mechanic', code: 'SENIOR_MECHANIC', name: 'Senior Mechanic', description: 'Senior workshop technician role foundation.', permissions: ['employees.view', 'equipment.manage', 'training.manage'], status: 'active' },
  { id: 'role_general_mechanic', code: 'GENERAL_MECHANIC', name: 'General Mechanic', description: 'General workshop technician role foundation.', permissions: ['employees.view', 'training.manage'], status: 'active' },
  { id: 'role_ojt', code: 'OJT', name: 'OJT', description: 'On-the-job trainee role foundation.', permissions: ['employees.view', 'training.manage'], status: 'active' },
  { id: 'role_cashier', code: 'CASHIER', name: 'Cashier', description: 'Cashier role foundation for payroll and canteen-adjacent records.', permissions: ['payroll.view', 'canteen.manage'], status: 'active' },
  { id: 'role_canteen_staff', code: 'CANTEEN_STAFF', name: 'Canteen Staff', description: 'Canteen transaction and debt tracking role foundation.', permissions: ['canteen.manage'], status: 'active' },
  { id: 'role_inventory_staff', code: 'INVENTORY_STAFF', name: 'Inventory Staff', description: 'Inventory and stock movement management role foundation.', permissions: ['inventory.manage', 'equipment.manage'], status: 'active' },
  { id: 'role_employee', code: 'EMPLOYEE', name: 'Employee', description: 'Employee self-service foundation for future portal access.', permissions: ['employees.view', 'training.manage'], status: 'active' },
];

let positions: Position[] = [
  { id: 'pos_service_advisor', code: 'SA', title: 'Service Advisor', departmentId: 'dept_service', description: 'Coordinates customer intake, estimates, and service updates.', defaultRole: 'role_service_advisor', status: 'active' },
  { id: 'pos_technician', code: 'TECH', title: 'Automotive Technician', departmentId: 'dept_shop', description: 'Performs inspection, repair, and maintenance work.', defaultRole: 'role_general_mechanic', status: 'active' },
];

const sortByName = <T extends { name?: string; title?: string; employeeNumber?: string; sortOrder?: number }>(records: T[]) =>
  [...records].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || (a.name ?? a.title ?? a.employeeNumber ?? '').localeCompare(b.name ?? b.title ?? b.employeeNumber ?? ''));

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
    await auditLogService.recordEvent('department.created', department.id, audit, `Created department ${department.code} - ${department.name}.`);
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
      await auditLogService.recordEvent('department.updated', id, audit, `Updated department ${(updated as Department).code} - ${(updated as Department).name}.`);
    }
    return updated;
  },

  async deactivateDepartment(id: string, audit: AuditMetadata): Promise<Department | null> {
    await mockDelay();
    let updated: Department | null = null;
    departments = departments.map((department) => {
      if (department.id !== id) return department;
      updated = { ...department, status: 'inactive' };
      return updated;
    });
    if (updated) {
      await auditLogService.recordEvent('department.deactivated', id, audit, `Deactivated department ${(updated as Department).code}.`);
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
    await auditLogService.recordEvent('position.created', position.id, audit, `Created position ${position.code} - ${position.title}.`);
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
      await auditLogService.recordEvent('position.updated', id, audit, `Updated position ${(updated as Position).code} - ${(updated as Position).title}.`);
    }
    return updated;
  },

  async deactivatePosition(id: string, audit: AuditMetadata): Promise<Position | null> {
    await mockDelay();
    let updated: Position | null = null;
    positions = positions.map((position) => {
      if (position.id !== id) return position;
      updated = { ...position, status: 'inactive' };
      return updated;
    });
    if (updated) {
      await auditLogService.recordEvent('position.deactivated', id, audit, `Deactivated position ${(updated as Position).code}.`);
    }
    return updated;
  },

  async listRoles(): Promise<EmployeeRole[]> {
    await mockDelay();
    return sortByName(roles);
  },

  async createRole(draft: EmployeeRoleDraft, audit: AuditMetadata): Promise<EmployeeRole> {
    await mockDelay();
    const role = { ...draft, id: createId('role') };
    roles = [role, ...roles];
    await auditLogService.recordEvent('role.created', role.id, audit, `Created role ${role.code} - ${role.name}.`);
    return role;
  },

  async updateRole(id: string, patch: Partial<EmployeeRoleDraft>, audit: AuditMetadata): Promise<EmployeeRole | null> {
    await mockDelay();
    let updated: EmployeeRole | null = null;
    roles = roles.map((role) => {
      if (role.id !== id) return role;
      updated = { ...role, ...patch };
      return updated;
    });
    if (updated) {
      await auditLogService.recordEvent('role.updated', id, audit, `Updated role ${(updated as EmployeeRole).code} - ${(updated as EmployeeRole).name}.`);
    }
    return updated;
  },

  async updateRolePermissions(id: string, permissions: string[], audit: AuditMetadata): Promise<EmployeeRole | null> {
    await mockDelay();
    let updated: EmployeeRole | null = null;
    roles = roles.map((role) => {
      if (role.id !== id) return role;
      updated = { ...role, permissions };
      return updated;
    });
    if (updated) {
      await auditLogService.recordEvent('role.permissions.updated', id, audit, `Updated permissions for role ${(updated as EmployeeRole).code}.`);
    }
    return updated;
  },

  async listPermissionGroups(): Promise<PermissionGroup[]> {
    await mockDelay();
    return [...permissionGroups];
  },
};
