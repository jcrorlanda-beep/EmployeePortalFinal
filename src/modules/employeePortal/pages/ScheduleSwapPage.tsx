import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { isStaleRecordError } from '../services/employeePortalApi';
import { getSchedulingServiceStatus, schedulingService } from '../services/schedulingService';
import type { Employee } from '../types/employeeTypes';
import type { ScheduleInstance, ScheduleSwapRequest, SwapStatus } from '../types/scheduleTypes';

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function ScheduleSwapPage() {
  const [swaps, setSwaps] = useState<ScheduleSwapRequest[]>([]);
  const [instances, setInstances] = useState<ScheduleInstance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requesterId, setRequesterId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [requesterNote, setRequesterNote] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);
  const [pendingSwapId, setPendingSwapId] = useState<string | null>(null);

  const refresh = async () => {
    const [swapList, instList] = await Promise.all([
      schedulingService.listSwapRequests(),
      schedulingService.listInstances(),
    ]);
    setSwaps(swapList);
    setInstances(instList);
    setInstanceId((cur) => cur || instList[0]?.id || '');
  };

  useEffect(() => {
    void (async () => {
      try {
        const [swapList, instList, emps] = await Promise.all([
          schedulingService.listSwapRequests(),
          schedulingService.listInstances(),
          employeeService.listEmployees(),
        ]);
        setSwaps(swapList);
        setInstances(instList);
        setEmployees(emps);
        setRequesterId(emps[0]?.id ?? '');
        setTargetId(emps[1]?.id ?? emps[0]?.id ?? '');
        setInstanceId(instList[0]?.id ?? '');
        setLoadError('');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load schedule swaps.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const submitSwap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingSwap) return;
    if (!requesterId || !targetId || !instanceId) {
      setFormError('Requester, target employee, and schedule instance are required.');
      return;
    }
    if (requesterId === targetId) {
      setFormError('Requester and target employee must be different.');
      return;
    }
    setFormError('');
    setIsSubmittingSwap(true);
    try {
      await schedulingService.createSwapRequest(requesterId, targetId, instanceId, requesterNote);
      await refresh();
      setRequesterNote('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to submit schedule swap request.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  const updateStatus = async (swap: ScheduleSwapRequest, status: SwapStatus, note?: string) => {
    if (pendingSwapId) return;
    setPendingSwapId(swap.id);
    try {
      if (status === 'accepted') {
        await schedulingService.acceptSwapRequest(swap.id, note, swap.updatedAt);
      } else if (status === 'approved' || status === 'manager-approved') {
        await schedulingService.approveSwapRequest(swap.id, note, swap.updatedAt);
      } else if (status === 'cancelled') {
        await schedulingService.cancelSwapRequest(swap.id, swap.updatedAt);
      } else {
        await schedulingService.rejectSwapRequest(swap.id, note, swap.updatedAt);
      }
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update schedule swap.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setPendingSwapId(null);
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Schedule Swap Requests</h2>
          <p className="lead">Employees can request temporary schedule swaps. Target employee and manager can accept, reject, approve, or cancel without changing regular templates permanently.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 011 schedule swap" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getSchedulingServiceStatus().available && <p className="service-note">Schedule swap backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitSwap}>
          <h3>New swap request</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Requesting employee
              <select value={requesterId} onChange={(e) => setRequesterId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </label>
            <label>Target employee
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </label>
            <label>Schedule instance
              <select value={instanceId} onChange={(e) => setInstanceId(e.target.value)}>
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.workDate} — {empName(employees, inst.employeeId)}</option>
                ))}
              </select>
            </label>
            <label>Requester note
              <input value={requesterNote} onChange={(e) => setRequesterNote(e.target.value)} placeholder="Optional note" />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" disabled={isSubmittingSwap} type="submit">{isSubmittingSwap ? 'Submitting…' : 'Submit swap request'}</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading schedule swaps" message="Fetching swap requests and related schedule instances." /> : swaps.length ? swaps.map((swap) => (
            <article className="record-card" key={swap.id}>
              <div className="record-card-header">
                <h3>{empName(employees, swap.requesterEmployeeId)} ↔ {empName(employees, swap.targetEmployeeId)}</h3>
                <EmployeePortalStatusBadge status={swap.status} />
              </div>
              <p>Instance: {instances.find((i) => i.id === swap.scheduleInstanceId)?.workDate ?? swap.scheduleInstanceId}</p>
              <p>Temporary only: {swap.temporaryOnly === false ? 'No' : 'Yes'}</p>
              {swap.reason && <p>Reason: {swap.reason}</p>}
              {swap.requesterNote && <p>Requester note: {swap.requesterNote}</p>}
              {swap.targetNote && <p>Target note: {swap.targetNote}</p>}
              {swap.managerNote && <p>Manager note: {swap.managerNote}</p>}
              {swap.status === 'pending' && (
                <div className="button-row">
                  <button className="primary" disabled={pendingSwapId === swap.id} type="button" onClick={() => updateStatus(swap, 'accepted', 'Accepted by target')}>{pendingSwapId === swap.id ? 'Updating…' : 'Accept'}</button>
                  <button className="secondary" disabled={pendingSwapId === swap.id} type="button" onClick={() => updateStatus(swap, 'rejected', 'Rejected by target')}>Reject</button>
                  <button className="secondary danger" disabled={pendingSwapId === swap.id} type="button" onClick={() => updateStatus(swap, 'cancelled')}>Cancel</button>
                </div>
              )}
              {swap.status === 'accepted' && (
                <div className="button-row">
                  <button className="primary" disabled={pendingSwapId === swap.id} type="button" onClick={() => updateStatus(swap, 'approved', 'Manager approved')}>{pendingSwapId === swap.id ? 'Updating…' : 'Manager approve'}</button>
                  <button className="secondary" disabled={pendingSwapId === swap.id} type="button" onClick={() => updateStatus(swap, 'rejected', 'Manager rejected')}>Reject</button>
                </div>
              )}
            </article>
          )) : <EmptyStateCard title="No swap requests yet" message="Submit a schedule swap request above." />}
        </div>
      </div>
    </section>
  );
}
