import type { AuditMetadata } from '../types/auditTypes';

export const databaseConfigured = Boolean(import.meta.env.VITE_DATABASE_URL_AVAILABLE);
export const portalApiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/employee-portal');
export const mockDelay = async () => Promise.resolve();
export const createAuditMetadata = (actor = 'mvp-admin', reason?: string): AuditMetadata => ({ actor, reason, source: 'employee-portal-mvp' });
export const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const portalTokenStorageKey = 'ncccEmployeePortalToken';

export class PortalApiError extends Error {
  status?: number;
  isAuthError?: boolean;
  isBackendUnavailable?: boolean;

  constructor(message: string, options?: { status?: number; isAuthError?: boolean; isBackendUnavailable?: boolean }) {
    super(message);
    this.name = 'PortalApiError';
    this.status = options?.status;
    this.isAuthError = options?.isAuthError;
    this.isBackendUnavailable = options?.isBackendUnavailable;
  }
}

export const getPortalSessionToken = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(portalTokenStorageKey);
};

export const portalApiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  const token = getPortalSessionToken();
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    response = await fetch(`${portalApiBaseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    throw new PortalApiError(error instanceof Error ? error.message : 'Employee Portal API is unavailable', {
      isBackendUnavailable: true,
    });
  }

  const payload = await response.json() as { success: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !payload.success) {
    throw new PortalApiError(payload.error?.message ?? 'Employee Portal API request failed', {
      status: response.status,
      isAuthError: response.status === 401 || response.status === 403,
      isBackendUnavailable: response.status >= 500,
    });
  }
  return payload.data as T;
};
