import type { PortalCurrentUser, PortalLoginCredentials, PortalLoginResponse } from '../types/authTypes';
import { getPortalSessionToken, PortalApiError, portalApiFetch } from './employeePortalApi';

export const portalTokenStorageKey = 'ncccEmployeePortalToken';

export const readPortalToken = () => getPortalSessionToken();

export const storePortalToken = (token: string) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(portalTokenStorageKey, token);
};

export const clearPortalToken = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(portalTokenStorageKey);
};

export const loginPortalUser = async ({ email, password }: PortalLoginCredentials) => {
  const result = await portalApiFetch<PortalLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  storePortalToken(result.token);
  return result;
};

export const logoutPortalUser = async () => {
  try {
    await portalApiFetch<{ loggedOut: boolean }>('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    if (!(error instanceof PortalApiError)) {
      throw error;
    }
  } finally {
    clearPortalToken();
  }
};

export const fetchCurrentPortalUser = async (): Promise<PortalCurrentUser | null> => {
  const token = readPortalToken();
  if (!token) return null;

  return portalApiFetch<PortalCurrentUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
};
