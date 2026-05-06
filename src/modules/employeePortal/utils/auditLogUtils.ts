import type { AuditMetadata } from '../types/auditTypes';
export const describeAuditReadiness = (moduleName: string, metadata?: AuditMetadata) => `${moduleName} edits require actor, reason, timestamp, entity id, and before/after payload capture.${metadata ? ` Current actor: ${metadata.actor}.` : ''}`;
