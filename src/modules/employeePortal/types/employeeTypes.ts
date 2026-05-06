export type EmploymentStatus = 'active' | 'onboarding' | 'probation' | 'inactive';
export type SetupStatus = 'active' | 'inactive';

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  managerEmployeeId?: string;
  status: SetupStatus;
  sortOrder?: number;
}

export interface Position {
  id: string;
  code: string;
  title: string;
  departmentId?: string;
  description: string;
  defaultRole: string;
  status: SetupStatus;
}

export interface PermissionGroup {
  code: string;
  label: string;
  description: string;
}

export interface EmployeeRole {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions: string[];
  status: SetupStatus;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  departmentId?: string;
  positionId?: string;
  role: string;
  employmentStatus: EmploymentStatus;
  hireDate: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export type EmployeeDraft = Omit<Employee, 'id'>;
export type DepartmentDraft = Omit<Department, 'id'>;
export type PositionDraft = Omit<Position, 'id'>;
export type EmployeeRoleDraft = Omit<EmployeeRole, 'id'>;
