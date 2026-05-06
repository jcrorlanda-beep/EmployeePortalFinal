import type { Request } from 'express';
import { prisma } from '../prisma/client';
import { recordAuditEvent } from './auditPersistenceService';

type AttachmentStatus = 'Active' | 'Archived';

type AttachmentRecord = Awaited<ReturnType<typeof prisma.attachmentMetadata.findFirst>>;

export interface AttachmentReferenceInput {
  request: Request;
  module: string;
  entityType: string;
  entityId: string;
  referenceKey: string;
  referenceUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  description?: string | null;
  notes?: string | null;
}

export interface AttachmentListFilters {
  module?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
}

const mimeTypeByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  csv: 'text/csv',
};

const normalizeValue = (value?: string | null) => value?.trim() || undefined;

const actorFromRequest = (request: Request) => request.user?.email ?? 'standalone-portal';

const deriveFileName = (referenceUrl?: string, fileUrl?: string) => {
  const candidate = normalizeValue(fileUrl) ?? normalizeValue(referenceUrl);
  if (!candidate) return undefined;
  const clean = candidate.split('?')[0].split('#')[0];
  const parts = clean.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1] ?? clean;
  return lastPart.includes(':') ? lastPart.split(':').pop() ?? lastPart : lastPart;
};

const deriveMimeType = (fileName?: string, referenceUrl?: string, fileUrl?: string) => {
  const source = fileName ?? deriveFileName(referenceUrl, fileUrl);
  const extension = source?.split('.').pop()?.toLowerCase();
  return extension ? mimeTypeByExtension[extension] : undefined;
};

const mapAttachment = (attachment: NonNullable<AttachmentRecord>) => ({
  id: attachment.id,
  module: attachment.module,
  entityType: attachment.entityType,
  entityId: attachment.entityId,
  referenceKey: attachment.referenceKey,
  uploadedBy: attachment.uploadedBy ?? undefined,
  uploadedAt: attachment.uploadedAt?.toISOString(),
  fileName: attachment.fileName ?? undefined,
  mimeType: attachment.mimeType ?? undefined,
  fileSize: attachment.fileSize ?? undefined,
  fileUrl: attachment.fileUrl ?? undefined,
  referenceUrl: attachment.referenceUrl ?? undefined,
  description: attachment.description ?? undefined,
  notes: attachment.notes ?? undefined,
  status: attachment.status as AttachmentStatus,
  createdAt: attachment.createdAt.toISOString(),
  updatedAt: attachment.updatedAt.toISOString(),
});

const buildAttachmentWriteData = (input: Omit<AttachmentReferenceInput, 'request'>) => {
  const referenceUrl = normalizeValue(input.referenceUrl);
  const fileUrl = normalizeValue(input.fileUrl);
  const fileName = normalizeValue(input.fileName) ?? deriveFileName(referenceUrl, fileUrl);
  const mimeType = normalizeValue(input.mimeType) ?? deriveMimeType(fileName, referenceUrl, fileUrl);

  return {
    module: input.module,
    entityType: input.entityType,
    entityId: input.entityId,
    referenceKey: input.referenceKey,
    fileName,
    mimeType,
    fileSize: input.fileSize ?? undefined,
    fileUrl,
    referenceUrl,
    description: normalizeValue(input.description),
    notes: normalizeValue(input.notes),
  };
};

export const listAttachments = async (filters: AttachmentListFilters = {}) => {
  const attachments = await prisma.attachmentMetadata.findMany({
    where: {
      module: filters.module,
      entityType: filters.entityType,
      entityId: filters.entityId,
      status: filters.status,
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return attachments.map(mapAttachment);
};

export const createAttachment = async (input: AttachmentReferenceInput) => {
  const data = buildAttachmentWriteData(input);
  const created = await prisma.attachmentMetadata.create({
    data: {
      ...data,
      uploadedBy: actorFromRequest(input.request),
      uploadedAt: new Date(),
      status: 'Active',
    },
  });

  const mapped = mapAttachment(created);
  await recordAuditEvent({
    request: input.request,
    module: 'Attachment',
    action: 'attachment.created',
    entityType: 'attachment',
    entityId: created.id,
    entityLabel: created.fileName ?? created.referenceKey,
    summary: `Created attachment metadata for ${created.referenceKey}.`,
    afterSnapshot: mapped,
  });

  return mapped;
};

export const updateAttachment = async (
  request: Request,
  id: string,
  patch: Partial<Omit<AttachmentReferenceInput, 'request' | 'module' | 'entityType' | 'entityId' | 'referenceKey'>>,
) => {
  const existing = await prisma.attachmentMetadata.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Attachment not found'), { status: 404, code: 'NOT_FOUND' });
  }

  const fileName = normalizeValue(patch.fileName) ?? existing.fileName ?? deriveFileName(patch.referenceUrl ?? existing.referenceUrl ?? undefined, patch.fileUrl ?? existing.fileUrl ?? undefined);
  const mimeType = normalizeValue(patch.mimeType) ?? existing.mimeType ?? deriveMimeType(fileName ?? undefined, patch.referenceUrl ?? existing.referenceUrl ?? undefined, patch.fileUrl ?? existing.fileUrl ?? undefined);

  const updated = await prisma.attachmentMetadata.update({
    where: { id },
    data: {
      fileName,
      mimeType,
      fileSize: patch.fileSize ?? existing.fileSize ?? undefined,
      fileUrl: normalizeValue(patch.fileUrl) ?? existing.fileUrl ?? undefined,
      referenceUrl: normalizeValue(patch.referenceUrl) ?? existing.referenceUrl ?? undefined,
      description: normalizeValue(patch.description) ?? existing.description ?? undefined,
      notes: normalizeValue(patch.notes) ?? existing.notes ?? undefined,
      uploadedBy: actorFromRequest(request),
      uploadedAt: new Date(),
    },
  });

  const mapped = mapAttachment(updated);
  await recordAuditEvent({
    request,
    module: 'Attachment',
    action: 'attachment.updated',
    entityType: 'attachment',
    entityId: updated.id,
    entityLabel: updated.fileName ?? updated.referenceKey,
    summary: `Updated attachment metadata for ${updated.referenceKey}.`,
    beforeSnapshot: mapAttachment(existing),
    afterSnapshot: mapped,
  });

  return mapped;
};

export const archiveAttachment = async (request: Request, id: string) => {
  const existing = await prisma.attachmentMetadata.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Attachment not found'), { status: 404, code: 'NOT_FOUND' });
  }

  const archived = await prisma.attachmentMetadata.update({
    where: { id },
    data: {
      status: 'Archived',
      notes: existing.notes ?? 'Archived from metadata layer.',
    },
  });

  const mapped = mapAttachment(archived);
  await recordAuditEvent({
    request,
    module: 'Attachment',
    action: 'attachment.archived',
    entityType: 'attachment',
    entityId: archived.id,
    entityLabel: archived.fileName ?? archived.referenceKey,
    summary: `Archived attachment metadata for ${archived.referenceKey}.`,
    beforeSnapshot: mapAttachment(existing),
    afterSnapshot: mapped,
  });

  return mapped;
};

export const syncAttachmentReference = async (input: AttachmentReferenceInput) => {
  const normalizedReferenceUrl = normalizeValue(input.referenceUrl);
  const normalizedFileUrl = normalizeValue(input.fileUrl);
  const existing = await prisma.attachmentMetadata.findFirst({
    where: {
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      referenceKey: input.referenceKey,
      status: 'Active',
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!normalizedReferenceUrl && !normalizedFileUrl) {
    if (!existing) return null;
    return archiveAttachment(input.request, existing.id);
  }

  if (!existing) {
    return createAttachment(input);
  }

  const nextFileName = normalizeValue(input.fileName) ?? deriveFileName(normalizedReferenceUrl, normalizedFileUrl);
  const nextMimeType = normalizeValue(input.mimeType) ?? deriveMimeType(nextFileName, normalizedReferenceUrl, normalizedFileUrl);
  const nextDescription = normalizeValue(input.description);
  const nextNotes = normalizeValue(input.notes);
  const changed = (
    existing.referenceUrl !== (normalizedReferenceUrl ?? null)
    || existing.fileUrl !== (normalizedFileUrl ?? null)
    || existing.fileName !== (nextFileName ?? null)
    || existing.mimeType !== (nextMimeType ?? null)
    || existing.description !== (nextDescription ?? null)
    || existing.notes !== (nextNotes ?? null)
    || existing.fileSize !== (input.fileSize ?? null)
  );

  if (!changed) {
    return mapAttachment(existing);
  }

  return updateAttachment(input.request, existing.id, {
    referenceUrl: normalizedReferenceUrl,
    fileUrl: normalizedFileUrl,
    fileName: nextFileName,
    mimeType: nextMimeType,
    fileSize: input.fileSize ?? undefined,
    description: nextDescription,
    notes: nextNotes,
  });
};
