import { Router } from 'express';
import { getApiRoot } from '../controllers/rootController';

export const apiRootRouter = Router();

apiRootRouter.get('/api/employee-portal', getApiRoot);
