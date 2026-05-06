import type { NextFunction, Request, Response } from 'express';
import { getCorsOrigin } from '../utils/env';

export const corsMiddleware = (request: Request, response: Response, next: NextFunction) => {
  const allowedOrigin = getCorsOrigin();
  const requestOrigin = request.headers.origin;

  if (allowedOrigin === '*' || (requestOrigin && allowedOrigin.split(',').map((value) => value.trim()).includes(requestOrigin))) {
    response.header('Access-Control-Allow-Origin', requestOrigin ?? '*');
  }

  response.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');

  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }

  next();
};
