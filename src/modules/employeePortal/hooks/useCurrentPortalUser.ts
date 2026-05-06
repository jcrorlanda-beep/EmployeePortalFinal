import { useEffect, useState } from 'react';
import type { PortalCurrentUser } from '../types/authTypes';
import { clearPortalToken, fetchCurrentPortalUser } from '../services/currentUserService';

export function useCurrentPortalUser() {
  const [currentUser, setCurrentUser] = useState<PortalCurrentUser | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchCurrentPortalUser()
      .then((user) => {
        if (cancelled) return;
        setCurrentUser(user);
        setAuthState(user ? 'authenticated' : 'anonymous');
      })
      .catch((error: Error) => {
        if (cancelled) return;
        clearPortalToken();
        setCurrentUser(null);
        setAuthState('anonymous');
        setAuthError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { currentUser, authState, authError };
}
