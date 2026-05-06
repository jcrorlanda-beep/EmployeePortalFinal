import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { PortalAuthState, PortalCurrentUser, PortalLoginCredentials } from '../types/authTypes';
import type { EmployeePortalModuleDefinition, EmployeePortalModuleKey } from '../utils/employeePortalConstants';

export interface EmployeePortalSessionValue {
  activeModule: EmployeePortalModuleKey;
  activeDefinition: EmployeePortalModuleDefinition;
  availableModules: EmployeePortalModuleDefinition[];
  currentUser: PortalCurrentUser | null;
  authError: string | null;
  authState: PortalAuthState;
  dismissAuthError: () => void;
  login: (credentials: PortalLoginCredentials) => Promise<unknown>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<PortalCurrentUser | null>;
  setActiveModule: (key: EmployeePortalModuleKey) => void;
}

const EmployeePortalSessionContext = createContext<EmployeePortalSessionValue | null>(null);

export function EmployeePortalSessionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: EmployeePortalSessionValue;
}) {
  return (
    <EmployeePortalSessionContext.Provider value={value}>
      {children}
    </EmployeePortalSessionContext.Provider>
  );
}

export function useEmployeePortalSession() {
  const context = useContext(EmployeePortalSessionContext);
  if (!context) {
    throw new Error('useEmployeePortalSession must be used within EmployeePortalSessionProvider.');
  }
  return context;
}
