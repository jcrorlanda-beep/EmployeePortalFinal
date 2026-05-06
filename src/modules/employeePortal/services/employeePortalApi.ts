import type { AuditMetadata } from '../types/auditTypes';

export const databaseConfigured = Boolean(import.meta.env.VITE_DATABASE_URL_AVAILABLE);
export const portalApiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/employee-portal');
export const mockDelay = async () => Promise.resolve();
export const createAuditMetadata = (actor = 'mvp-admin', reason?: string): AuditMetadata => ({ actor, reason, source: 'employee-portal-mvp' });
export const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const portalTokenStorageKey = 'ncccEmployeePortalToken';

export class PortalApiError extends Error {
  status?: number;
  code?: string;
  isAuthError?: boolean;
  isBackendUnavailable?: boolean;
  isValidationError?: boolean;

  constructor(message: string, options?: { status?: number; code?: string; isAuthError?: boolean; isBackendUnavailable?: boolean; isValidationError?: boolean }) {
    super(message);
    this.name = 'PortalApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.isAuthError = options?.isAuthError;
    this.isBackendUnavailable = options?.isBackendUnavailable;
    this.isValidationError = options?.isValidationError;
  }
}

const getDefaultPortalErrorMessage = (path: string, status?: number, code?: string, message?: string) => {
  if (status === 409 && code === 'STALE_RECORD') {
    return 'Record was updated by another user. Please refresh and try again.';
  }
  if (status === 401 && path === '/auth/login') {
    return 'Invalid email or password.';
  }
  if (status === 401) {
    return 'Your standalone portal session expired. Please sign in again.';
  }
  if (status === 403) {
    return 'Your standalone portal account is not allowed to do that yet.';
  }
  if (status === 400 && code === 'VALIDATION_ERROR') {
    return 'Please review the form details and try again.';
  }
  if (status && status >= 500) {
    return 'Employee Portal backend is unavailable right now. Please retry in a moment.';
  }
  return message ?? 'Employee Portal API request failed.';
};

export const getPortalApiErrorMessage = (error: unknown, fallback = 'Employee Portal API request failed.') => {
  if (error instanceof PortalApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export const isStaleRecordError = (error: unknown) =>
  error instanceof PortalApiError && error.code === 'STALE_RECORD';

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
    throw new PortalApiError('Employee Portal backend is unavailable right now. Please retry in a moment.', {
      isBackendUnavailable: true,
    });
  }

  let payload: { success: boolean; data?: T; error?: { message?: string; code?: string } } | null = null;
  try {
    payload = await response.json() as { success: boolean; data?: T; error?: { message?: string; code?: string } };
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const code = payload?.error?.code;
    throw new PortalApiError(getDefaultPortalErrorMessage(path, response.status, code, payload?.error?.message), {
      status: response.status,
      code,
      isAuthError: response.status === 401 || response.status === 403,
      isBackendUnavailable: response.status >= 500,
      isValidationError: response.status === 400 || code === 'VALIDATION_ERROR',
    });
  }
  return payload?.data as T;
};
