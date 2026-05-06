import { Router } from 'express';
import { z } from 'zod';
import { formulaRouter } from './formulaRouter';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import {
  mapPayrollComponent,
  mapPayrollPeriod,
  mapPayrollProfile,
  prisma,
  recordPayrollAudit,
} from '../services/payrollPersistenceService';
import { portalPermissions } from '../types/permissions';

export const payrollRouter = Router();

payrollRouter.use(formulaRouter);

payrollRouter.use(
  '/api/employee-portal/payroll',
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.payrollManage),
);

const profileSchema = z.object({
  employeeId: z.string().min(1),
  payType: z.string().min(1),
  baseFormulaCode: z.string().min(1),
  allowanceFormulaCodes: z.array(z.string()).optional().default([]),
  deductionFormulaCodes: z.array(z.string()).optional().default([]),
  active: z.boolean().optional(),
});

const profileUpdateSchema = profileSchema.partial();

const periodSchema = z.object({
  name: z.string().min(1),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
  status: z.string().optional().default('draft'),
});

const periodUpdateSchema = periodSchema.partial();

const componentSchema = z.object({
  profileId: z.string().min(1),
  type: z.string().min(1),
  formulaCode: z.string().min(1),
  label: z.string().min(1),
});

const componentUpdateSchema = componentSchema.partial();

const actorFromRequest = (request: { user?: { email?: string } }) => request.user?.email ?? 'anonymous';

payrollRouter.get('/api/employee-portal/payroll/profiles', requireAuth, async (_req, res, next) => {
  try {
    const profiles = await prisma.payrollProfile.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: profiles.map(mapPayrollProfile) });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post('/api/employee-portal/payroll/profiles', requireAuth, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const profile = await prisma.payrollProfile.create({ data: parsed.data });
    const mapped = mapPayrollProfile(profile);
    await recordPayrollAudit({
      module: 'Payroll',
      action: 'payroll.profile.created',
      actor: actorFromRequest(req),
      entityId: profile.id,
      summary: `Created payroll profile for employee ${profile.employeeId}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

payrollRouter.patch('/api/employee-portal/payroll/profiles/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.payrollProfile.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Payroll profile not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const profile = await prisma.payrollProfile.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    const mapped = mapPayrollProfile(profile);
    await recordPayrollAudit({
      module: 'Payroll',
      action: 'payroll.profile.updated',
      actor: actorFromRequest(req),
      entityId: profile.id,
      summary: `Updated payroll profile ${profile.id}.`,
      beforePayload: mapPayrollProfile(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

payrollRouter.get('/api/employee-portal/payroll/periods', requireAuth, async (_req, res, next) => {
  try {
    const periods = await prisma.payrollPeriod.findMany({ orderBy: { startsOn: 'desc' } });
    res.json({ success: true, data: periods.map(mapPayrollPeriod) });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post('/api/employee-portal/payroll/periods', requireAuth, async (req, res, next) => {
  try {
    const parsed = periodSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { startsOn, endsOn, ...rest } = parsed.data;
    const period = await prisma.payrollPeriod.create({
      data: { ...rest, startsOn: new Date(startsOn), endsOn: new Date(endsOn) },
    });
    const mapped = mapPayrollPeriod(period);
    await recordPayrollAudit({
      module: 'Payroll',
      action: 'payroll.period.created',
      actor: actorFromRequest(req),
      entityId: period.id,
      summary: `Created payroll period ${period.name}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

payrollRouter.patch('/api/employee-portal/payroll/periods/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = periodUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.payrollPeriod.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Payroll period not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const { startsOn, endsOn, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (startsOn) data.startsOn = new Date(startsOn);
    if (endsOn) data.endsOn = new Date(endsOn);
    const period = await prisma.payrollPeriod.update({ where: { id: String(req.params.id) }, data });
    const mapped = mapPayrollPeriod(period);
    await recordPayrollAudit({
      module: 'Payroll',
      action: 'payroll.period.updated',
      actor: actorFromRequest(req),
      entityId: period.id,
      summary: `Updated payroll period ${period.name}.`,
      beforePayload: mapPayrollPeriod(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

payrollRouter.get('/api/employee-portal/payroll/components', requireAuth, async (_req, res, next) => {
  try {
    const components = await prisma.payrollComponent.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: components.map(mapPayrollComponent) });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post('/api/employee-portal/payroll/components', requireAuth, async (req, res, next) => {
  try {
    const parsed = componentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const component = await prisma.payrollComponent.create({ data: parsed.data });
    const mapped = mapPayrollComponent(component);
    await recordPayrollAudit({
      module: 'Payroll',
      action: 'payroll.component.created',
      actor: actorFromRequest(req),
      entityId: component.id,
      summary: `Created payroll component ${component.label}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

payrollRouter.patch('/api/employee-portal/payroll/components/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = componentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.payrollComponent.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Payroll component not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const component = await prisma.payrollComponent.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    const mapped = mapPayrollComponent(component);
    await recordPayrollAudit({
      module: 'Payroll',
      action: 'payroll.component.updated',
      actor: actorFromRequest(req),
      entityId: component.id,
      summary: `Updated payroll component ${component.label}.`,
      beforePayload: mapPayrollComponent(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

payrollRouter.get('/api/employee-portal/payroll/payslips', requireAuth, async (_req, res, next) => {
  try {
    const payslips = await prisma.payslip.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: payslips });
  } catch (err) {
    next(err);
  }
});
