import type { AuditMetadata } from '../types/auditTypes';

export const databaseConfigured = Boolean(import.meta.env.VITE_DATABASE_URL_AVAILABLE);
export const mockDelay = async () => Promise.resolve();
export const createAuditMetadata = (actor = 'mvp-admin', reason?: string): AuditMetadata => ({ actor, reason, source: 'employee-portal-mvp' });
export const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
