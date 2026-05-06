import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { writeAuditLog } from '../services/auditService';
import { portalPermissions } from '../types/permissions';

export const reviewRouter = Router();

reviewRouter.use(
  '/api/employee-portal/reviews',
  requireAuth,
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.reviewsManage),
);

const templateSchema = z.object({
  name: z.string().min(1),
  items: z.array(z.object({
    label: z.string().min(1),
    weight: z.number().nonnegative(),
    maxScore: z.number().positive(),
  })),
  active: z.boolean().optional().default(true),
});

const templateUpdateSchema = templateSchema.partial();

const reviewSchema = z.object({
  employeeId: z.string().min(1),
  templateId: z.string().min(1),
  reviewMonth: z.string().min(1),
  status: z.enum(['draft', 'submitted', 'employee-acknowledged', 'hr-approved']).optional().default('draft'),
});

const reviewUpdateSchema = z.object({
  status: z.enum(['draft', 'submitted', 'employee-acknowledged', 'hr-approved']).optional(),
  supervisorNotes: z.string().optional(),
});

const reviewItemSchema = z.object({
  score: z.number().nonnegative(),
  notes: z.string().optional(),
});

const decimalToNumber = (value: { toNumber?: () => number } | number | null | undefined) =>
  typeof value === 'number' ? value : value?.toNumber?.() ?? 0;
const actorFromRequest = (request: { user?: { email?: string } }) => request.user?.email ?? 'anonymous';

const mapTemplate = (template: {
  id: string;
  name: string;
  items: unknown;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: template.id,
  name: template.name,
  items: Array.isArray(template.items) ? template.items : [],
  active: template.active,
  createdAt: template.createdAt.toISOString(),
  updatedAt: template.updatedAt.toISOString(),
});

const mapReview = (
  review: {
    id: string;
    employeeId: string;
    templateId: string;
    reviewMonth: string;
    supervisorNotes: string | null;
    status: string;
    employeeAcknowledgedAt: Date | null;
    hrApprovedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  items: Array<{
    id: string;
    reviewId: string;
    label: string;
    weight: { toNumber?: () => number } | number;
    score: { toNumber?: () => number } | number;
    maxScore: { toNumber?: () => number } | number;
    notes: string | null;
  }>,
) => ({
  id: review.id,
  employeeId: review.employeeId,
  templateId: review.templateId,
  reviewMonth: review.reviewMonth,
  supervisorNotes: review.supervisorNotes ?? undefined,
  status: review.status,
  items: items.map((item) => ({
    id: item.id,
    reviewId: item.reviewId,
    label: item.label,
    weight: decimalToNumber(item.weight),
    score: decimalToNumber(item.score),
    maxScore: decimalToNumber(item.maxScore),
    notes: item.notes ?? undefined,
  })),
  employeeAcknowledgedAt: review.employeeAcknowledgedAt?.toISOString(),
  hrApprovedAt: review.hrApprovedAt?.toISOString(),
  createdAt: review.createdAt.toISOString(),
  updatedAt: review.updatedAt.toISOString(),
});

reviewRouter.get('/api/employee-portal/reviews/templates', requireAuth, async (_request, response, next) => {
  try {
    const templates = await prisma.performanceReviewTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    response.json({ success: true, data: templates.map(mapTemplate) });
  } catch (error) {
    next(error);
  }
});

reviewRouter.post('/api/employee-portal/reviews/templates', async (request, response, next) => {
  try {
    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const template = await prisma.performanceReviewTemplate.create({ data: parsed.data });
    const mapped = mapTemplate(template);
    await writeAuditLog({
      module: 'PerformanceReview',
      action: 'review.template.created',
      actor: actorFromRequest(request),
      entityId: template.id,
      summary: `Created review template ${template.name}.`,
      afterPayload: mapped,
    });
    response.status(201).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

reviewRouter.patch('/api/employee-portal/reviews/templates/:id', async (request, response, next) => {
  try {
    const parsed = templateUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.performanceReviewTemplate.findUnique({ where: { id: String(request.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Review template not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const template = await prisma.performanceReviewTemplate.update({
      where: { id: String(request.params.id) },
      data: parsed.data,
    });
    const mapped = mapTemplate(template);
    await writeAuditLog({
      module: 'PerformanceReview',
      action: 'review.template.updated',
      actor: actorFromRequest(request),
      entityId: template.id,
      summary: `Updated review template ${template.name}.`,
      beforePayload: mapTemplate(existing),
      afterPayload: mapped,
    });
    response.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

reviewRouter.get('/api/employee-portal/reviews', requireAuth, async (_request, response, next) => {
  try {
    const reviews = await prisma.performanceReview.findMany({ orderBy: { createdAt: 'desc' } });
    const reviewIds = reviews.map((review) => review.id);
    const items = reviewIds.length
      ? await prisma.performanceReviewItem.findMany({ where: { reviewId: { in: reviewIds } }, orderBy: { createdAt: 'asc' } })
      : [];
    response.json({
      success: true,
      data: reviews.map((review) => mapReview(review, items.filter((item) => item.reviewId === review.id))),
    });
  } catch (error) {
    next(error);
  }
});

reviewRouter.post('/api/employee-portal/reviews', async (request, response, next) => {
  try {
    const parsed = reviewSchema.safeParse(request.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const template = await prisma.performanceReviewTemplate.findUnique({ where: { id: parsed.data.templateId } });
    if (!template) {
      return next(Object.assign(new Error('Review template not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const templateItems = Array.isArray(template.items)
      ? template.items as Array<{ label?: string; weight?: number; maxScore?: number }>
      : [];
    const review = await prisma.performanceReview.create({
      data: {
        employeeId: parsed.data.employeeId,
        templateId: parsed.data.templateId,
        reviewMonth: parsed.data.reviewMonth,
        status: parsed.data.status,
      },
    });
    const items = await Promise.all(
      templateItems.map((item) =>
        prisma.performanceReviewItem.create({
          data: {
            reviewId: review.id,
            label: item.label ?? 'Review Item',
            weight: item.weight ?? 0,
            score: 0,
            maxScore: item.maxScore ?? 10,
          },
        }),
      ),
    );
    const mapped = mapReview(review, items);
    await writeAuditLog({
      module: 'PerformanceReview',
      action: 'review.created',
      actor: actorFromRequest(request),
      entityId: review.id,
      summary: `Created performance review ${review.id}.`,
      afterPayload: mapped,
    });
    response.status(201).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

reviewRouter.patch('/api/employee-portal/reviews/:id/items/:itemId', async (request, response, next) => {
  try {
    const parsed = reviewItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const item = await prisma.performanceReviewItem.update({
      where: { id: String(request.params.itemId) },
      data: {
        score: parsed.data.score,
        notes: parsed.data.notes?.trim() || undefined,
      },
    });
    const review = await prisma.performanceReview.findUnique({ where: { id: String(request.params.id) } });
    if (!review) {
      return next(Object.assign(new Error('Review not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const items = await prisma.performanceReviewItem.findMany({ where: { reviewId: review.id }, orderBy: { createdAt: 'asc' } });
    response.json({ success: true, data: mapReview(review, items) });
  } catch (error) {
    next(error);
  }
});

reviewRouter.patch('/api/employee-portal/reviews/:id', async (request, response, next) => {
  try {
    const parsed = reviewUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.performanceReview.findUnique({ where: { id: String(request.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Review not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const nextStatus = parsed.data.status ?? existing.status;
    const review = await prisma.performanceReview.update({
      where: { id: String(request.params.id) },
      data: {
        status: nextStatus,
        supervisorNotes: parsed.data.supervisorNotes?.trim(),
        employeeAcknowledgedAt: nextStatus === 'employee-acknowledged' ? new Date() : undefined,
        hrApprovedAt: nextStatus === 'hr-approved' ? new Date() : undefined,
      },
    });
    const items = await prisma.performanceReviewItem.findMany({ where: { reviewId: review.id }, orderBy: { createdAt: 'asc' } });
    const mapped = mapReview(review, items);
    const action = nextStatus === 'submitted'
      ? 'review.submitted'
      : nextStatus === 'employee-acknowledged'
        ? 'review.acknowledged'
        : nextStatus === 'hr-approved'
          ? 'review.approved'
          : 'review.updated';
    await writeAuditLog({
      module: 'PerformanceReview',
      action,
      actor: actorFromRequest(request),
      entityId: review.id,
      summary: `Updated performance review ${review.id} to ${nextStatus}.`,
      beforePayload: mapReview(existing, items),
      afterPayload: mapped,
    });
    response.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});
