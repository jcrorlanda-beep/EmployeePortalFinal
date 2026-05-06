import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { evaluateFormulaPreview } from '../services/formulaPersistenceService';
import {
  mapPayrollFormula,
  parseFormulaVariablesPayload,
  prisma,
  recordPayrollAudit,
  serializeFormulaVariablesPayload,
} from '../services/payrollPersistenceService';
import { portalPermissions } from '../types/permissions';

export const formulaRouter = Router();

formulaRouter.use(
  '/api/employee-portal/formulas',
  requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.payrollManage),
);

const formulaCodePattern = /^[A-Z][A-Z0-9_]*$/;
const formulaVariablePattern = /^[A-Z][A-Z0-9_]*$/;

const formulaSchema = z.object({
  code: z.string().trim().min(1).max(80).regex(formulaCodePattern, 'Formula code must use uppercase letters, numbers, and underscores only.'),
  name: z.string().trim().min(1).max(120),
  expression: z.string().trim().min(1).max(500),
  variables: z.array(z.string().trim().regex(formulaVariablePattern, 'Variable names must use uppercase letters, numbers, and underscores only.')).max(20)
    .refine((variables) => new Set(variables).size === variables.length, 'Variable names must be unique.'),
  componentType: z.string().optional().default('earning'),
  taxable: z.boolean().optional().default(false),
  effectiveDate: z.string().optional().default(new Date().toISOString().slice(0, 10)),
  active: z.boolean().optional(),
});

const formulaUpdateSchema = formulaSchema.partial();

const previewSchema = z.object({
  formulaCode: z.string().trim().min(1).max(80).regex(formulaCodePattern),
  variables: z.record(z.string().trim().regex(formulaVariablePattern), z.number().finite()).refine(
    (variables) => Object.keys(variables).length <= 20,
    'Too many preview variables provided.',
  ),
});

const actorFromRequest = (request: { user?: { email?: string } }) => request.user?.email ?? 'anonymous';

formulaRouter.get('/api/employee-portal/formulas', requireAuth, async (_req, res, next) => {
  try {
    const formulas = await prisma.payrollFormula.findMany({ orderBy: { code: 'asc' } });
    res.json({ success: true, data: formulas.map(mapPayrollFormula) });
  } catch (err) {
    next(err);
  }
});

formulaRouter.post('/api/employee-portal/formulas', requireAuth, async (req, res, next) => {
  try {
    const parsed = formulaSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const payload = parsed.data;
    const normalizedVariables = [...new Set(payload.variables.map((variable) => variable.trim().toUpperCase()))];
    const formula = await prisma.payrollFormula.create({
      data: {
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        expression: payload.expression.trim(),
        variables: serializeFormulaVariablesPayload({
          names: normalizedVariables,
          componentType: payload.componentType,
          taxable: payload.taxable,
          effectiveDate: payload.effectiveDate,
        }),
        active: payload.active ?? true,
      },
    });
    const mapped = mapPayrollFormula(formula);
    await recordPayrollAudit({
      module: 'Formula',
      action: 'formula.created',
      actor: actorFromRequest(req),
      entityId: formula.id,
      summary: `Created formula ${formula.code}.`,
      afterPayload: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

formulaRouter.patch('/api/employee-portal/formulas/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = formulaUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.payrollFormula.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Formula not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const existingMeta = parseFormulaVariablesPayload(existing.variables);
    const payload = parsed.data;
    const normalizedVariables = payload.variables
      ? [...new Set(payload.variables.map((variable) => variable.trim().toUpperCase()))]
      : undefined;
    const formula = await prisma.payrollFormula.update({
      where: { id: String(req.params.id) },
      data: {
        code: payload.code?.trim().toUpperCase(),
        name: payload.name?.trim(),
        expression: payload.expression?.trim(),
        variables: normalizedVariables || payload.componentType || typeof payload.taxable === 'boolean' || payload.effectiveDate
          ? serializeFormulaVariablesPayload({
              names: normalizedVariables ?? existingMeta.names,
              componentType: payload.componentType ?? existingMeta.componentType,
              taxable: payload.taxable ?? existingMeta.taxable,
              effectiveDate: payload.effectiveDate ?? existingMeta.effectiveDate,
            })
          : undefined,
        active: payload.active,
      },
    });
    const mapped = mapPayrollFormula(formula);
    await recordPayrollAudit({
      module: 'Formula',
      action: payload.active === false && existing.active ? 'formula.deactivated' : 'formula.updated',
      actor: actorFromRequest(req),
      entityId: formula.id,
      summary: payload.active === false && existing.active ? `Deactivated formula ${formula.code}.` : `Updated formula ${formula.code}.`,
      beforePayload: mapPayrollFormula(existing),
      afterPayload: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

formulaRouter.post('/api/employee-portal/formulas/preview', requireAuth, async (req, res, next) => {
  try {
    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }

    const formula = await prisma.payrollFormula.findUnique({ where: { code: parsed.data.formulaCode } });
    if (!formula) {
      return next(Object.assign(new Error('Formula not found'), { status: 404, code: 'NOT_FOUND' }));
    }

    const meta = parseFormulaVariablesPayload(formula.variables);
    const previewAmount = evaluateFormulaPreview({
      expression: formula.expression,
      allowedVariables: meta.names,
      variables: Object.fromEntries(Object.entries(parsed.data.variables).map(([key, value]) => [key.trim().toUpperCase(), value])),
    });

    const payload = {
      formulaCode: formula.code,
      previewAmount,
      warnings: ['Preview only. No payroll posting or finalization was performed.'],
    };

    await recordPayrollAudit({
      module: 'Formula',
      action: 'formula.previewed',
      actor: actorFromRequest(req),
      entityId: formula.id,
      summary: `Previewed formula ${formula.code}.`,
      afterPayload: payload,
    });

    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});
