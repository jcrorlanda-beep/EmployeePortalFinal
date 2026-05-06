import type { Request, Response } from 'express';
import { ok } from '../utils/response';

export const getApiRoot = (_request: Request, response: Response) =>
  ok(response, {
    service: 'nccc-employee-portal',
    status: 'ready',
    apiRoot: '/api/employee-portal',
  });
