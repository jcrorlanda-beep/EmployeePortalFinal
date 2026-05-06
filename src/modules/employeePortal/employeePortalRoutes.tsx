import type { ReactElement } from 'react';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { PositionsPage } from './pages/PositionsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { TrainingPage } from './pages/TrainingPage';
import { SopLibraryPage } from './pages/SopLibraryPage';
import { TimekeepingPage } from './pages/TimekeepingPage';
import { TimesheetsPage } from './pages/TimesheetsPage';
import { SchedulingPage } from './pages/SchedulingPage';
import { LeaveRequestsPage } from './pages/LeaveRequestsPage';
import { ScheduleSwapPage } from './pages/ScheduleSwapPage';
import { PayrollPage } from './pages/PayrollPage';
import { FormulaEnginePage } from './pages/FormulaEnginePage';
import { BenefitsPage } from './pages/BenefitsPage';
import { GovernmentContributionsPage } from './pages/GovernmentContributionsPage';
import { PayslipsPage } from './pages/PayslipsPage';
import { ToolDepositsPage } from './pages/ToolDepositsPage';
import { ToolsEquipmentPage } from './pages/ToolsEquipmentPage';
import { InventoryPage } from './pages/InventoryPage';
import { DisciplinePage } from './pages/DisciplinePage';
import { CanteenDebtPage } from './pages/CanteenDebtPage';
import { MonthlyReviewsPage } from './pages/MonthlyReviewsPage';
import { InternalCommunicationPage } from './pages/InternalCommunicationPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import type { EmployeePortalModuleKey } from './utils/employeePortalConstants';

export const employeePortalRoutes: Record<EmployeePortalModuleKey, () => ReactElement> = {
  dashboard: EmployeeDashboardPage, employees: EmployeesPage, departments: DepartmentsPage, positions: PositionsPage, onboarding: OnboardingPage, training: TrainingPage, sops: SopLibraryPage, timekeeping: TimekeepingPage, timesheets: TimesheetsPage, scheduling: SchedulingPage, leave: LeaveRequestsPage, swaps: ScheduleSwapPage, payroll: PayrollPage, formulas: FormulaEnginePage, benefits: BenefitsPage, government: GovernmentContributionsPage, payslips: PayslipsPage, toolDeposits: ToolDepositsPage, equipment: ToolsEquipmentPage, inventory: InventoryPage, discipline: DisciplinePage, canteen: CanteenDebtPage, reviews: MonthlyReviewsPage, communication: InternalCommunicationPage, auditLogs: AuditLogsPage,
};
