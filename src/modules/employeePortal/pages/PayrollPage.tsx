import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { getPayrollServiceStatus, payrollService } from '../services/payrollService';
import { payrollFormulaSafetyChecklist } from '../utils/payrollFormulaUtils';
import type { Employee } from '../types/employeeTypes';
import type { PayrollComponent, PayrollPeriod, PayrollProfile, PayType, PayrollComponentType } from '../types/payrollTypes';

const payTypeOptions: PayType[] = ['hourly', 'salary', 'contract'];
const componentTypeOptions: PayrollComponentType[] = ['earning', 'deduction', 'benefit', 'deposit', '13th-month-preview'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function PayrollPage() {
  const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profEmpId, setProfEmpId] = useState('');
  const [payType, setPayType] = useState<PayType>('salary');
  const [baseFormula, setBaseFormula] = useState('BASE_PAY_CONFIGURED');
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [componentProfileId, setComponentProfileId] = useState('');
  const [componentType, setComponentType] = useState<PayrollComponentType>('earning');
  const [componentLabel, setComponentLabel] = useState('');
  const [componentFormulaCode, setComponentFormulaCode] = useState('');
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [profError, setProfError] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [componentError, setComponentError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const [profs, pers, comps] = await Promise.all([payrollService.listProfiles(), payrollService.listPeriods(), payrollService.listComponents()]);
    setProfiles(profs);
    setPeriods(pers);
    setComponents(comps);
    setComponentProfileId((current) => current || profs[0]?.id || '');
  };

  useEffect(() => {
    void Promise.all([payrollService.listProfiles(), payrollService.listPeriods(), payrollService.listComponents(), employeeService.listEmployees()]).then(
      ([profs, pers, comps, emps]) => {
        setProfiles(profs);
        setPeriods(pers);
        setComponents(comps);
        setEmployees(emps);
        setProfEmpId(emps[0]?.id ?? '');
        setComponentProfileId(profs[0]?.id ?? '');
        setLoadError('');
        setIsLoading(false);
      },
      (error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load payroll data.');
        setIsLoading(false);
      },
    );
  }, []);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profEmpId || !baseFormula.trim()) {
      setProfError('Employee and base formula code are required.');
      return;
    }
    setProfError('');
    try {
      await payrollService.createProfile(profEmpId, payType, baseFormula.trim());
      await refresh();
      setBaseFormula('BASE_PAY_CONFIGURED');
    } catch (error) {
      setProfError(error instanceof Error ? error.message : 'Unable to create payroll profile.');
    }
  };

  const submitPeriod = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!periodName.trim() || !periodStart || !periodEnd) {
      setPeriodError('Name, start date, and end date are required.');
      return;
    }
    if (periodEnd < periodStart) {
      setPeriodError('End date must be on or after start date.');
      return;
    }
    setPeriodError('');
    try {
      await payrollService.createPeriod(periodName.trim(), periodStart, periodEnd);
      await refresh();
      setPeriodName('');
      setPeriodStart('');
      setPeriodEnd('');
    } catch (error) {
      setPeriodError(error instanceof Error ? error.message : 'Unable to create payroll period.');
    }
  };

  const submitComponent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!componentProfileId || !componentLabel.trim() || !componentFormulaCode.trim()) {
      setComponentError('Profile, component label, and formula code are required.');
      return;
    }
    setComponentError('');
    try {
      await payrollService.createComponent(componentProfileId, componentType, componentFormulaCode.trim(), componentLabel.trim());
      await refresh();
      setComponentLabel('');
      setComponentFormulaCode('');
    } catch (error) {
      setComponentError(error instanceof Error ? error.message : 'Unable to create payroll component.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Payroll Preparation</h2>
          <p className="lead">Preparation only. Payroll finalization is intentionally not implemented in this MVP.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 012 payroll" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getPayrollServiceStatus().available && <p className="service-note">Payroll backend unavailable. Live persistence is required for this module.</p>}

      <section className="role-admin-section">
        <div>
          <h3>Safety checklist</h3>
        </div>
        <ul className="checklist">
          {payrollFormulaSafetyChecklist.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitProfile}>
          <h3>Add payroll profile</h3>
          {profError && <p className="form-error">{profError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={profEmpId} onChange={(e) => setProfEmpId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
                ))}
              </select>
            </label>
            <label>Pay type
              <select value={payType} onChange={(e) => setPayType(e.target.value as PayType)}>
                {payTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="full-width">Base formula code *
              <input value={baseFormula} onChange={(e) => setBaseFormula(e.target.value)} placeholder="BASE_PAY_CONFIGURED" required />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add profile</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading payroll profiles" message="Fetching payroll profiles, periods, and components." /> : profiles.length ? profiles.map((profile) => (
            <article className="record-card" key={profile.id}>
              <div className="record-card-header">
                <h3>{empName(employees, profile.employeeId)}</h3>
                <EmployeePortalStatusBadge status={profile.active ? 'active' : 'inactive'} />
              </div>
              <p>Pay type: {profile.payType}</p>
              <p>Base formula: {profile.baseFormulaCode}</p>
            </article>
          )) : <EmptyStateCard title="No payroll profiles yet" message="Add a payroll profile above." />}
        </div>
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitPeriod}>
          <h3>Add pay period</h3>
          {periodError && <p className="form-error">{periodError}</p>}
          <div className="form-grid two-column">
            <label className="full-width">Period name *
              <input value={periodName} onChange={(e) => setPeriodName(e.target.value)} placeholder="e.g. May 2026 Draft" required />
            </label>
            <label>Start date *
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
            </label>
            <label>End date *
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add period</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading payroll periods" message="Fetching payroll periods." /> : periods.length ? periods.map((period) => (
            <article className="record-card" key={period.id}>
              <div className="record-card-header">
                <h3>{period.name}</h3>
                <EmployeePortalStatusBadge status={period.status} />
              </div>
              <p>{period.startsOn} to {period.endsOn}</p>
            </article>
          )) : <EmptyStateCard title="No pay periods yet" message="Add a pay period above." />}
        </div>
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitComponent}>
          <h3>Add payroll component</h3>
          {componentError && <p className="form-error">{componentError}</p>}
          <div className="form-grid two-column">
            <label>Profile
              <select value={componentProfileId} onChange={(e) => setComponentProfileId(e.target.value)}>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{empName(employees, profile.employeeId)} · {profile.payType}</option>
                ))}
              </select>
            </label>
            <label>Component type
              <select value={componentType} onChange={(e) => setComponentType(e.target.value as PayrollComponentType)}>
                {componentTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>Label
              <input value={componentLabel} onChange={(e) => setComponentLabel(e.target.value)} placeholder="Regular pay" />
            </label>
            <label>Formula code
              <input value={componentFormulaCode} onChange={(e) => setComponentFormulaCode(e.target.value)} placeholder="BASE_PAY_CONFIGURED" />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add component</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading payroll components" message="Fetching formula-linked payroll components." /> : components.length ? components.map((component) => (
            <article className="record-card" key={component.id}>
              <div className="record-card-header">
                <h3>{component.label}</h3>
                <EmployeePortalStatusBadge status={component.type} />
              </div>
              <p>Formula code: {component.formulaCode}</p>
              <p>Profile: {profiles.find((profile) => profile.id === component.profileId)?.employeeId ?? component.profileId}</p>
            </article>
          )) : <EmptyStateCard title="No payroll components yet" message="Add a payroll component above." />}
        </div>
      </div>
    </section>
  );
}
