import { employeePortalModules } from '../utils/employeePortalConstants';
import { EmployeePortalModuleCard } from '../components/EmployeePortalModuleCard';
import { useEmployeePortal } from '../hooks/useEmployeePortal';
export function EmployeeDashboardPage() { const { setActiveModule } = useEmployeePortal(); return <section><h2>Admin Dashboard</h2><p className="lead">MVP command center for HR, scheduling, timekeeping, payroll preparation, assets, inventory, performance, communications, and audit logs.</p><div className="module-grid">{employeePortalModules.filter((module) => module.key !== 'dashboard').map((module) => <EmployeePortalModuleCard key={module.key} module={module} onOpen={setActiveModule} />)}</div></section>; }
