export type AttachmentStatus = 'Active' | 'Archived';

export interface AttachmentMetadata {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  referenceKey: string;
  uploadedBy?: string;
  uploadedAt?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  fileUrl?: string;
  referenceUrl?: string;
  description?: string;
  notes?: string;
  status: AttachmentStatus;
  createdAt: string;
  updatedAt: string;
}
