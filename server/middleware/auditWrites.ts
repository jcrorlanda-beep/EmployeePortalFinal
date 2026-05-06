import type { NextFunction, Request, Response } from 'express';
import { writeAuditLog } from '../services/auditService';

const actionForMethod = (method: string) => {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'deactivate';
    default:
      return 'update';
  }
};

export const auditWrites = (moduleName: string) =>
  (request: Request, response: Response, next: NextFunction) => {
    if (!['POST', 'PATCH', 'DELETE'].includes(request.method.toUpperCase())) {
      next();
      return;
    }

    let responseBody: unknown;
    const originalJson = response.json.bind(response);
    response.json = ((body: unknown) => {
      responseBody = body;
      return originalJson(body);
    }) as Response['json'];

    response.on('finish', () => {
      if (response.statusCode < 200 || response.statusCode >= 300) return;

      const actor = request.user?.email ?? 'anonymous';
      const body = responseBody as { data?: { id?: string } } | undefined;
      const entityId = body?.data?.id ?? String(request.params.id ?? 'unknown');

      void writeAuditLog({
        module: moduleName,
        action: actionForMethod(request.method),
        actor,
        entityId,
        summary: `${request.method} ${request.originalUrl}`,
        afterPayload: body?.data,
      }).catch((error) => {
        console.error('Failed to write audit log', error);
      });
    });

    next();
  };
