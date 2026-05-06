export type EmploymentStatus = 'active' | 'onboarding' | 'probation' | 'inactive';
export type SetupStatus = 'active' | 'inactive';

export interface Department {
  id: string;
  name: string;
  description: string;
  status: SetupStatus;
}

export interface Position {
  id: string;
  title: string;
  departmentId?: string;
  description: string;
  status: SetupStatus;
}

export interface EmployeeRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
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
