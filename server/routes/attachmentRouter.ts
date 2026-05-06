import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requirePermission, requirePermissionForMethods } from '../middleware/permissions';
import {
  archiveAttachment,
  createAttachment,
  listAttachments,
  updateAttachment,
} from '../services/attachmentPersistenceService';
import { portalPermissions } from '../types/permissions';

export const attachmentRouter = Router();

attachmentRouter.use(
  '/api/employee-portal/attachments',
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.adminFull),
);

const attachmentSchema = z.object({
  module: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  referenceKey: z.string().min(1),
  uploadedBy: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  fileUrl: z.string().optional(),
  referenceUrl: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const attachmentUpdateSchema = attachmentSchema.partial().omit({
  module: true,
  entityType: true,
  entityId: true,
  referenceKey: true,
  uploadedBy: true,
});

attachmentRouter.get(
  '/api/employee-portal/attachments',
  requireAuth,
  requirePermission(portalPermissions.auditView),
  async (request, response, next) => {
    try {
      const attachments = await listAttachments({
        module: typeof request.query.module === 'string' ? request.query.module : undefined,
        entityType: typeof request.query.entityType === 'string' ? request.query.entityType : undefined,
        entityId: typeof request.query.entityId === 'string' ? request.query.entityId : undefined,
        status: typeof request.query.status === 'string' ? request.query.status : undefined,
      });

      response.json({ success: true, data: attachments });
    } catch (error) {
      next(error);
    }
  },
);

attachmentRouter.post('/api/employee-portal/attachments', requireAuth, async (request, response, next) => {
  try {
    const parsed = attachmentSchema.safeParse(request.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const attachment = await createAttachment({
      request,
      ...parsed.data,
    });

    response.status(201).json({ success: true, data: attachment });
  } catch (error) {
    next(error);
  }
});

attachmentRouter.patch('/api/employee-portal/attachments/:id', requireAuth, async (request, response, next) => {
  try {
    const parsed = attachmentUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const attachment = await updateAttachment(request, String(request.params.id), parsed.data);
    response.json({ success: true, data: attachment });
  } catch (error) {
    next(error);
  }
});

attachmentRouter.patch('/api/employee-portal/attachments/:id/archive', requireAuth, async (request, response, next) => {
  try {
    const attachment = await archiveAttachment(request, String(request.params.id));
    response.json({ success: true, data: attachment });
  } catch (error) {
    next(error);
  }
});
