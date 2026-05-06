import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { getTimekeepingServiceStatus, timekeepingService } from '../services/timekeepingService';
import type { Employee } from '../types/employeeTypes';
import type { TimesheetRecord, TimesheetStatus } from '../types/attendanceTypes';

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [correctionId, setCorrectionId] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [serviceMode, setServiceMode] = useState<'api' | 'fallback'>('fallback');
  const [serviceMessage, setServiceMessage] = useState('Using local fallback data until the backend is available.');

  const refresh = async () => {
    setTimesheets(await timekeepingService.listTimesheets());
    const status = getTimekeepingServiceStatus();
    setServiceMode(status.mode);
    setServiceMessage(status.message ?? '');
  };

  useEffect(() => {
    void Promise.all([timekeepingService.listTimesheets(), employeeService.listEmployees()]).then(
      ([list, emps]) => {
        const status = getTimekeepingServiceStatus();
        setServiceMode(status.mode);
        setServiceMessage(status.message ?? '');
        setTimesheets(list);
        setEmployees(emps);
        setEmpId(emps[0]?.id ?? '');
        setLoadError('');
        setIsLoading(false);
      },
      (error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load timesheets.');
        setIsLoading(false);
      },
    );
  }, []);

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empId || !periodStart || !periodEnd) {
      setFormError('Employee, period start, and period end are required.');
      return;
    }
    if (periodEnd < periodStart) {
      setFormError('Period end must be on or after period start.');
      return;
    }
    setFormError('');
    await timekeepingService.createTimesheet(empId, periodStart, periodEnd);
    await refresh();
    setPeriodStart('');
    setPeriodEnd('');
  };

  const updateStatus = async (id: string, status: TimesheetStatus, notes?: string) => {
    await timekeepingService.updateTimesheetStatus(id, status, notes);
    await refresh();
    if (status === 'correction-requested') {
      setCorrectionId('');
      setCorrectionReason('');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Timesheet Management</h2>
          <p className="lead">Create timesheet periods, track submission status, and persist approval or correction workflows through the live API when available.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 008 timesheets" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {serviceMode === 'fallback' && !loadError && <p className="service-note">Backend unavailable. Using local fallback timesheet data. {serviceMessage}</p>}
      {serviceMode === 'api' && !loadError && <p className="service-note success">Live API mode is active for timesheets and correction workflows.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitCreate}>
          <h3>Create timesheet</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
                ))}
              </select>
            </label>
            <label>Period start *
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
            </label>
            <label>Period end *
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Create timesheet</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading timesheets" message="Fetching timesheet periods, statuses, and approvals." /> : timesheets.length ? timesheets.map((ts) => (
            <article className="record-card" key={ts.id}>
              <div className="record-card-header">
                <h3>{empName(employees, ts.employeeId)}</h3>
                <EmployeePortalStatusBadge status={ts.status} />
              </div>
              <p>Period: {ts.periodStart} to {ts.periodEnd}</p>
              <p>Regular: {ts.regularHours}h · Overtime: {ts.overtimeHours}h</p>
              {ts.correctionNotes && <p>Correction notes: {ts.correctionNotes}</p>}
              {ts.approvedBy && <p>Approved by {ts.approvedBy}{ts.approvedAt ? ` at ${new Date(ts.approvedAt).toLocaleString()}` : ''}</p>}
              <div className="button-row">
                {ts.status === 'draft' && (
                  <button className="secondary" type="button" onClick={() => updateStatus(ts.id, 'submitted')}>Submit</button>
                )}
                {ts.status === 'submitted' && (
                  <>
                    <button className="primary" type="button" onClick={() => updateStatus(ts.id, 'approved')}>Approve</button>
                    <button className="secondary" type="button" onClick={() => setCorrectionId(ts.id)}>Request correction</button>
                  </>
                )}
                {ts.status === 'correction-requested' && (
                  <button className="secondary" type="button" onClick={() => updateStatus(ts.id, 'submitted')}>Re-submit</button>
                )}
              </div>
            </article>
          )) : <EmptyStateCard title="No timesheets yet" message="Create a timesheet period above for an employee." />}
        </div>
      </div>

      {correctionId && (
        <section className="role-admin-section">
          <div>
            <h3>Request correction</h3>
            <p className="lead">Provide the reason for the correction request.</p>
          </div>
          <div className="filter-card">
            <label className="full-width">Correction reason
              <input value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="Describe what needs to be corrected" />
            </label>
            <div className="button-row">
              <button className="primary" type="button" onClick={() => updateStatus(correctionId, 'correction-requested', correctionReason)}>Submit correction request</button>
              <button className="secondary" type="button" onClick={() => { setCorrectionId(''); setCorrectionReason(''); }}>Cancel</button>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
