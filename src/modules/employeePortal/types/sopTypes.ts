export type SopDocumentType = 'SOP' | 'Policy' | 'Checklist' | 'Form' | 'Memo' | 'External Reference';
export type SopDocumentStatus = 'Draft' | 'Active' | 'Archived';
export type SopAcknowledgementStatus = 'Pending' | 'Acknowledged';

export interface SopDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  documentType: SopDocumentType;
  version: string;
  owner: string;
  fileReference: string;
  acknowledgementRequired: boolean;
  status: SopDocumentStatus;
  effectiveDate?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SopDocumentDraft = Omit<SopDocument, 'id' | 'archivedAt' | 'createdAt' | 'updatedAt'>;

export interface SopAcknowledgement {
  id: string;
  documentId: string;
  employeeId: string;
  status: SopAcknowledgementStatus;
  acknowledgedAt?: string;
  notes?: string;
  createdAt: string;
}
