import { EmployeePortalShell } from './components/EmployeePortalShell';
import { employeePortalRoutes } from './employeePortalRoutes';
import { useEmployeePortal } from './hooks/useEmployeePortal';
export function EmployeePortalPage() { const { activeModule, authState, availableModules, currentUser, setActiveModule } = useEmployeePortal(); const ActivePage = employeePortalRoutes[activeModule]; return <EmployeePortalShell activeModule={activeModule} availableModules={availableModules} currentUser={currentUser} authState={authState} onNavigate={setActiveModule}><ActivePage /></EmployeePortalShell>; }
