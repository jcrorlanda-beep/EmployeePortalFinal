import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/env';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

function isAuthUser(value: Partial<AuthUser>): value is AuthUser {
  return Boolean(value.id && value.email && value.role);
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token && token.length > 4096) {
    const err = Object.assign(new Error('Invalid token'), { status: 401, code: 'AUTH_INVALID' });
    next(err);
    return;
  }
  if (!token) {
    const err = Object.assign(new Error('Authentication required'), { status: 401, code: 'AUTH_REQUIRED' });
    next(err);
    return;
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as Partial<AuthUser>;
    if (!isAuthUser(decoded)) {
      throw new Error('AUTH_INVALID');
    }
    req.user = decoded;
    next();
  } catch {
    const err = Object.assign(new Error('Invalid or expired token'), { status: 401, code: 'AUTH_INVALID' });
    next(err);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token || token.length > 4096) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as Partial<AuthUser>;
    if (isAuthUser(decoded)) {
      req.user = decoded;
    }
  } catch {
    // Invalid token — just proceed without user
  }
  next();
}
