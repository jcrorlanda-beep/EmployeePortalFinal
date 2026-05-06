import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { payrollService } from '../services/payrollService';
import type { Employee } from '../types/employeeTypes';
import type { Payslip, PayrollPeriod, PayrollComponentType } from '../types/payrollTypes';

const componentTypeOptions: PayrollComponentType[] = ['earning', 'deduction', 'benefit', 'deposit', '13th-month-preview'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

const periodName = (periods: PayrollPeriod[], id: string) => {
  return periods.find((p) => p.id === id)?.name ?? id;
};

export function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [lineLabel, setLineLabel] = useState('');
  const [lineType, setLineType] = useState<PayrollComponentType>('earning');
  const [lineFormula, setLineFormula] = useState('');
  const [selectedPayslipId, setSelectedPayslipId] = useState('');
  const [formError, setFormError] = useState('');
  const [lineError, setLineError] = useState('');

  const refresh = async () => {
    const [slips, pers] = await Promise.all([payrollService.listPayslips(), payrollService.listPeriods()]);
    setPayslips(slips);
    setPeriods(pers);
    setPeriodId((cur) => cur || pers[0]?.id || '');
  };

  useEffect(() => {
    void Promise.all([
      payrollService.listPayslips(),
      payrollService.listPeriods(),
      employeeService.listEmployees(),
    ]).then(([slips, pers, emps]) => {
      setPayslips(slips);
      setPeriods(pers);
      setEmployees(emps);
      setEmpId(emps[0]?.id ?? '');
      setPeriodId(pers[0]?.id ?? '');
      setSelectedPayslipId(slips[0]?.id ?? '');
    });
  }, []);

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empId || !periodId) {
      setFormError('Employee and pay period are required.');
      return;
    }
    setFormError('');
    const slip = await payrollService.createPayslip(empId, periodId);
    await refresh();
    setSelectedPayslipId(slip.id);
  };

  const submitLineItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPayslipId || !lineLabel.trim() || !lineFormula.trim()) {
      setLineError('Label and formula code are required.');
      return;
    }
    setLineError('');
    await payrollService.addLineItem(selectedPayslipId, lineLabel.trim(), lineType, lineFormula.trim());
    await refresh();
    setLineLabel('');
    setLineFormula('');
  };

  const selectedPayslip = payslips.find((s) => s.id === selectedPayslipId) ?? null;

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Payslip Preview Foundation</h2>
          <p className="lead">Preview-only payslips reference formula-produced line items and cannot be finalized. All preview amounts are null pending a safe formula evaluator.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 016 payslips" />
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitCreate}>
          <h3>Create payslip</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
                ))}
              </select>
            </label>
            <label>Pay period
              <select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Create payslip</button>
          </div>
        </form>

        <div className="cards single-column">
          {payslips.length ? payslips.map((slip) => (
            <article className="record-card" key={slip.id}>
              <div className="record-card-header">
                <h3>{empName(employees, slip.employeeId)}</h3>
                <EmployeePortalStatusBadge status={slip.status} />
              </div>
              <p>Period: {periodName(periods, slip.payrollPeriodId)}</p>
              <p>Line items: {slip.lineItems.length}</p>
              <button className="secondary" type="button" onClick={() => setSelectedPayslipId(slip.id)}>View / add line items</button>
            </article>
          )) : <EmptyStateCard title="No payslips yet" message="Create a payslip above." />}
        </div>
      </div>

      {selectedPayslip && (
        <section className="role-admin-section">
          <div>
            <h3>Line items — {empName(employees, selectedPayslip.employeeId)} · {periodName(periods, selectedPayslip.payrollPeriodId)}</h3>
            <p className="lead">Preview amounts are null. Requires safe formula evaluator for computation. No finalization is available.</p>
          </div>
          <form className="filter-card" onSubmit={submitLineItem}>
            {lineError && <p className="form-error">{lineError}</p>}
            <label>Label *
              <input value={lineLabel} onChange={(e) => setLineLabel(e.target.value)} placeholder="e.g. Base Pay" required />
            </label>
            <label>Component type
              <select value={lineType} onChange={(e) => setLineType(e.target.value as PayrollComponentType)}>
                {componentTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Formula code *
              <input value={lineFormula} onChange={(e) => setLineFormula(e.target.value)} placeholder="BASE_PAY_CONFIGURED" required />
            </label>
            <button className="primary" type="submit">Add line item</button>
          </form>
          <div className="cards single-column">
            {selectedPayslip.lineItems.length ? selectedPayslip.lineItems.map((li) => (
              <article className="record-card" key={li.id}>
                <div className="record-card-header">
                  <h3>{li.label}</h3>
                  <EmployeePortalStatusBadge status={li.componentType} />
                </div>
                <p>Formula: <code>{li.formulaCode}</code></p>
                <p>Preview amount: null — Requires safe formula evaluator</p>
              </article>
            )) : <EmptyStateCard title="No line items yet" message="Add a line item above." />}
          </div>
        </section>
      )}
    </section>
  );
}
