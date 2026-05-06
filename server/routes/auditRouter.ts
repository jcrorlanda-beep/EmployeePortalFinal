import { Router } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { portalPermissions } from '../types/permissions';
import { ok } from '../utils/response';

export const auditRouter = Router();

auditRouter.get(
  '/api/employee-portal/audit-logs',
  requireAuth,
  requirePermission(portalPermissions.auditView),
  async (request, response, next) => {
    try {
      const module = typeof request.query.module === 'string' ? request.query.module : undefined;
      const action = typeof request.query.action === 'string' ? request.query.action : undefined;
      const employee = typeof request.query.employee === 'string' ? request.query.employee : undefined;
      const dateFrom = typeof request.query.dateFrom === 'string' ? request.query.dateFrom : undefined;
      const dateTo = typeof request.query.dateTo === 'string' ? request.query.dateTo : undefined;

      const logs = await prisma.auditLogEntry.findMany({
        where: {
          module,
          action,
          entityId: employee,
          createdAt: dateFrom || dateTo ? {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined,
          } : undefined,
        },
        orderBy: { createdAt: 'desc' },
      });

      ok(response, logs);
    } catch (error) {
      next(error);
    }
  },
);
