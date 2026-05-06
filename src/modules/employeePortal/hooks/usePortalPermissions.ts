import { useMemo } from 'react';
import { canAccessModule, getPermissionsForRole, hasPermission, isAdminRole, type PortalPermission } from '../utils/portalAccess';
import { useEmployeePortalSession } from './useEmployeePortalSession';
import type { EmployeePortalModuleKey } from '../utils/employeePortalConstants';

const moduleAccessMessages: Partial<Record<EmployeePortalModuleKey, string>> = {
  auditLogs: 'Your current portal role cannot view audit logs yet.',
  positions: 'Only users with position and role administration access can open this module.',
  payroll: 'This payroll preparation area is limited to authorized payroll operators.',
};

export function usePortalPermissions() {
  const { authState, currentUser } = useEmployeePortalSession();

  const permissions = useMemo(
    () => getPermissionsForRole(currentUser?.role),
    [currentUser?.role],
  );

  const hasModuleAccess = (moduleKey: EmployeePortalModuleKey) => authState === 'authenticated' && canAccessModule(currentUser?.role, moduleKey);
  const hasPortalPermission = (permission: PortalPermission) => hasPermission(permissions, permission);
  const explainModuleAccess = (moduleKey: EmployeePortalModuleKey) => moduleAccessMessages[moduleKey] ?? 'Your current portal role does not include access to this module yet.';

  return {
    permissions,
    hasModuleAccess,
    hasPortalPermission,
    explainModuleAccess,
    isAdmin: isAdminRole(currentUser?.role),
  };
}
