import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { requirePermissionForMethods } from '../middleware/permissions';
import { recordAuditEvent } from '../services/auditPersistenceService';
import { portalPermissions } from '../types/permissions';

export const canteenRouter = Router();

canteenRouter.use('/api/employee-portal/canteen', requirePermissionForMethods(['POST', 'PATCH', 'DELETE'], portalPermissions.canteenManage));

const transactionSchema = z.object({
  employeeId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  transactionDate: z.string().min(1),
  deductionType: z.enum(['cash', 'salary-deduction']).optional().default('salary-deduction'),
  payrollFormulaCode: z.string().min(1),
  status: z.string().optional().default('open'),
  notes: z.string().optional(),
});

const transactionUpdateSchema = transactionSchema.partial();
const paymentSchema = z.object({
  amount: z.number().positive().optional(),
  notes: z.string().optional(),
});

const decimalToNumber = (value: { toNumber?: () => number } | number | null | undefined) =>
  typeof value === 'number' ? value : value?.toNumber?.() ?? 0;

const mapTransaction = (transaction: {
  id: string;
  employeeId: string;
  amount: { toNumber?: () => number } | number;
  description: string;
  transactionDate: Date;
  deductionType: string;
  payrollFormulaCode: string;
  status: string;
  settledAmount: { toNumber?: () => number } | number;
  notes: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: transaction.id,
  employeeId: transaction.employeeId,
  amount: decimalToNumber(transaction.amount),
  description: transaction.description,
  transactionDate: transaction.transactionDate.toISOString().slice(0, 10),
  deductionType: transaction.deductionType,
  payrollFormulaCode: transaction.payrollFormulaCode,
  status: transaction.status,
  settledAmount: decimalToNumber(transaction.settledAmount),
  notes: transaction.notes ?? undefined,
  settledAt: transaction.settledAt?.toISOString(),
  createdAt: transaction.createdAt.toISOString(),
  updatedAt: transaction.updatedAt.toISOString(),
});

const mapLedger = (ledger: {
  id: string;
  employeeId: string;
  source: string;
  balance: { toNumber?: () => number } | number;
  formulaCode: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: ledger.id,
  employeeId: ledger.employeeId,
  source: ledger.source,
  balance: decimalToNumber(ledger.balance),
  formulaCode: ledger.formulaCode,
  notes: ledger.notes ?? undefined,
  createdAt: ledger.createdAt.toISOString(),
  updatedAt: ledger.updatedAt.toISOString(),
  lastUpdatedAt: ledger.updatedAt.toISOString(),
});

const syncCanteenLedger = async (employeeId: string, fallbackFormulaCode: string) => {
  const transactions = await prisma.canteenTransaction.findMany({ where: { employeeId } });
  const outstandingBalance = transactions.reduce((total, transaction) => {
    if (['void', 'deducted', 'paid'].includes(transaction.status)) {
      return total;
    }
    const remaining = decimalToNumber(transaction.amount) - decimalToNumber(transaction.settledAmount);
    return total + Math.max(remaining, 0);
  }, 0);
  const latestLedger = await prisma.employeeDebtLedger.findFirst({
    where: { employeeId, source: 'canteen' },
    orderBy: { updatedAt: 'desc' },
  });
  const formulaCode = transactions.find((transaction) => transaction.payrollFormulaCode)?.payrollFormulaCode ?? fallbackFormulaCode;

  if (latestLedger) {
    await prisma.employeeDebtLedger.update({
      where: { id: latestLedger.id },
      data: {
        balance: outstandingBalance,
        formulaCode,
        notes: outstandingBalance > 0 ? 'Outstanding canteen balance pending cash payment or payroll deduction.' : 'No outstanding canteen balance.',
      },
    });
    return;
  }

  await prisma.employeeDebtLedger.create({
    data: {
      employeeId,
      source: 'canteen',
      balance: outstandingBalance,
      formulaCode,
      notes: outstandingBalance > 0 ? 'Outstanding canteen balance pending cash payment or payroll deduction.' : 'No outstanding canteen balance.',
    },
  });
};

// GET /api/employee-portal/canteen/transactions
canteenRouter.get('/api/employee-portal/canteen/transactions', requireAuth, async (_req, res, next) => {
  try {
    const transactions = await prisma.canteenTransaction.findMany({ orderBy: { transactionDate: 'desc' } });
    res.json({ success: true, data: transactions.map(mapTransaction) });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee-portal/canteen/transactions/:id
canteenRouter.get('/api/employee-portal/canteen/transactions/:id', requireAuth, async (req, res, next) => {
  try {
    const transaction = await prisma.canteenTransaction.findUnique({ where: { id: String(req.params.id) } });
    if (!transaction) {
      return next(Object.assign(new Error('Canteen transaction not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    res.json({ success: true, data: mapTransaction(transaction) });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/canteen/transactions
canteenRouter.post('/api/employee-portal/canteen/transactions', requireAuth, async (req, res, next) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const { transactionDate, ...rest } = parsed.data;
    const transaction = await prisma.canteenTransaction.create({
      data: {
        ...rest,
        description: rest.description.trim(),
        payrollFormulaCode: rest.payrollFormulaCode.trim(),
        notes: rest.notes?.trim() || undefined,
        transactionDate: new Date(transactionDate),
      },
    });
    await syncCanteenLedger(transaction.employeeId, transaction.payrollFormulaCode);
    const mapped = mapTransaction(transaction);
    await recordAuditEvent({
      request: req,
      module: 'Canteen',
      action: 'canteen.transaction.created',
      entityType: 'canteen_transaction',
      entityId: transaction.id,
      entityLabel: transaction.description || transaction.id,
      summary: `Created canteen transaction ${transaction.description || transaction.id}.`,
      afterSnapshot: mapped,
    });
    res.status(201).json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employee-portal/canteen/transactions/:id
canteenRouter.patch('/api/employee-portal/canteen/transactions/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = transactionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.canteenTransaction.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Canteen transaction not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const { transactionDate, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (transactionDate) data.transactionDate = new Date(transactionDate);
    if (typeof rest.description === 'string') data.description = rest.description.trim();
    if (typeof rest.payrollFormulaCode === 'string') data.payrollFormulaCode = rest.payrollFormulaCode.trim();
    if (typeof rest.notes === 'string') data.notes = rest.notes.trim();
    const transaction = await prisma.canteenTransaction.update({ where: { id: String(req.params.id) }, data });
    await syncCanteenLedger(transaction.employeeId, transaction.payrollFormulaCode);
    const mapped = mapTransaction(transaction);
    await recordAuditEvent({
      request: req,
      module: 'Canteen',
      action: 'canteen.transaction.updated',
      entityType: 'canteen_transaction',
      entityId: transaction.id,
      entityLabel: transaction.description || transaction.id,
      summary: `Updated canteen transaction ${transaction.description || transaction.id}.`,
      beforeSnapshot: mapTransaction(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/canteen/transactions/:id/payments
canteenRouter.post('/api/employee-portal/canteen/transactions/:id/payments', requireAuth, async (req, res, next) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.canteenTransaction.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Canteen transaction not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const remaining = Math.max(decimalToNumber(existing.amount) - decimalToNumber(existing.settledAmount), 0);
    const paymentAmount = Math.min(parsed.data.amount ?? remaining, remaining);
    const nextSettledAmount = decimalToNumber(existing.settledAmount) + paymentAmount;
    const nextStatus = nextSettledAmount >= decimalToNumber(existing.amount) ? 'paid' : 'partially-paid';
    const transaction = await prisma.canteenTransaction.update({
      where: { id: String(req.params.id) },
      data: {
        settledAmount: nextSettledAmount,
        settledAt: new Date(),
        status: nextStatus,
        notes: parsed.data.notes?.trim() || existing.notes,
      },
    });
    await syncCanteenLedger(transaction.employeeId, transaction.payrollFormulaCode);
    const mapped = mapTransaction(transaction);
    await recordAuditEvent({
      request: req,
      module: 'Canteen',
      action: 'canteen.payment.recorded',
      entityType: 'canteen_transaction',
      entityId: transaction.id,
      entityLabel: transaction.description || transaction.id,
      summary: `Recorded canteen payment for ${transaction.description || transaction.id}.`,
      beforeSnapshot: mapTransaction(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

// POST /api/employee-portal/canteen/transactions/:id/mark-payroll-deduction
canteenRouter.post('/api/employee-portal/canteen/transactions/:id/mark-payroll-deduction', requireAuth, async (req, res, next) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' }));
    }
    const existing = await prisma.canteenTransaction.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      return next(Object.assign(new Error('Canteen transaction not found'), { status: 404, code: 'NOT_FOUND' }));
    }
    const transaction = await prisma.canteenTransaction.update({
      where: { id: String(req.params.id) },
      data: {
        settledAmount: existing.amount,
        settledAt: new Date(),
        status: 'deducted',
        notes: parsed.data.notes?.trim() || existing.notes,
      },
    });
    await syncCanteenLedger(transaction.employeeId, transaction.payrollFormulaCode);
    const mapped = mapTransaction(transaction);
    await recordAuditEvent({
      request: req,
      module: 'Canteen',
      action: 'canteen.payroll_deduction.marked',
      entityType: 'canteen_transaction',
      entityId: transaction.id,
      entityLabel: transaction.description || transaction.id,
      summary: `Marked canteen transaction ${transaction.description || transaction.id} for payroll deduction.`,
      beforeSnapshot: mapTransaction(existing),
      afterSnapshot: mapped,
    });
    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee-portal/canteen/ledger
canteenRouter.get('/api/employee-portal/canteen/ledger', requireAuth, async (req, res, next) => {
  try {
    const { employeeId } = req.query;
    const where = employeeId ? { employeeId: String(employeeId) } : {};
    const ledger = await prisma.employeeDebtLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: ledger.map(mapLedger) });
  } catch (err) {
    next(err);
  }
});
