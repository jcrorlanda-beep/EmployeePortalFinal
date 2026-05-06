import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { getTimekeepingServiceStatus, timekeepingService } from '../services/timekeepingService';
import type { Employee } from '../types/employeeTypes';
import type { AttendanceEventType, AttendanceRecord } from '../types/attendanceTypes';

const eventTypeOptions: AttendanceEventType[] = ['in', 'out', 'break-start', 'break-end'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function TimekeepingPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState('');
  const [eventType, setEventType] = useState<AttendanceEventType>('in');
  const [clockedAt, setClockedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [correctionId, setCorrectionId] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [serviceMode, setServiceMode] = useState<'api' | 'fallback'>('fallback');
  const [serviceMessage, setServiceMessage] = useState('Using local fallback data until the backend is available.');

  const refresh = async () => {
    const [list] = await Promise.all([timekeepingService.listAttendance()]);
    const status = getTimekeepingServiceStatus();
    setServiceMode(status.mode);
    setServiceMessage(status.message ?? '');
    setRecords(list);
  };

  useEffect(() => {
    void Promise.all([timekeepingService.listAttendance(), employeeService.listEmployees()]).then(
      ([list, emps]) => {
        const status = getTimekeepingServiceStatus();
        setServiceMode(status.mode);
        setServiceMessage(status.message ?? '');
        setRecords(list);
        setEmployees(emps);
        setEmpId(emps[0]?.id ?? '');
        setClockedAt(new Date().toISOString().slice(0, 16));
        setLoadError('');
        setIsLoading(false);
      },
      (error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load attendance data.');
        setIsLoading(false);
      },
    );
  }, []);

  const submitClockEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empId || !clockedAt) {
      setFormError('Employee and clock time are required.');
      return;
    }
    setFormError('');
    await timekeepingService.addClockEvent(empId, eventType, new Date(clockedAt).toISOString(), notes);
    await refresh();
    setNotes('');
  };

  const submitCorrection = async () => {
    if (!correctionId || !correctionNotes.trim()) return;
    await timekeepingService.requestCorrection(correctionId, correctionNotes);
    await refresh();
    setCorrectionId('');
    setCorrectionNotes('');
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Timekeeping Foundation</h2>
          <p className="lead">Manual clock events are now API-backed when the backend is available, while remaining correction-ready and compatible with future device feeds.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 007 timekeeping" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {serviceMode === 'fallback' && !loadError && <p className="service-note">Backend unavailable. Using local fallback attendance data. {serviceMessage}</p>}
      {serviceMode === 'api' && !loadError && <p className="service-note success">Live API mode is active for attendance records and correction requests.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitClockEvent}>
          <h3>Add clock event</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
                ))}
              </select>
            </label>
            <label>Event type
              <select value={eventType} onChange={(e) => setEventType(e.target.value as AttendanceEventType)}>
                {eventTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Clock time *
              <input type="datetime-local" value={clockedAt} onChange={(e) => setClockedAt(e.target.value)} required />
            </label>
            <label>Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note" />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add event</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading attendance records" message="Fetching clock events and correction statuses." /> : records.length ? records.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-card-header">
                <h3>{empName(employees, record.employeeId)} — {record.type.toUpperCase()}</h3>
                <EmployeePortalStatusBadge status={record.correctionStatus} />
              </div>
              <p>Clocked at: {new Date(record.clockedAt).toLocaleString()}</p>
              <p>Source: {record.source}{record.notes ? ` · ${record.notes}` : ''}</p>
              {record.correctionStatus === 'none' && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setCorrectionId(record.id)}
                >
                  Request correction
                </button>
              )}
            </article>
          )) : <EmptyStateCard title="No clock events yet" message="Add a clock event above to start tracking attendance." />}
        </div>
      </div>

      {correctionId && (
        <section className="role-admin-section">
          <div>
            <h3>Correction request</h3>
            <p className="lead">Describe the correction needed for this clock event.</p>
          </div>
          <div className="filter-card">
            <label className="full-width">Correction notes
              <input value={correctionNotes} onChange={(e) => setCorrectionNotes(e.target.value)} placeholder="Describe the correction needed" />
            </label>
            <div className="button-row">
              <button className="primary" type="button" onClick={submitCorrection}>Submit correction</button>
              <button className="secondary" type="button" onClick={() => { setCorrectionId(''); setCorrectionNotes(''); }}>Cancel</button>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
