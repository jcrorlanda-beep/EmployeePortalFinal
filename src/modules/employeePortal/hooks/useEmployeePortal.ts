import { useEffect, useMemo, useState } from 'react';
import { useCurrentPortalUser } from './useCurrentPortalUser';
import { employeePortalModules, type EmployeePortalModuleKey } from '../utils/employeePortalConstants';
import { canAccessModule } from '../utils/portalAccess';

export function useEmployeePortal() {
  const [activeModule, setActiveModule] = useState<EmployeePortalModuleKey>('dashboard');
  const { currentUser, authError, authState, dismissAuthError, login, logout, refreshSession } = useCurrentPortalUser();

  const availableModules = useMemo(
    () => authState === 'authenticated'
      ? employeePortalModules.filter((module) => canAccessModule(currentUser?.role, module.key))
      : [],
    [authState, currentUser?.role],
  );

  const effectiveAuthState = useMemo(
    () => authState === 'authenticated' && availableModules.length === 0 ? 'unauthorized' : authState,
    [authState, availableModules.length],
  );

  useEffect(() => {
    if (availableModules.length > 0 && !availableModules.some((module) => module.key === activeModule)) {
      setActiveModule(availableModules[0]?.key ?? 'dashboard');
    }
  }, [activeModule, availableModules]);

  const activeDefinition = useMemo(
    () => availableModules.find((module) => module.key === activeModule) ?? availableModules[0] ?? employeePortalModules[0],
    [activeModule, availableModules],
  );

  return {
    activeModule,
    activeDefinition,
    availableModules,
    currentUser,
    authError,
    authState: effectiveAuthState,
    dismissAuthError,
    login,
    logout,
    refreshSession,
    setActiveModule,
  };
}
