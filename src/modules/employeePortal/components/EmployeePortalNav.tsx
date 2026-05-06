import { employeePortalModules, type EmployeePortalModuleKey } from '../utils/employeePortalConstants';
interface Props { activeModule: EmployeePortalModuleKey; onNavigate: (key: EmployeePortalModuleKey) => void; }
export function EmployeePortalNav({ activeModule, onNavigate }: Props) { return <nav className="portal-nav" aria-label="Employee portal modules">{employeePortalModules.map((module) => <button className={module.key === activeModule ? 'active' : ''} key={module.key} onClick={() => onNavigate(module.key)}>{module.label}</button>)}</nav>; }
