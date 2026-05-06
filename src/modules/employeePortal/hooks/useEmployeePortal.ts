import { useMemo, useState } from 'react';
import { employeePortalModules, type EmployeePortalModuleKey } from '../utils/employeePortalConstants';
export function useEmployeePortal() { const [activeModule, setActiveModule] = useState<EmployeePortalModuleKey>('dashboard'); const activeDefinition = useMemo(() => employeePortalModules.find((module) => module.key === activeModule) ?? employeePortalModules[0], [activeModule]); return { activeModule, activeDefinition, setActiveModule }; }
