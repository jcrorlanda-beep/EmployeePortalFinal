export type EmploymentStatus = 'active' | 'onboarding' | 'probation' | 'inactive';
export interface Department { id: string; name: string; managerName?: string; notes?: string; active: boolean; }
export interface Position { id: string; title: string; departmentId: string; level: string; active: boolean; }
export interface EmployeeRole { id: string; name: string; description: string; permissions: string[]; }
export interface Employee { id: string; employeeNumber: string; firstName: string; lastName: string; departmentId: string; positionId: string; status: EmploymentStatus; hireDate: string; email?: string; emergencyContact?: string; }
export type EmployeeDraft = Omit<Employee, 'id'>;
