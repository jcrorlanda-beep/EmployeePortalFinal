import type { NextFunction, Request, Response } from 'express';
import type { PortalPermission } from '../types/permissions';
import { portalPermissions, rolePermissionMap } from '../types/permissions';

const permissionsForRole = (role?: string) => {
  if (!role) return [] as PortalPermission[];
  return rolePermissionMap[role] ?? rolePermissionMap[role.toUpperCase()] ?? [];
};

export const requirePermission = (permission: PortalPermission) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const role = request.user?.role;
    const permissions = permissionsForRole(role);
    if (permissions.includes(portalPermissions.adminFull) || permissions.includes(permission)) {
      next();
      return;
    }
    next(Object.assign(new Error(`Missing permission: ${permission}`), { status: 403, code: 'FORBIDDEN' }));
  };

export const requirePermissionForMethods = (methods: string[], permission: PortalPermission) => {
  const normalized = new Set(methods.map((method) => method.toUpperCase()));
  const guard = requirePermission(permission);
  return (request: Request, response: Response, next: NextFunction) => {
    if (!normalized.has(request.method.toUpperCase())) {
      next();
      return;
    }
    guard(request, response, next);
  };
};
