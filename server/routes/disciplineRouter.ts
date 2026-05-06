import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { recordAuditEvent } from '../services/auditPersistenceService';
import { syncAttachmentReference } from '../services/attachmentPersistenceService';
import { portalPermissions } from '../types/permissions';

export const disciplineRouter = Router();

const staleRecordMessage = 'Record was updated by another user. Please refresh and try again.';
const staleRecordError = () => Object.assign(new Error(staleRecordMessage), { status: 409, code: 'STALE_RECORD' });
const assertFreshRecord = (expectedUpdatedAt: string | undefined, actualUpdatedAt: Date) => {
  if (expectedUpdatedAt && actualUpdatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
    throw staleRecordError();
  }
};

disciplineRouter.use('/api/employee-portal/discipline', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.disciplineManage));

const categorySchema = z.object({
  name: z.string().min(1),
  defaultSeverity: z.enum(['verbal', 'written-warning', 'final-warning', 'suspension-notice', 'termination-notice']),
  active: z.boolean().optional().default(true),
});

const categoryUpdateSchema = categorySchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const recordSchema = z.object({
  employeeId: z.string().min(1),
  categoryId: z.string().min(1),
  severity: z.enum(['verbal', 'written-warning', 'final-warning', 'suspension-notice', 'termination-notice']),
  incidentDate: z.string().min(1),
  summary: z.string().min(1),
  correctiveAction: z.string().optional(),
  attachmentReference: z.string().optional(),
  status: z.enum(['draft', 'issued', 'acknowledged', 'hr-reviewed']).optional().default('draft'),
});

const recordUpdateSchema = recordSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});

const mapCategory = (category: {
  id: string;
  name: string;
  defaultSeverity: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: category.id,
  name: category.name,
  defaultSeverity: category.defaultSeverity,
  active: category.active,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
});

const mapRecord = (record: {
  id: string;
  employeeId: string;
  categoryId: string;
  severity: string;
  incidentDate: Date;
  summary: string;
  correctiveAction: string | null;
  status: string;
  employeeAcknowledgedAt: Date | null;
  hrReviewedAt: Date | null;
  attachmentReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: record.id,
  employeeId: record.employeeId,
  categoryId: record.categoryId,
  severity: record.severity,
  incidentDate: record.incidentDate.toISOString().slice(0, 10),
  summary: record.summary,
  correctiveAction: record.correctiveAction ?? undefined,
  status: record.status,
  employeeAcknowledgedAt: record.employeeAcknowledgedAt?.toISOString(),
  hrReviewedAt: record.hrReviewedAt?.toISOString(),
  attachmentReference: record.attachmentReference ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

disciplineRouter.get('/api/employee-portal/discipline/categories', requireAuth, async (_req, res, next) => {
  try {
    const categories = await prisma.disciplineCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories.map(mapCategory) });
  } catch (err) {
    next(err);
  }
});

disciplineRouter.post('/api/employee-portal/discipline/categories', requireAuth, async (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const category = await prisma.disciplineCategory.create({ data: parsed.data });
    const mapped = mapCategory(category);
    await recordAuditEvent({
      request: req,
      module: 'Discipline',
      action: 'discipline.category.created',
      entityType: 'discipline_category',
      entityId: category.id,
      entityLabel: category.name,
      summary: `Created discipline category ${category.name}.`,
      afterSnapshot: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

disciplineRouter.patch('/api/employee-portal/discipline/categories/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = categoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.disciplineCategory.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Discipline category not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const { expectedUpdatedAt, ...data } = parsed.data;
    assertFreshRecord(expectedUpdatedAt, existing.updatedAt);
    const category = await prisma.disciplineCategory.update({
      where: { id: String(req.params.id) },
      data,
    });
    const mapped = mapCategory(category);
    await recordAuditEvent({
      request: req,
      module: 'Discipline',
      action: 'discipline.category.updated',
      entityType: 'discipline_category',
      entityId: category.id,
      entityLabel: category.name,
      summary: `Updated discipline category ${category.name}.`,
      beforeSnapshot: mapCategory(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

disciplineRouter.get('/api/employee-portal/discipline/records', requireAuth, async (_req, res, next) => {
  try {
    const records = await prisma.disciplineRecord.findMany({ orderBy: { incidentDate: 'desc' } });
    res.json({ success: true, data: records.map(mapRecord) });
  } catch (err) {
    next(err);
  }
});

disciplineRouter.post('/api/employee-portal/discipline/records', requireAuth, async (req, res, next) => {
  try {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const payload = parsed.data;
    const record = await prisma.disciplineRecord.create({
      data: {
        employeeId: payload.employeeId,
        categoryId: payload.categoryId,
        severity: payload.severity,
        incidentDate: new Date(payload.incidentDate),
        summary: payload.summary.trim(),
        correctiveAction: payload.correctiveAction?.trim() || undefined,
        attachmentReference: payload.attachmentReference?.trim() || undefined,
        status: payload.status,
      },
    });
    const mapped = mapRecord(record);
    await syncAttachmentReference({
      request: req,
      module: 'Discipline',
      entityType: 'discipline_record',
      entityId: record.id,
      referenceKey: 'discipline-attachment',
      referenceUrl: record.attachmentReference,
      description: `Attachment for discipline record ${record.id}.`,
    });
    await recordAuditEvent({
      request: req,
      module: 'Discipline',
      action: 'discipline.record.created',
      entityType: 'discipline_record',
      entityId: record.id,
      entityLabel: record.summary.slice(0, 80),
      summary: `Created discipline record ${record.id}.`,
      afterSnapshot: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

disciplineRouter.patch('/api/employee-portal/discipline/records/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = recordUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.disciplineRecord.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Discipline record not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const nextStatus = parsed.data.status ?? existing.status;
    assertFreshRecord(parsed.data.expectedUpdatedAt, existing.updatedAt);
    const record = await prisma.disciplineRecord.update({
      where: { id: String(req.params.id) },
      data: {
        employeeId: parsed.data.employeeId,
        categoryId: parsed.data.categoryId,
        severity: parsed.data.severity,
        incidentDate: parsed.data.incidentDate ? new Date(parsed.data.incidentDate) : undefined,
        summary: parsed.data.summary?.trim(),
        correctiveAction: parsed.data.correctiveAction?.trim(),
        attachmentReference: parsed.data.attachmentReference?.trim(),
        status: nextStatus,
        employeeAcknowledgedAt: nextStatus === 'acknowledged' ? new Date() : undefined,
        hrReviewedAt: nextStatus === 'hr-reviewed' ? new Date() : undefined,
      },
    });
    const mapped = mapRecord(record);
    await syncAttachmentReference({
      request: req,
      module: 'Discipline',
      entityType: 'discipline_record',
      entityId: record.id,
      referenceKey: 'discipline-attachment',
      referenceUrl: record.attachmentReference,
      description: `Attachment for discipline record ${record.id}.`,
    });
    await recordAuditEvent({
      request: req,
      module: 'Discipline',
      action: 'discipline.record.updated',
      entityType: 'discipline_record',
      entityId: record.id,
      entityLabel: record.summary.slice(0, 80),
      summary: `Updated discipline record ${record.id}.`,
      beforeSnapshot: mapRecord(existing),
      afterSnapshot: mapped,
    });
    if (nextStatus === 'acknowledged' && existing.status !== 'acknowledged') {
      await recordAuditEvent({
        request: req,
        module: 'Discipline',
        action: 'discipline.acknowledged',
        entityType: 'discipline_record',
        entityId: record.id,
        entityLabel: record.summary.slice(0, 80),
        summary: `Acknowledged discipline record ${record.id}.`,
        beforeSnapshot: mapRecord(existing),
        afterSnapshot: mapped,
      });
    }
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});
