import { Router } from 'express';
import { getHealthSnapshot } from '../services/healthService';
import { ok } from '../utils/response';

export const healthRouter = Router();

healthRouter.get('/api/employee-portal/health', (_req, res) => {
  ok(res, getHealthSnapshot());
});
