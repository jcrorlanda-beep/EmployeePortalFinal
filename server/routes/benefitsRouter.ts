import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import {
  mapBenefitRule,
  mapGovernmentContribution,
  prisma,
  recordBenefitsAudit,
  serializeBenefitAmount,
  serializeBenefitEligibility,
  serializeGovernmentMetadata,
} from '../services/benefitsPersistenceService';
import { portalPermissions } from '../types/permissions';

export const benefitsRouter = Router();

benefitsRouter.use(
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.benefitsManage),
);

const benefitSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  benefitType: z.string().min(1),
  eligibilityType: z.string().min(1),
  eligibilityRuleCode: z.string().optional(),
  formulaId: z.string().optional(),
  taxableFlag: z.boolean().optional().default(false),
  effectiveStartDate: z.string().min(1),
  effectiveEndDate: z.string().optional(),
  status: z.string().optional().default('active'),
});

const benefitUpdateSchema = benefitSchema.partial();

const governmentSchema = z.object({
  contributionType: z.enum(['SSS', 'PhilHealth', 'PagIBIG', 'BIR']),
  name: z.string().min(1),
  description: z.string().optional(),
  ruleType: z.enum(['Formula', 'Table', 'Bracket', 'Manual']),
  formulaId: z.string().optional(),
  tableJson: z.string().optional(),
  effectiveStartDate: z.string().min(1),
  effectiveEndDate: z.string().optional(),
  status: z.string().optional().default('active'),
});

const governmentUpdateSchema = governmentSchema.partial();

const actorFromRequest = (request: { user?: { email?: string } }) => request.user?.email ?? 'anonymous';

benefitsRouter.get('/api/employee-portal/benefits', requireAuth, async (_req, res, next) => {
  try {
    const rules = await prisma.benefitRule.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: rules.map(mapBenefitRule) });
  } catch (err) {
    next(err);
  }
});

benefitsRouter.post('/api/employee-portal/benefits', requireAuth, async (req, res, next) => {
  try {
    const parsed = benefitSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const payload = parsed.data;
    const rule = await prisma.benefitRule.create({
      data: {
        name: payload.name.trim(),
        eligibilityFormulaCode: serializeBenefitEligibility({
          eligibilityType: payload.eligibilityType,
          eligibilityRuleCode: payload.eligibilityRuleCode?.trim() || undefined,
        }),
        amountFormulaCode: serializeBenefitAmount({
          description: payload.description?.trim() || '',
          benefitType: payload.benefitType,
          formulaId: payload.formulaId?.trim() || undefined,
          taxableFlag: payload.taxableFlag,
          effectiveStartDate: payload.effectiveStartDate,
          effectiveEndDate: payload.effectiveEndDate,
          status: payload.status,
        }),
        active: payload.status !== 'inactive',
      },
    });
    const mapped = mapBenefitRule(rule);
    await recordBenefitsAudit({
      module: 'Benefits',
      action: 'benefit.created',
      actor: actorFromRequest(req),
      entityId: rule.id,
      summary: `Created benefit ${rule.name}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

benefitsRouter.patch('/api/employee-portal/benefits/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = benefitUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.benefitRule.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Benefit not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const current = mapBenefitRule(existing);
    const payload = parsed.data;
    const rule = await prisma.benefitRule.update({
      where: { id: String(req.params.id) },
      data: {
        name: payload.name?.trim(),
        eligibilityFormulaCode: payload.eligibilityType || payload.eligibilityRuleCode
          ? serializeBenefitEligibility({
              eligibilityType: payload.eligibilityType ?? current.eligibilityType,
              eligibilityRuleCode: payload.eligibilityRuleCode?.trim() || current.eligibilityRuleCode || undefined,
            })
          : undefined,
        amountFormulaCode:
          payload.description !== undefined ||
          payload.benefitType ||
          payload.formulaId !== undefined ||
          payload.taxableFlag !== undefined ||
          payload.effectiveStartDate ||
          payload.effectiveEndDate !== undefined ||
          payload.status
            ? serializeBenefitAmount({
                description: payload.description?.trim() ?? current.description,
                benefitType: payload.benefitType ?? current.benefitType,
                formulaId: payload.formulaId?.trim() ?? (current.formulaId || undefined),
                taxableFlag: payload.taxableFlag ?? current.taxableFlag,
                effectiveStartDate: payload.effectiveStartDate ?? current.effectiveStartDate,
                effectiveEndDate: payload.effectiveEndDate ?? current.effectiveEndDate,
                status: payload.status ?? current.status,
              })
            : undefined,
        active: payload.status ? payload.status !== 'inactive' : undefined,
      },
    });
    const mapped = mapBenefitRule(rule);
    await recordBenefitsAudit({
      module: 'Benefits',
      action: 'benefit.updated',
      actor: actorFromRequest(req),
      entityId: rule.id,
      summary: `Updated benefit ${rule.name}.`,
      beforePayload: current,
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

benefitsRouter.patch('/api/employee-portal/benefits/:id/deactivate', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.benefitRule.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Benefit not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const current = mapBenefitRule(existing);
    const rule = await prisma.benefitRule.update({
      where: { id: String(req.params.id) },
      data: {
        active: false,
        amountFormulaCode: serializeBenefitAmount({
          description: current.description,
          benefitType: current.benefitType,
          formulaId: current.formulaId || undefined,
          taxableFlag: current.taxableFlag,
          effectiveStartDate: current.effectiveStartDate,
          effectiveEndDate: current.effectiveEndDate,
          status: 'inactive',
        }),
      },
    });
    const mapped = mapBenefitRule(rule);
    await recordBenefitsAudit({
      module: 'Benefits',
      action: 'benefit.deactivated',
      actor: actorFromRequest(req),
      entityId: rule.id,
      summary: `Deactivated benefit ${rule.name}.`,
      beforePayload: current,
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

benefitsRouter.get('/api/employee-portal/government-contributions', requireAuth, async (_req, res, next) => {
  try {
    const settings = await prisma.governmentContributionSetting.findMany({ orderBy: { agencyName: 'asc' } });
    res.json({ success: true, data: settings.map(mapGovernmentContribution) });
  } catch (err) {
    next(err);
  }
});

benefitsRouter.post('/api/employee-portal/government-contributions', requireAuth, async (req, res, next) => {
  try {
    const parsed = governmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const payload = parsed.data;
    const setting = await prisma.governmentContributionSetting.create({
      data: {
        agencyName: payload.name.trim(),
        employeeFormulaCode: payload.formulaId?.trim() || '',
        employerFormulaCode: serializeGovernmentMetadata({
          contributionType: payload.contributionType,
          description: payload.description?.trim() || '',
          ruleType: payload.ruleType,
          formulaId: payload.formulaId?.trim() || undefined,
          tableJson: payload.tableJson,
          effectiveEndDate: payload.effectiveEndDate,
          status: payload.status,
        }),
        effectiveDate: new Date(payload.effectiveStartDate),
        active: payload.status !== 'inactive',
      },
    });
    const mapped = mapGovernmentContribution(setting);
    await recordBenefitsAudit({
      module: 'GovernmentContribution',
      action: 'government_contribution.created',
      actor: actorFromRequest(req),
      entityId: setting.id,
      summary: `Created government contribution setting ${setting.agencyName}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

benefitsRouter.patch('/api/employee-portal/government-contributions/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = governmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.governmentContributionSetting.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Government contribution setting not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const current = mapGovernmentContribution(existing);
    const payload = parsed.data;
    const setting = await prisma.governmentContributionSetting.update({
      where: { id: String(req.params.id) },
      data: {
        agencyName: payload.name?.trim(),
        employeeFormulaCode: payload.formulaId?.trim() ?? undefined,
        employerFormulaCode:
          payload.contributionType ||
          payload.description !== undefined ||
          payload.ruleType ||
          payload.formulaId !== undefined ||
          payload.tableJson !== undefined ||
          payload.effectiveEndDate !== undefined ||
          payload.status
            ? serializeGovernmentMetadata({
                contributionType: payload.contributionType ?? current.contributionType,
                description: payload.description?.trim() ?? current.description,
                ruleType: payload.ruleType ?? current.ruleType,
                formulaId: payload.formulaId?.trim() ?? (current.formulaId || undefined),
                tableJson: payload.tableJson ?? current.tableJson,
                effectiveEndDate: payload.effectiveEndDate ?? current.effectiveEndDate,
                status: payload.status ?? current.status,
              })
            : undefined,
        effectiveDate: payload.effectiveStartDate ? new Date(payload.effectiveStartDate) : undefined,
        active: payload.status ? payload.status !== 'inactive' : undefined,
      },
    });
    const mapped = mapGovernmentContribution(setting);
    await recordBenefitsAudit({
      module: 'GovernmentContribution',
      action: 'government_contribution.updated',
      actor: actorFromRequest(req),
      entityId: setting.id,
      summary: `Updated government contribution setting ${setting.agencyName}.`,
      beforePayload: current,
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

benefitsRouter.patch('/api/employee-portal/government-contributions/:id/deactivate', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.governmentContributionSetting.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Government contribution setting not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const current = mapGovernmentContribution(existing);
    const setting = await prisma.governmentContributionSetting.update({
      where: { id: String(req.params.id) },
      data: {
        active: false,
        employerFormulaCode: serializeGovernmentMetadata({
          contributionType: current.contributionType,
          description: current.description,
          ruleType: current.ruleType,
          formulaId: current.formulaId || undefined,
          tableJson: current.tableJson,
          effectiveEndDate: current.effectiveEndDate,
          status: 'inactive',
        }),
      },
    });
    const mapped = mapGovernmentContribution(setting);
    await recordBenefitsAudit({
      module: 'GovernmentContribution',
      action: 'government_contribution.deactivated',
      actor: actorFromRequest(req),
      entityId: setting.id,
      summary: `Deactivated government contribution setting ${setting.agencyName}.`,
      beforePayload: current,
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});
