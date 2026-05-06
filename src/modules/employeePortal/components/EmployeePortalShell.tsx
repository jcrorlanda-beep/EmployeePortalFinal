import type { ReactNode } from 'react';
import { EmployeePortalHeader } from './EmployeePortalHeader';
import { EmployeePortalNav } from './EmployeePortalNav';
import type { PortalAuthState, PortalCurrentUser } from '../types/authTypes';
import type { EmployeePortalModuleDefinition, EmployeePortalModuleKey } from '../utils/employeePortalConstants';

interface Props {
  activeModule: EmployeePortalModuleKey;
  availableModules: EmployeePortalModuleDefinition[];
  currentUser?: PortalCurrentUser | null;
  authState?: PortalAuthState;
  authError?: string | null;
  onLogout?: () => Promise<void> | void;
  onRetrySession?: () => Promise<void> | void;
  onNavigate: (key: EmployeePortalModuleKey) => void;
  children: ReactNode;
}

export function EmployeePortalShell({
  activeModule,
  availableModules,
  currentUser,
  authState,
  authError,
  onLogout,
  onRetrySession,
  onNavigate,
  children,
}: Props) {
  return (
    <div className="portal-layout">
      <EmployeePortalHeader
        authError={authError}
        authState={authState}
        currentUser={currentUser}
        onLogout={onLogout}
        onRetrySession={onRetrySession}
      />
      <div className="portal-body">
        <EmployeePortalNav activeModule={activeModule} modules={availableModules} onNavigate={onNavigate} />
        <main>{children}</main>
      </div>
    </div>
  );
}
