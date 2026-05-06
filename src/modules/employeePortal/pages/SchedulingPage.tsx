import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { isStaleRecordError } from '../services/employeePortalApi';
import { getSchedulingServiceStatus, schedulingService } from '../services/schedulingService';
import type { Employee } from '../types/employeeTypes';
import type { ScheduleDay, ScheduleInstance, ScheduleTemplate } from '../types/scheduleTypes';

const allDays: ScheduleDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function SchedulingPage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [instances, setInstances] = useState<ScheduleInstance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tplName, setTplName] = useState('');
  const [tplDept, setTplDept] = useState('');
  const [tplStart, setTplStart] = useState('08:00');
  const [tplEnd, setTplEnd] = useState('17:00');
  const [tplDays, setTplDays] = useState<ScheduleDay[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [instEmpId, setInstEmpId] = useState('');
  const [instTplId, setInstTplId] = useState('');
  const [instDate, setInstDate] = useState('');
  const [tplFormError, setTplFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [isPublishingInstance, setIsPublishingInstance] = useState(false);

  const refresh = async () => {
    const [tpls, insts] = await Promise.all([schedulingService.listTemplates(), schedulingService.listInstances()]);
    setTemplates(tpls);
    setInstances(insts);
    setInstTplId((cur) => cur || tpls[0]?.id || '');
  };

  useEffect(() => {
    void (async () => {
      try {
        const [tpls, insts, emps] = await Promise.all([
          schedulingService.listTemplates(),
          schedulingService.listInstances(),
          employeeService.listEmployees(),
        ]);
        setTemplates(tpls);
        setInstances(insts);
        setEmployees(emps);
        setInstEmpId(emps[0]?.id ?? '');
        setInstTplId(tpls[0]?.id ?? '');
        setInstDate(new Date().toISOString().slice(0, 10));
        setLoadError('');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load scheduling data.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const toggleDay = (day: ScheduleDay) => {
    setTplDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const submitTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingTemplate) return;
    if (!tplName.trim()) {
      setTplFormError('Template name is required.');
      return;
    }
    if (tplDays.length === 0) {
      setTplFormError('Select at least one work day.');
      return;
    }
    setTplFormError('');
    setIsSubmittingTemplate(true);
    try {
      await schedulingService.createTemplate(tplName.trim(), tplDept.trim(), tplStart, tplEnd, tplDays);
      await refresh();
      setTplName('');
      setTplDept('');
      setTplDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } catch (error) {
      setTplFormError(error instanceof Error ? error.message : 'Unable to create schedule template.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  const publishInstance = async () => {
    if (!instEmpId || !instTplId || !instDate || isPublishingInstance) return;
    setIsPublishingInstance(true);
    try {
      await schedulingService.publishInstance(instEmpId, instTplId, instDate);
      await refresh();
    } catch (error) {
      setTplFormError(error instanceof Error ? error.message : 'Unable to publish schedule instance.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setIsPublishingInstance(false);
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Employee Scheduling</h2>
          <p className="lead">Create schedule templates, publish instances to employees, and track work dates through the standalone backend API.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 009 scheduling" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getSchedulingServiceStatus().available && <p className="service-note">Scheduling backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitTemplate}>
          <h3>Add schedule template</h3>
          {tplFormError && <p className="form-error">{tplFormError}</p>}
          <div className="form-grid two-column">
            <label>Template name *
              <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. Day Shift" required />
            </label>
            <label>Department ID
              <input value={tplDept} onChange={(e) => setTplDept(e.target.value)} placeholder="dept_shop" />
            </label>
            <label>Start time
              <input type="time" value={tplStart} onChange={(e) => setTplStart(e.target.value)} />
            </label>
            <label>End time
              <input type="time" value={tplEnd} onChange={(e) => setTplEnd(e.target.value)} />
            </label>
            <div className="full-width">
              <p>Work days</p>
              <div className="button-row">
                {allDays.map((day) => (
                  <label key={day} className="inline-check">
                    <input type="checkbox" checked={tplDays.includes(day)} onChange={() => toggleDay(day)} /> {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="button-row">
            <button className="primary" disabled={isSubmittingTemplate} type="submit">{isSubmittingTemplate ? 'Saving…' : 'Add template'}</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading schedules" message="Fetching schedule templates and published instances." /> : templates.length ? templates.map((tpl) => (
            <article className="record-card" key={tpl.id}>
              <div className="record-card-header">
                <h3>{tpl.name}</h3>
                <EmployeePortalStatusBadge status="template" />
              </div>
              <p>{tpl.startTime} – {tpl.endTime} · Days: {tpl.days.join(', ')}</p>
              <p>Published instances: {instances.filter((i) => i.templateId === tpl.id).length}</p>
            </article>
          )) : <EmptyStateCard title="No templates yet" message="Add a schedule template above." />}
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Publish schedule instance</h3>
          <p className="lead">Assign a template to an employee for a specific work date.</p>
        </div>
        <div className="filter-card training-assignment-form">
          <label>Employee
            <select value={instEmpId} onChange={(e) => setInstEmpId(e.target.value)}>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
              ))}
            </select>
          </label>
          <label>Template
            <select value={instTplId} onChange={(e) => setInstTplId(e.target.value)}>
              {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
            </select>
          </label>
          <label>Work date
            <input type="date" value={instDate} onChange={(e) => setInstDate(e.target.value)} />
          </label>
          <button className="primary align-end" disabled={isPublishingInstance} type="button" onClick={publishInstance}>{isPublishingInstance ? 'Publishing…' : 'Publish instance'}</button>
        </div>
      </section>

      <section className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading published schedules" message="Fetching employee schedule instances." /> : instances.length ? instances.map((inst) => (
            <article className="record-card" key={inst.id}>
              <div className="record-card-header">
                <h3>{empName(employees, inst.employeeId)}</h3>
                <EmployeePortalStatusBadge status={inst.status} />
              </div>
              <p>Date: {inst.workDate} · Template: {templates.find((t) => t.id === inst.templateId)?.name ?? inst.templateId}</p>
            </article>
          )) : <EmptyStateCard title="No schedule instances yet" message="Publish an instance above to assign a schedule to an employee." />}
        </div>
      </section>
    </section>
  );
}
