import type { NextFunction, Request, Response } from 'express';

export const securityHeaders = (_request: Request, response: Response, next: NextFunction) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'same-origin');
  next();
};
