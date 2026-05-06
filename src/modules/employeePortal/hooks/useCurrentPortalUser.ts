import { useCallback, useEffect, useState } from 'react';
import type { PortalAuthState, PortalCurrentUser, PortalLoginCredentials } from '../types/authTypes';
import { clearPortalToken, fetchCurrentPortalUser, loginPortalUser, logoutPortalUser, readPortalToken } from '../services/currentUserService';
import { getPortalApiErrorMessage, PortalApiError } from '../services/employeePortalApi';

export function useCurrentPortalUser() {
  const [currentUser, setCurrentUser] = useState<PortalCurrentUser | null>(null);
  const [authState, setAuthState] = useState<PortalAuthState>('loading');
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const token = readPortalToken();
    if (!token) {
      setCurrentUser(null);
      setAuthState('anonymous');
      setAuthError(null);
      return null;
    }

    try {
      const user = await fetchCurrentPortalUser();
      setCurrentUser(user);
      setAuthState(user ? 'authenticated' : 'anonymous');
      setAuthError(null);
      return user;
    } catch (error) {
      if (error instanceof PortalApiError && error.isBackendUnavailable) {
        setAuthState((previousState) => previousState === 'authenticated' && currentUser ? 'authenticated' : 'backend-unavailable');
        setAuthError('Employee Portal backend is unavailable right now.');
        return currentUser;
      }

      clearPortalToken();
      setCurrentUser(null);
      setAuthState('anonymous');
      setAuthError(getPortalApiErrorMessage(error, 'Your standalone portal session expired. Please sign in again.'));
      return null;
    }
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    void refreshSession().then((user) => {
      if (cancelled) return;
      if (!user && readPortalToken() === null && authState === 'loading') {
        setAuthState('anonymous');
      }
    });

    const handleFocus = () => {
      void refreshSession();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSession, authState]);

  const login = useCallback(async (credentials: PortalLoginCredentials) => {
    setAuthState('loading');
    try {
      const result = await loginPortalUser(credentials);
      await refreshSession();
      setAuthError(null);
      return result.user;
    } catch (error) {
      if (error instanceof PortalApiError && error.isBackendUnavailable) {
        setAuthState('backend-unavailable');
        setAuthError('Employee Portal backend is unavailable right now.');
      } else {
        setAuthState('anonymous');
        setAuthError(getPortalApiErrorMessage(error, 'Unable to sign in right now.'));
      }
      throw error;
    }
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await logoutPortalUser();
    setCurrentUser(null);
    setAuthState('anonymous');
    setAuthError(null);
  }, []);

  const dismissAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return { currentUser, authState, authError, login, logout, refreshSession, dismissAuthError };
}
