import type { EmployeePortalModuleDefinition } from '../utils/employeePortalConstants';
import { EmployeePortalStatusBadge } from './EmployeePortalStatusBadge';
interface Props { module: EmployeePortalModuleDefinition; onOpen: (key: EmployeePortalModuleDefinition['key']) => void; }
export function EmployeePortalModuleCard({ module, onOpen }: Props) { return <button className="module-card" onClick={() => onOpen(module.key)}><span className="phase">Phase {module.phase}</span><h3>{module.label}</h3><p>{module.description}</p><EmployeePortalStatusBadge status={module.status} /></button>; }
