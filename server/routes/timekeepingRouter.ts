import { Router } from 'express';
import { z } from 'zod';
import { auditWrites } from '../middleware/auditWrites';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { portalPermissions } from '../types/permissions';

export const timekeepingRouter = Router();

timekeepingRouter.use(
  '/api/employee-portal/timekeeping',
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.timekeepingManage),
  auditWrites('Timekeeping'),
);

const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  clockedAt: z.string().min(1),
  type: z.string().min(1),
  source: z.string().optional().default('manual-mvp'),
  correctionStatus: z.string().optional().default('none'),
  notes: z.string().optional(),
});

const correctionSchema = z.object({
  correctionStatus: z.string().optional().default('requested'),
  notes: z.string().optional(),
});

const timesheetSchema = z.object({
  employeeId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  regularHours: z.number().optional(),
  overtimeHours: z.number().optional(),
  status: z.string().optional().default('draft'),
  correctionNotes: z.string().optional(),
  correctionReason: z.string().optional(),
});

const timesheetStatusSchema = z.object({
  status: z.string().min(1),
  notes: z.string().optional(),
});

const toNumber = (value: { toNumber: () => number } | number) =>
  typeof value === 'number' ? value : value.toNumber();

const mapAttendance = (record: {
  id: string;
  employeeId: string;
  clockedAt: Date;
  type: string;
  source: string;
  correctionStatus: string;
  notes: string | null;
  createdAt: Date;
}) => ({
  id: record.id,
  employeeId: record.employeeId,
  clockedAt: record.clockedAt.toISOString(),
  type: record.type,
  source: record.source,
  correctionStatus: record.correctionStatus,
  notes: record.notes ?? undefined,
  createdAt: record.createdAt.toISOString(),
});

const mapTimesheet = (record: {
  id: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  regularHours: { toNumber: () => number } | number;
  overtimeHours: { toNumber: () => number } | number;
  status: string;
  correctionNotes: string | null;
  correctionReason: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}) => ({
  id: record.id,
  employeeId: record.employeeId,
  periodStart: record.periodStart.toISOString().slice(0, 10),
  periodEnd: record.periodEnd.toISOString().slice(0, 10),
  regularHours: toNumber(record.regularHours),
  overtimeHours: toNumber(record.overtimeHours),
  status: record.status,
  correctionNotes: record.correctionNotes ?? undefined,
  correctionReason: record.correctionReason ?? undefined,
  approvedBy: record.approvedBy ?? undefined,
  approvedAt: record.approvedAt?.toISOString(),
  createdAt: record.createdAt.toISOString(),
});

timekeepingRouter.get('/api/employee-portal/timekeeping/attendance', requireAuth, async (_req, res, next) => {
  try {
    const records = await prisma.attendanceRecord.findMany({ orderBy: { clockedAt: 'desc' } });
    res.json({ success: true, data: records.map(mapAttendance) });
  } catch (err) {
    next(err);
  }
});

timekeepingRouter.post('/api/employee-portal/timekeeping/attendance', requireAuth, async (req, res, next) => {
  try {
    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { clockedAt, ...rest } = parsed.data;
    const record = await prisma.attendanceRecord.create({
      data: { ...rest, notes: rest.notes?.trim() || undefined, clockedAt: new Date(clockedAt) },
    });
    res.status(201).json({ success: true, data: mapAttendance(record) });
  } catch (err) {
    next(err);
  }
});

timekeepingRouter.patch('/api/employee-portal/timekeeping/attendance/:id/request-correction', requireAuth, async (req, res, next) => {
  try {
    const parsed = correctionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const record = await prisma.attendanceRecord.update({
      where: { id: String(req.params.id) },
      data: {
        correctionStatus: parsed.data.correctionStatus,
        notes: parsed.data.notes?.trim() || undefined,
      },
    });
    res.json({ success: true, data: mapAttendance(record) });
  } catch (err) {
    next(err);
  }
});

timekeepingRouter.get('/api/employee-portal/timekeeping/timesheets', requireAuth, async (_req, res, next) => {
  try {
    const timesheets = await prisma.timesheetRecord.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: timesheets.map(mapTimesheet) });
  } catch (err) {
    next(err);
  }
});

timekeepingRouter.post('/api/employee-portal/timekeeping/timesheets', requireAuth, async (req, res, next) => {
  try {
    const parsed = timesheetSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { periodStart, periodEnd, ...rest } = parsed.data;
    const timesheet = await prisma.timesheetRecord.create({
      data: {
        ...rest,
        correctionNotes: rest.correctionNotes?.trim() || undefined,
        correctionReason: rest.correctionReason?.trim() || undefined,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });
    res.status(201).json({ success: true, data: mapTimesheet(timesheet) });
  } catch (err) {
    next(err);
  }
});

timekeepingRouter.patch('/api/employee-portal/timekeeping/timesheets/:id/status', requireAuth, async (req, res, next) => {
  try {
    const parsed = timesheetStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const actor = ((req as { auth?: { email?: string } }).auth?.email ?? 'mvp-admin');
    const timesheet = await prisma.timesheetRecord.update({
      where: { id: String(req.params.id) },
      data: {
        status: parsed.data.status,
        correctionNotes: parsed.data.status === 'correction-requested' ? parsed.data.notes?.trim() || undefined : undefined,
        correctionReason: parsed.data.status === 'correction-requested' ? parsed.data.notes?.trim() || undefined : undefined,
        approvedBy: parsed.data.status === 'approved' ? actor : undefined,
        approvedAt: parsed.data.status === 'approved' ? new Date() : undefined,
      },
    });
    res.json({ success: true, data: mapTimesheet(timesheet) });
  } catch (err) {
    next(err);
  }
});
