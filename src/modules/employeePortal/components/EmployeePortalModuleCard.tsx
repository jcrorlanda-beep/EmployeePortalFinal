import type { EmployeePortalModuleDefinition } from '../utils/employeePortalConstants';
import { EmployeePortalStatusBadge } from './EmployeePortalStatusBadge';
interface Props {
  module: EmployeePortalModuleDefinition;
  onOpen: (key: EmployeePortalModuleDefinition['key']) => void;
  disabled?: boolean;
  helperText?: string;
}

export function EmployeePortalModuleCard({ module, onOpen, disabled = false, helperText }: Props) {
  return (
    <button
      className={`module-card${disabled ? ' module-card-disabled' : ''}`}
      disabled={disabled}
      onClick={() => onOpen(module.key)}
      type="button"
    >
      <span className="phase">Phase {module.phase}</span>
      <h3>{module.label}</h3>
      <p>{module.description}</p>
      <EmployeePortalStatusBadge status={module.status} />
      {helperText ? <span className="module-card-helper">{helperText}</span> : null}
    </button>
  );
}
