import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { isStaleRecordError } from '../services/employeePortalApi';
import { getSchedulingServiceStatus, schedulingService } from '../services/schedulingService';
import type { Employee } from '../types/employeeTypes';
import type { PtoRequest, PtoStatus, PtoType } from '../types/scheduleTypes';

const ptoTypeOptions: PtoType[] = ['Vacation', 'Sick', 'Emergency', 'Unpaid', 'Other'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function LeaveRequestsPage() {
  const [requests, setRequests] = useState<PtoRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState('');
  const [ptoType, setPtoType] = useState<PtoType>('Vacation');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const refresh = async () => {
    setRequests(await schedulingService.listPtoRequests());
  };

  useEffect(() => {
    void (async () => {
      try {
        const [list, emps] = await Promise.all([schedulingService.listPtoRequests(), employeeService.listEmployees()]);
        setRequests(list);
        setEmployees(emps);
        setEmpId(emps[0]?.id ?? '');
        const today = new Date().toISOString().slice(0, 10);
        setStartsOn(today);
        setEndsOn(today);
        setLoadError('');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load leave requests.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRequest) return;
    if (!empId || !startsOn || !endsOn || !reason.trim()) {
      setFormError('Employee, dates, and reason are required.');
      return;
    }
    if (endsOn < startsOn) {
      setFormError('End date must be on or after start date.');
      return;
    }
    setFormError('');
    setIsSubmittingRequest(true);
    try {
      await schedulingService.createPtoRequest(empId, ptoType, startsOn, endsOn, reason.trim(), halfDay);
      await refresh();
      setReason('');
      setHalfDay(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to submit leave request.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const updateStatus = async (request: PtoRequest, status: PtoStatus) => {
    if (pendingStatusId) return;
    setPendingStatusId(request.id);
    try {
      await schedulingService.updatePtoStatus(request.id, status, undefined, request.updatedAt);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update leave request.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setPendingStatusId(null);
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>PTO / Leave Requests</h2>
          <p className="lead">Submit leave requests, review pending approvals, and track leave history through live backend persistence.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 010 leave requests" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getSchedulingServiceStatus().available && <p className="service-note">Leave backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitRequest}>
          <h3>New leave request</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
                ))}
              </select>
            </label>
            <label>Leave type
              <select value={ptoType} onChange={(e) => setPtoType(e.target.value as PtoType)}>
                {ptoTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Start date *
              <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
            </label>
            <label>End date *
              <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} required />
            </label>
            <label className="full-width">Reason *
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the reason for leave" required />
            </label>
            <label className="inline-check full-width">
              <input type="checkbox" checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} /> Half day
            </label>
          </div>
          <div className="button-row">
            <button className="primary" disabled={isSubmittingRequest} type="submit">{isSubmittingRequest ? 'Submitting…' : 'Submit request'}</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading leave requests" message="Fetching leave requests and approval statuses." /> : requests.length ? requests.map((req) => (
            <article className="record-card" key={req.id}>
              <div className="record-card-header">
                <h3>{empName(employees, req.employeeId)} — {req.leaveType ?? req.type}</h3>
                <EmployeePortalStatusBadge status={req.status} />
              </div>
              <p>{req.startDate ?? req.startsOn} to {req.endDate ?? req.endsOn}{(req.isHalfDay ?? req.halfDay) ? ' (half day)' : ''}</p>
              <p>Reason: {req.reason}</p>
              {req.reviewedBy && <p>Reviewed by {req.reviewedBy}{req.reviewedAt ? ` at ${new Date(req.reviewedAt).toLocaleString()}` : ''}</p>}
              {req.status === 'pending' && (
                <div className="button-row">
                  <button className="primary" disabled={pendingStatusId === req.id} type="button" onClick={() => updateStatus(req, 'approved')}>{pendingStatusId === req.id ? 'Updating…' : 'Approve'}</button>
                  <button className="secondary" disabled={pendingStatusId === req.id} type="button" onClick={() => updateStatus(req, 'rejected')}>Reject</button>
                </div>
              )}
            </article>
          )) : <EmptyStateCard title="No leave requests yet" message="Submit a leave request above." />}
        </div>
      </div>
    </section>
  );
}
