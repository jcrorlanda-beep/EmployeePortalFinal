import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { listExpandedAuditLogs } from '../services/auditPersistenceService';
import { portalPermissions } from '../types/permissions';

export const auditRouter = Router();

auditRouter.get(
  '/api/employee-portal/audit-logs',
  requireAuth,
  requirePermission(portalPermissions.auditView),
  async (request, response, next) => {
    try {
      const result = await listExpandedAuditLogs({
        module: typeof request.query.module === 'string' ? request.query.module : undefined,
        action: typeof request.query.action === 'string' ? request.query.action : undefined,
        entityType: typeof request.query.entityType === 'string' ? request.query.entityType : undefined,
        entityId: typeof request.query.entityId === 'string' ? request.query.entityId : undefined,
        actorUserId: typeof request.query.actorUserId === 'string' ? request.query.actorUserId : undefined,
        dateFrom: typeof request.query.dateFrom === 'string' ? request.query.dateFrom : undefined,
        dateTo: typeof request.query.dateTo === 'string' ? request.query.dateTo : undefined,
        page: typeof request.query.page === 'string' ? Number(request.query.page) : undefined,
        pageSize: typeof request.query.pageSize === 'string' ? Number(request.query.pageSize) : undefined,
      });

      response.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);
