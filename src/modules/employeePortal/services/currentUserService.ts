import type { PortalCurrentUser } from '../types/authTypes';
import { getPortalSessionToken, portalApiFetch } from './employeePortalApi';

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

export const fetchCurrentPortalUser = async () => {
  const token = readPortalToken();
  if (!token) return null;

  return portalApiFetch<PortalCurrentUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
};
