import { useEffect, useState } from 'react';
import type { AuditLogEntry } from '../types/auditTypes';
import { auditLogService } from '../services/auditLogService';
import { portalApiFetch } from '../services/employeePortalApi';
import { readPortalToken } from '../services/currentUserService';

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    const token = readPortalToken();
    if (!token) {
      void auditLogService.listAuditLogs().then(setLogs);
      return;
    }

    void portalApiFetch<AuditLogEntry[]>('/audit-logs', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setLogs)
      .catch(() => {
        void auditLogService.listAuditLogs().then(setLogs);
      });
  }, []);

  return { logs };
}
