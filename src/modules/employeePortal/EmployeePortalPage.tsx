import { EmployeePortalShell } from './components/EmployeePortalShell';
import { employeePortalRoutes } from './employeePortalRoutes';
import { useEmployeePortal } from './hooks/useEmployeePortal';
export function EmployeePortalPage() { const { activeModule, setActiveModule } = useEmployeePortal(); const ActivePage = employeePortalRoutes[activeModule]; return <EmployeePortalShell activeModule={activeModule} onNavigate={setActiveModule}><ActivePage /></EmployeePortalShell>; }
