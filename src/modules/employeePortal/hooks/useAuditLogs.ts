import { useEffect, useState } from 'react';
import type { AuditLogEntry } from '../types/auditTypes';
import { auditLogService } from '../services/auditLogService';
export function useAuditLogs() { const [logs, setLogs] = useState<AuditLogEntry[]>([]); useEffect(() => { void auditLogService.listAuditLogs().then(setLogs); }, []); return { logs }; }
