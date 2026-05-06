import type { NextFunction, Request, Response } from 'express';
import { getCorsOrigins } from '../utils/env';

export const corsMiddleware = (request: Request, response: Response, next: NextFunction) => {
  const allowedOrigins = getCorsOrigins();
  const requestOrigin = request.headers.origin;
  const allowAnyOrigin = allowedOrigins.includes('*');
  const originAllowed = allowAnyOrigin || (requestOrigin ? allowedOrigins.includes(requestOrigin) : false);

  if (originAllowed) {
    response.header('Access-Control-Allow-Origin', allowAnyOrigin ? (requestOrigin ?? '*') : String(requestOrigin));
    response.header('Vary', 'Origin');
  }

  response.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');

  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }

  next();
};
