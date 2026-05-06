import type { EmployeePortalModuleDefinition } from './employeePortalConstants';

const rolePermissions: Record<string, string[]> = {
  ADMIN: ['admin.full', 'audit.view'],
  role_admin: ['admin.full', 'audit.view'],
  HR_MANAGER: ['employees.manage', 'onboarding.manage', 'training.manage', 'sop.manage', 'reviews.manage', 'audit.view', 'roles.manage'],
  role_hr_manager: ['employees.manage', 'onboarding.manage', 'training.manage', 'sop.manage', 'reviews.manage', 'audit.view', 'roles.manage'],
  BRANCH_MANAGER: ['schedules.manage', 'leave.approve', 'payroll.manage', 'reviews.manage', 'audit.view'],
  role_branch_manager: ['schedules.manage', 'leave.approve', 'payroll.manage', 'reviews.manage', 'audit.view'],
  role_supervisor: ['schedules.manage', 'leave.approve', 'timekeeping.manage'],
  role_service_advisor: ['training.manage', 'sop.manage'],
  role_chief_mechanic: ['equipment.manage', 'inventory.manage', 'training.manage'],
  role_senior_mechanic: ['equipment.manage', 'training.manage'],
  role_general_mechanic: ['training.manage'],
  role_cashier: ['payroll.manage', 'canteen.manage'],
  role_canteen_staff: ['canteen.manage'],
  role_inventory_staff: ['inventory.manage', 'equipment.manage'],
};

const modulePermissionMap: Partial<Record<EmployeePortalModuleDefinition['key'], string>> = {
  employees: 'employees.manage',
  departments: 'employees.manage',
  positions: 'roles.manage',
  onboarding: 'onboarding.manage',
  training: 'training.manage',
  sops: 'sop.manage',
  timekeeping: 'timekeeping.manage',
  timesheets: 'timekeeping.manage',
  scheduling: 'schedules.manage',
  leave: 'leave.approve',
  swaps: 'schedules.manage',
  payroll: 'payroll.manage',
  formulas: 'payroll.manage',
  benefits: 'benefits.manage',
  government: 'benefits.manage',
  payslips: 'payroll.manage',
  toolDeposits: 'equipment.manage',
  equipment: 'equipment.manage',
  inventory: 'inventory.manage',
  discipline: 'discipline.manage',
  canteen: 'canteen.manage',
  reviews: 'reviews.manage',
  auditLogs: 'audit.view',
};

export const getPermissionsForRole = (role?: string) =>
  role ? rolePermissions[role] ?? rolePermissions[role.toUpperCase()] ?? [] : [];

export const canAccessModule = (role: string | undefined, moduleKey: EmployeePortalModuleDefinition['key']) => {
  const requiredPermission = modulePermissionMap[moduleKey];
  if (!requiredPermission) return true;
  const permissions = getPermissionsForRole(role);
  return permissions.includes('admin.full') || permissions.includes(requiredPermission);
};
