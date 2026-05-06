import type { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const getRequestIp = (request: Request) =>
  request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';

export const createRateLimitMiddleware = ({ keyPrefix, limit, windowMs }: RateLimitOptions) =>
  (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getRequestIp(request)}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= limit) {
      response.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      response.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
        },
      });
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
