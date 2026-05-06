import type { ReactNode } from 'react';
import { EmployeePortalHeader } from './EmployeePortalHeader';
import { EmployeePortalNav } from './EmployeePortalNav';
import type { EmployeePortalModuleKey } from '../utils/employeePortalConstants';
interface Props { activeModule: EmployeePortalModuleKey; onNavigate: (key: EmployeePortalModuleKey) => void; children: ReactNode; }
export function EmployeePortalShell({ activeModule, onNavigate, children }: Props) { return <div className="portal-layout"><EmployeePortalHeader /><div className="portal-body"><EmployeePortalNav activeModule={activeModule} onNavigate={onNavigate} /><main>{children}</main></div></div>; }
