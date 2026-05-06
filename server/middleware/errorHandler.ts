import { Request, Response, NextFunction } from 'express';

interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaKnownError(err: unknown): err is Error & PrismaKnownError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string'
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isPrismaKnownError(err)) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { message: 'A record with that value already exists.', code: 'UNIQUE_CONSTRAINT_VIOLATION' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { message: 'Record not found.', code: 'NOT_FOUND' },
      });
      return;
    }
  }

  const error = err as Error & { status?: number; code?: string };
  const status = error.status ?? 500;
  const message = status >= 500 ? 'Internal server error' : error.message ?? 'Request failed';
  const code = error.code ?? 'INTERNAL_ERROR';

  res.status(status).json({
    success: false,
    error: { message, code },
  });
}
