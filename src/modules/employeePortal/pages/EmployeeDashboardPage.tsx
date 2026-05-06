import { useEffect, useMemo, useState } from 'react';
import { EmployeePortalModuleCard } from '../components/EmployeePortalModuleCard';
import { useEmployeePortalSession } from '../hooks/useEmployeePortalSession';
import { usePortalPermissions } from '../hooks/usePortalPermissions';
import { employeePortalModules, type EmployeePortalModuleKey } from '../utils/employeePortalConstants';
import { employeeService } from '../services/employeeService';
import { onboardingService } from '../services/onboardingService';
import { trainingService } from '../services/trainingService';
import { timekeepingService } from '../services/timekeepingService';
import { schedulingService } from '../services/schedulingService';
import { inventoryService } from '../services/inventoryService';
import { canteenService } from '../services/canteenService';
import { disciplineService } from '../services/disciplineService';
import { reviewService } from '../services/reviewService';
import type { DisciplineRecord } from '../types/disciplineTypes';

interface DashboardMetric {
  key: string;
  label: string;
  value: string;
  helper: string;
  moduleKey?: EmployeePortalModuleKey;
}

interface DashboardSummaryState {
  totalEmployees: number;
  activeEmployees: number;
  pendingOnboarding: number;
  trainingCompletion: string;
  attendanceToday: number;
  pendingTimesheets: number;
  pendingPto: number;
  pendingSwaps: number;
  inventoryAlerts: number;
  canteenBalanceAlerts: number;
  pendingReviews: number;
  recentDiscipline: DisciplineRecord[];
}

const emptySummary: DashboardSummaryState = {
  totalEmployees: 0,
  activeEmployees: 0,
  pendingOnboarding: 0,
  trainingCompletion: '0%',
  attendanceToday: 0,
  pendingTimesheets: 0,
  pendingPto: 0,
  pendingSwaps: 0,
  inventoryAlerts: 0,
  canteenBalanceAlerts: 0,
  pendingReviews: 0,
  recentDiscipline: [],
};

export function EmployeeDashboardPage() {
  const { setActiveModule } = useEmployeePortalSession();
  const { explainModuleAccess, hasModuleAccess } = usePortalPermissions();
  const [summary, setSummary] = useState<DashboardSummaryState>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    void Promise.allSettled([
      employeeService.listEmployees(),
      onboardingService.listEmployeeChecklists(),
      trainingService.listAssignments(),
      timekeepingService.listAttendance(),
      timekeepingService.listTimesheets(),
      schedulingService.listPtoRequests(),
      schedulingService.listSwapRequests(),
      inventoryService.listItems(),
      canteenService.listLedgers(),
      disciplineService.listRecords(),
      reviewService.listReviews(),
    ]).then((results) => {
      const [
        employeeResult,
        onboardingResult,
        trainingResult,
        attendanceResult,
        timesheetResult,
        ptoResult,
        swapResult,
        inventoryResult,
        canteenResult,
        disciplineResult,
        reviewResult,
      ] = results;

      const employees = employeeResult.status === 'fulfilled' ? employeeResult.value : [];
      const checklists = onboardingResult.status === 'fulfilled' ? onboardingResult.value : [];
      const assignments = trainingResult.status === 'fulfilled' ? trainingResult.value : [];
      const attendance = attendanceResult.status === 'fulfilled' ? attendanceResult.value : [];
      const timesheets = timesheetResult.status === 'fulfilled' ? timesheetResult.value : [];
      const ptoRequests = ptoResult.status === 'fulfilled' ? ptoResult.value : [];
      const swapRequests = swapResult.status === 'fulfilled' ? swapResult.value : [];
      const inventoryItems = inventoryResult.status === 'fulfilled' ? inventoryResult.value : [];
      const ledgers = canteenResult.status === 'fulfilled' ? canteenResult.value : [];
      const disciplineRecords = disciplineResult.status === 'fulfilled' ? disciplineResult.value : [];
      const reviews = reviewResult.status === 'fulfilled' ? reviewResult.value : [];

      const completedTraining = assignments.filter((assignment) => assignment.status === 'Completed').length;
      const trainingCompletion = assignments.length ? `${Math.round((completedTraining / assignments.length) * 100)}%` : '0%';
      const attendanceToday = new Set(
        attendance
          .filter((record) => record.clockedAt.slice(0, 10) === today && record.type === 'in')
          .map((record) => record.employeeId),
      ).size;

      setSummary({
        totalEmployees: employees.length,
        activeEmployees: employees.filter((employee) => employee.employmentStatus === 'active').length,
        pendingOnboarding: checklists.filter((checklist) => checklist.status !== 'approved').length,
        trainingCompletion,
        attendanceToday,
        pendingTimesheets: timesheets.filter((timesheet) => timesheet.status === 'submitted' || timesheet.status === 'correction-requested').length,
        pendingPto: ptoRequests.filter((request) => request.status === 'pending').length,
        pendingSwaps: swapRequests.filter((request) => request.status === 'pending' || request.status === 'accepted').length,
        inventoryAlerts: inventoryItems.filter((item) => item.quantityOnHand <= item.reorderPoint).length,
        canteenBalanceAlerts: ledgers.filter((ledger) => Number(ledger.balance) > 0).length,
        pendingReviews: reviews.filter((review) => review.status !== 'hr-approved').length,
        recentDiscipline: [...disciplineRecords]
          .sort((left, right) => right.incidentDate.localeCompare(left.incidentDate))
          .slice(0, 5),
      });

      const failed = results.filter((result) => result.status === 'rejected');
      setLoadError(failed.length ? 'Some dashboard summaries could not be refreshed. Showing the latest available data where possible.' : '');
      setIsLoading(false);
    });
  }, []);

  const metrics = useMemo<DashboardMetric[]>(() => [
    { key: 'employees', label: 'Total employees', value: String(summary.totalEmployees), helper: `${summary.activeEmployees} active right now`, moduleKey: 'employees' },
    { key: 'onboarding', label: 'Pending onboarding', value: String(summary.pendingOnboarding), helper: 'Checklists not yet approved', moduleKey: 'onboarding' },
    { key: 'training', label: 'Training completion', value: summary.trainingCompletion, helper: 'Completed assignments across current records', moduleKey: 'training' },
    { key: 'attendance', label: 'Attendance today', value: String(summary.attendanceToday), helper: 'Employees clocked in today', moduleKey: 'timekeeping' },
    { key: 'timesheets', label: 'Pending timesheets', value: String(summary.pendingTimesheets), helper: 'Submitted or correction-requested', moduleKey: 'timesheets' },
    { key: 'pto', label: 'Pending PTO', value: String(summary.pendingPto), helper: 'Leave requests awaiting a decision', moduleKey: 'leave' },
    { key: 'swaps', label: 'Pending swaps', value: String(summary.pendingSwaps), helper: 'Temporary schedule swaps still open', moduleKey: 'swaps' },
    { key: 'inventory', label: 'Inventory alerts', value: String(summary.inventoryAlerts), helper: 'Items at or below reorder point', moduleKey: 'inventory' },
    { key: 'canteen', label: 'Canteen balance alerts', value: String(summary.canteenBalanceAlerts), helper: 'Employees with outstanding balances', moduleKey: 'canteen' },
    { key: 'reviews', label: 'Pending monthly reviews', value: String(summary.pendingReviews), helper: 'Reviews not yet HR approved', moduleKey: 'reviews' },
  ], [summary]);

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="lead">Live operational snapshot for HR, attendance, scheduling, training, inventory, canteen balances, and review workflows across the standalone NCCC portal.</p>
        </div>
      </div>

      {loadError ? <p className="service-note">{loadError}</p> : null}

      <div className="cards">
        {metrics.map((metric) => (
          <article
            className="summary-card dashboard-metric-card"
            key={metric.key}
            onClick={() => metric.moduleKey ? setActiveModule(metric.moduleKey) : undefined}
          >
            <p className="record-code">{metric.label}</p>
            <p className="summary-name">{isLoading ? '...' : metric.value}</p>
            <p>{metric.helper}</p>
          </article>
        ))}
      </div>

      <section className="role-admin-section">
        <div className="page-heading-row">
          <div>
            <h3>Recent discipline records</h3>
            <p className="lead">Quick visibility into the latest write-ups and warnings that may need follow-up.</p>
          </div>
        </div>
        <div className="cards">
          {summary.recentDiscipline.length ? summary.recentDiscipline.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-card-header">
                <h3>{record.severity}</h3>
              </div>
              <p>{record.summary}</p>
              <p>{record.incidentDate} · {record.status}</p>
            </article>
          )) : (
            <article className="empty-card">
              <h3>No recent discipline records</h3>
              <p>{isLoading ? 'Loading recent records.' : 'Recent write-ups will appear here once records exist.'}</p>
            </article>
          )}
        </div>
      </section>

      <section className="role-admin-section">
        <div className="page-heading-row">
          <div>
            <h3>Module access</h3>
            <p className="lead">Open a module directly from the dashboard. Cards stay visible even when the current standalone role cannot enter them.</p>
          </div>
        </div>
        <div className="module-grid">
          {employeePortalModules
            .filter((module) => module.key !== 'dashboard')
            .map((module) => {
              const disabled = !hasModuleAccess(module.key);
              return (
                <EmployeePortalModuleCard
                  disabled={disabled}
                  helperText={disabled ? explainModuleAccess(module.key) : undefined}
                  key={module.key}
                  module={module}
                  onOpen={setActiveModule}
                />
              );
            })}
        </div>
      </section>
    </section>
  );
}
