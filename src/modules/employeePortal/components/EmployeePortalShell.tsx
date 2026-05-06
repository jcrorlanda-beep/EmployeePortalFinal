import type { ReactNode } from 'react';
import { EmployeePortalHeader } from './EmployeePortalHeader';
import { EmployeePortalNav } from './EmployeePortalNav';
import type { PortalCurrentUser } from '../types/authTypes';
import type { EmployeePortalModuleDefinition, EmployeePortalModuleKey } from '../utils/employeePortalConstants';

interface Props {
  activeModule: EmployeePortalModuleKey;
  availableModules: EmployeePortalModuleDefinition[];
  currentUser?: PortalCurrentUser | null;
  authState?: 'loading' | 'authenticated' | 'anonymous';
  onNavigate: (key: EmployeePortalModuleKey) => void;
  children: ReactNode;
}

export function EmployeePortalShell({ activeModule, availableModules, currentUser, authState, onNavigate, children }: Props) {
  return <div className="portal-layout"><EmployeePortalHeader currentUser={currentUser} authState={authState} /><div className="portal-body"><EmployeePortalNav activeModule={activeModule} modules={availableModules} onNavigate={onNavigate} /><main>{children}</main></div></div>;
}
