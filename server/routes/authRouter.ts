import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { getJwtSecret } from '../utils/env';
import { ok } from '../utils/response';

export const authRouter = Router();

const JWT_EXPIRY = '8h';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/employee-portal/auth/login
authRouter.post('/api/employee-portal/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = Object.assign(new Error('Validation failed'), { status: 400, code: 'VALIDATION_ERROR' });
      return next(err);
    }
    const { email, password } = parsed.data;

    const user = await prisma.portalUser.findUnique({ where: { email } });
    if (!user || !user.active) {
      const err = Object.assign(new Error('Invalid credentials'), { status: 401, code: 'AUTH_FAILED' });
      return next(err);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = Object.assign(new Error('Invalid credentials'), { status: 401, code: 'AUTH_FAILED' });
      return next(err);
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRY });

    ok(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/api/employee-portal/auth/logout', (_req, res) => {
  ok(res, { loggedOut: true });
});

authRouter.get('/api/employee-portal/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.portalUser.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.active) {
      const err = Object.assign(new Error('User not found'), { status: 404, code: 'NOT_FOUND' });
      return next(err);
    }
    ok(res, {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      active: user.active,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});
