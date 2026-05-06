import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { syncAttachmentReference } from '../services/attachmentPersistenceService';
import { portalPermissions } from '../types/permissions';

export const sopRouter = Router();

sopRouter.use('/api/employee-portal/sops', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.sopManage), auditWrites('SOP'));

const sopSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  documentType: z.string().optional(),
  version: z.string().min(1),
  owner: z.string().min(1),
  fileReference: z.string().min(1),
  acknowledgementRequired: z.boolean().optional(),
  status: z.string().optional(),
  effectiveDate: z.string().optional(),
  active: z.boolean().optional(),
});

const sopUpdateSchema = sopSchema.partial();

const acknowledgeSchema = z.object({
  employeeId: z.string().min(1),
  notes: z.string().optional(),
});

// GET /api/employee-portal/sops
sopRouter.get('/api/employee-portal/sops', requireAuth, async (_req, res, next) => {
  try {
    const sops = await prisma.sopDocument.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: sops });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/sops
sopRouter.post('/api/employee-portal/sops', requireAuth, async (req, res, next) => {
  try {
    const parsed = sopSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { effectiveDate, ...rest } = parsed.data;
    const sop = await prisma.sopDocument.create({
      data: { ...rest, effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined },
    });
    await syncAttachmentReference({
      request: req,
      module: 'SOP',
      entityType: 'sop_document',
      entityId: sop.id,
      referenceKey: 'sop-document',
      referenceUrl: sop.fileReference,
      description: `Reference document for SOP ${sop.title}.`,
    });
    res.status(201).json({ success: true, data: sop });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employee-portal/sops/:id
sopRouter.patch('/api/employee-portal/sops/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = sopUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { effectiveDate, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (effectiveDate) data.effectiveDate = new Date(effectiveDate);

    const sop = await prisma.sopDocument.update({
      where: { id: String(req.params.id) },
      data,
    });
    await syncAttachmentReference({
      request: req,
      module: 'SOP',
      entityType: 'sop_document',
      entityId: sop.id,
      referenceKey: 'sop-document',
      referenceUrl: sop.fileReference,
      description: `Reference document for SOP ${sop.title}.`,
    });
    res.json({ success: true, data: sop });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employee-portal/sops/:id/archive
sopRouter.patch('/api/employee-portal/sops/:id/archive', requireAuth, async (req, res, next) => {
  try {
    const sop = await prisma.sopDocument.update({
      where: { id: String(req.params.id) },
      data: { active: false, archivedAt: new Date(), status: 'Archived' },
    });
    await syncAttachmentReference({
      request: req,
      module: 'SOP',
      entityType: 'sop_document',
      entityId: sop.id,
      referenceKey: 'sop-document',
      referenceUrl: null,
      description: `Reference document for SOP ${sop.title}.`,
    });
    res.json({ success: true, data: sop });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee-portal/sops/acknowledgements
sopRouter.get('/api/employee-portal/sops/acknowledgements', requireAuth, async (_req, res, next) => {
  try {
    const acks = await prisma.sopAcknowledgement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: acks });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/sops/:id/acknowledge
sopRouter.post('/api/employee-portal/sops/:id/acknowledge', requireAuth, async (req, res, next) => {
  try {
    const parsed = acknowledgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const ack = await prisma.sopAcknowledgement.create({
      data: {
        documentId: String(req.params.id),
        employeeId: parsed.data.employeeId,
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        notes: parsed.data.notes,
      },
    });
    res.status(201).json({ success: true, data: ack });
  } catch (err) {
    next(err);
  }
});
