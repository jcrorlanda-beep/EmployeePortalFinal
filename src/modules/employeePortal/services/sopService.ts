import type { AuditMetadata } from '../types/auditTypes';
import type { SopAcknowledgement, SopDocument, SopDocumentDraft } from '../types/sopTypes';
import { auditLogService } from './auditLogService';
import { createId, mockDelay, PortalApiError, portalApiFetch } from './employeePortalApi';

type ServiceMode = 'api' | 'fallback';

interface ServiceStatus {
  mode: ServiceMode;
  message?: string;
}

const now = () => new Date().toISOString();

let serviceStatus: ServiceStatus = { mode: 'fallback', message: 'Using local fallback data until the backend is available.' };

export let sopDocuments: SopDocument[] = [
  {
    id: 'sop_001',
    title: 'Vehicle Intake SOP',
    description: 'Standard intake procedure for vehicles entering the service area. Covers documentation, customer handoff, and technician assignment.',
    category: 'Operations',
    documentType: 'SOP',
    version: 'v1.0',
    owner: 'Service Desk',
    fileReference: 'future-document-store://vehicle-intake-sop',
    acknowledgementRequired: true,
    status: 'Active',
    effectiveDate: '2026-01-15',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
  },
  {
    id: 'sop_002',
    title: 'Workshop Safety Policy',
    description: 'General safety rules, PPE requirements, and hazard reporting procedures for all workshop personnel.',
    category: 'Safety',
    documentType: 'Policy',
    version: 'v2.1',
    owner: 'HR & Safety Officer',
    fileReference: 'future-document-store://workshop-safety-policy',
    acknowledgementRequired: true,
    status: 'Active',
    effectiveDate: '2026-01-01',
    createdAt: '2026-05-06T00:05:00.000Z',
    updatedAt: '2026-05-06T00:05:00.000Z',
  },
];

export let sopAcknowledgements: SopAcknowledgement[] = [];

const sortDocuments = (records: SopDocument[]) =>
  [...records].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

const markApiMode = () => {
  serviceStatus = { mode: 'api' };
};

const markFallbackMode = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Employee Portal API is unavailable.';
  serviceStatus = { mode: 'fallback', message };
};

const withFallback = async <T>(runApi: () => Promise<T>, runFallback: () => Promise<T>): Promise<T> => {
  try {
    const result = await runApi();
    markApiMode();
    return result;
  } catch (error) {
    if (!(error instanceof PortalApiError) || (!error.isBackendUnavailable && !error.isAuthError)) {
      throw error;
    }
    markFallbackMode(error);
    return runFallback();
  }
};

export const getSopServiceStatus = () => serviceStatus;

export const sopService = {
  async listDocuments(): Promise<SopDocument[]> {
    return withFallback(
      async () => sortDocuments(await portalApiFetch<SopDocument[]>('/sops')),
      async () => {
        await mockDelay();
        return sortDocuments(sopDocuments);
      },
    );
  },

  async createDocument(draft: SopDocumentDraft, audit: AuditMetadata): Promise<SopDocument> {
    return withFallback(
      async () => portalApiFetch<SopDocument>('/sops', { method: 'POST', body: JSON.stringify(draft) }),
      async () => {
        await mockDelay();
        const timestamp = now();
        const document: SopDocument = {
          ...draft,
          id: createId('sop'),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        sopDocuments = [document, ...sopDocuments];
        await auditLogService.recordEvent('sop.created', document.id, audit, `Created SOP/document ${document.title}.`);
        return document;
      },
    );
  },

  async updateDocument(id: string, patch: Partial<SopDocumentDraft>, audit: AuditMetadata): Promise<SopDocument | null> {
    return withFallback(
      async () => portalApiFetch<SopDocument>(`/sops/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      async () => {
        await mockDelay();
        let updated: SopDocument | null = null;
        sopDocuments = sopDocuments.map((document) => {
          if (document.id !== id) return document;
          updated = { ...document, ...patch, updatedAt: now() };
          return updated;
        });
        if (updated) {
          const documentTitle = (updated as SopDocument).title;
          await auditLogService.recordEvent('sop.updated', id, audit, `Updated SOP/document ${documentTitle}.`);
        }
        return updated;
      },
    );
  },

  async archiveDocument(id: string, audit: AuditMetadata): Promise<SopDocument | null> {
    return withFallback(
      async () => portalApiFetch<SopDocument>(`/sops/${id}/archive`, { method: 'PATCH' }),
      async () => {
        await mockDelay();
        let updated: SopDocument | null = null;
        sopDocuments = sopDocuments.map((document) => {
          if (document.id !== id) return document;
          updated = { ...document, status: 'Archived', archivedAt: now(), updatedAt: now() };
          return updated;
        });
        if (updated) {
          const documentTitle = (updated as SopDocument).title;
          await auditLogService.recordEvent('sop.archived', id, audit, `Archived SOP/document ${documentTitle}.`);
        }
        return updated;
      },
    );
  },

  async listAcknowledgements(): Promise<SopAcknowledgement[]> {
    return withFallback(
      async () => {
        const acknowledgements = await portalApiFetch<SopAcknowledgement[]>('/sops/acknowledgements');
        return [...acknowledgements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async () => {
        await mockDelay();
        return [...sopAcknowledgements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
    );
  },

  async acknowledgeDocument(documentId: string, employeeId: string, notes: string, audit: AuditMetadata): Promise<SopAcknowledgement> {
    return withFallback(
      async () => portalApiFetch<SopAcknowledgement>(`/sops/${documentId}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ employeeId, notes }),
      }),
      async () => {
        await mockDelay();
        const timestamp = now();
        const acknowledgement: SopAcknowledgement = {
          id: createId('sop_ack'),
          documentId,
          employeeId,
          status: 'Acknowledged',
          acknowledgedAt: timestamp,
          notes: notes.trim() || undefined,
          createdAt: timestamp,
        };
        sopAcknowledgements = [acknowledgement, ...sopAcknowledgements];
        await auditLogService.recordEvent('sop.acknowledged', documentId, audit, `Employee ${employeeId} acknowledged document ${documentId}.`);
        return acknowledgement;
      },
    );
  },
};
