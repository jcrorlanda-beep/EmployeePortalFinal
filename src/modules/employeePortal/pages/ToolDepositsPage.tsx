import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { equipmentService, getEquipmentServiceStatus } from '../services/equipmentService';
import type { Employee } from '../types/employeeTypes';
import type { ToolDeposit, ToolDepositStatus } from '../types/equipmentTypes';

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function ToolDepositsPage() {
  const [deposits, setDeposits] = useState<ToolDeposit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState('');
  const [depositDesc, setDepositDesc] = useState('');
  const [formulaCode, setFormulaCode] = useState('CONFIGURED_TOOL_DEPOSIT');
  const [initialAmount, setInitialAmount] = useState(0);
  const [refundable, setRefundable] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setDeposits(await equipmentService.listToolDeposits());
  };

  useEffect(() => {
    void Promise.all([equipmentService.listToolDeposits(), employeeService.listEmployees()]).then(
      ([deps, emps]) => {
        setDeposits(deps);
        setEmployees(emps);
        setEmpId(emps[0]?.id ?? '');
        setLoadError('');
        setIsLoading(false);
      },
      (error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load tool deposits.');
        setIsLoading(false);
      },
    );
  }, []);

  const submitDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empId || !depositDesc.trim() || !formulaCode.trim()) {
      setFormError('Employee, description, and formula code are required.');
      return;
    }
    setFormError('');
    try {
      await equipmentService.createToolDeposit(
        empId,
        depositDesc.trim(),
        formulaCode.trim(),
        initialAmount,
        refundable,
        { notes: notes.trim() || undefined },
      );
      await refresh();
      setDepositDesc('');
      setFormulaCode('CONFIGURED_TOOL_DEPOSIT');
      setInitialAmount(0);
      setRefundable(true);
      setNotes('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create tool deposit.');
    }
  };

  const updateStatus = async (id: string, status: ToolDepositStatus) => {
    try {
      await equipmentService.updateDepositStatus(id, status);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update tool deposit.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Tool Deposit Management</h2>
          <p className="lead">Track tool deposits held from employees. Amounts remain formula-ready, and refund or forfeit actions update live balances without posting final payroll deductions.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 017 tool deposits" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getEquipmentServiceStatus().available && <p className="service-note">Tool deposit backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitDeposit}>
          <h3>Add tool deposit</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
                ))}
              </select>
            </label>
            <label>Description *
              <input value={depositDesc} onChange={(e) => setDepositDesc(e.target.value)} placeholder="e.g. Diagnostic Scanner deposit" required />
            </label>
            <label>Amount formula code *
              <input value={formulaCode} onChange={(e) => setFormulaCode(e.target.value)} placeholder="CONFIGURED_TOOL_DEPOSIT" required />
            </label>
            <label>Initial amount
              <input type="number" min="0" value={initialAmount} onChange={(e) => setInitialAmount(Number(e.target.value))} />
            </label>
            <label className="full-width">Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </label>
            <label className="inline-check full-width">
              <input type="checkbox" checked={refundable} onChange={(e) => setRefundable(e.target.checked)} /> Refundable
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add deposit</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading tool deposits" message="Fetching tool deposits and employee-linked balances." /> : deposits.length ? deposits.map((deposit) => (
            <article className="record-card" key={deposit.id}>
              <div className="record-card-header">
                <h3>{empName(employees, deposit.employeeId)} — {deposit.description}</h3>
                <EmployeePortalStatusBadge status={deposit.status} />
              </div>
              <p>Formula: <code>{deposit.amountFormulaCode}</code> · Payroll reference: <code>{deposit.payrollFormulaCode || deposit.amountFormulaCode}</code></p>
              <p>Initial amount: {deposit.initialAmount} · Balance: {deposit.balance} · Refundable: {deposit.refundable ? 'Yes' : 'No'}</p>
              {deposit.notes && <p>Notes: {deposit.notes}</p>}
              {deposit.resolutionNotes && <p>Resolution: {deposit.resolutionNotes}</p>}
              {deposit.status === 'active' && (
                <div className="button-row">
                  <button className="primary" type="button" onClick={() => updateStatus(deposit.id, 'refunded')}>Mark refunded</button>
                  <button className="secondary" type="button" onClick={() => updateStatus(deposit.id, 'forfeited')}>Mark forfeited</button>
                  <button className="secondary" type="button" onClick={() => updateStatus(deposit.id, 'waived')}>Mark waived</button>
                </div>
              )}
            </article>
          )) : <EmptyStateCard title="No tool deposits yet" message="Add a tool deposit above." />}
        </div>
      </div>
    </section>
  );
}
