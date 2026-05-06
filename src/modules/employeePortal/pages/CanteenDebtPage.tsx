import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { canteenService, getCanteenServiceStatus } from '../services/canteenService';
import type { Employee } from '../types/employeeTypes';
import type { CanteenDeductionType, CanteenTransaction, CanteenTransactionStatus, EmployeeDebtLedger } from '../types/canteenTypes';

const deductionTypeOptions: CanteenDeductionType[] = ['cash', 'salary-deduction'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function CanteenDebtPage() {
  const pageSize = 6;
  const [transactions, setTransactions] = useState<CanteenTransaction[]>([]);
  const [ledgers, setLedgers] = useState<EmployeeDebtLedger[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [deductionType, setDeductionType] = useState<CanteenDeductionType>('salary-deduction');
  const [formulaCode, setFormulaCode] = useState('CONFIGURED_CANTEEN_DEDUCTION');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CanteenTransactionStatus>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount-desc'>('newest');
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const [txList, ledgerList] = await Promise.all([canteenService.listTransactions(), canteenService.listLedgers()]);
    setTransactions(txList);
    setLedgers(ledgerList);
  };

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = transactions.filter((tx) => {
      const statusMatch = statusFilter === 'all' || tx.status === statusFilter;
      const text = `${empName(employees, tx.employeeId)} ${tx.description} ${tx.payrollFormulaCode}`.toLowerCase();
      const queryMatch = !normalizedQuery || text.includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
    return [...filtered].sort((left, right) => {
      if (sortBy === 'amount-desc') return right.amount - left.amount;
      return sortBy === 'oldest'
        ? left.transactionDate.localeCompare(right.transactionDate)
        : right.transactionDate.localeCompare(left.transactionDate);
    });
  }, [employees, query, sortBy, statusFilter, transactions]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const pagedTransactions = useMemo(
    () => filteredTransactions.slice((page - 1) * pageSize, page * pageSize),
    [filteredTransactions, page, pageSize],
  );

  useEffect(() => {
    void Promise.all([
      canteenService.listTransactions(),
      canteenService.listLedgers(),
      employeeService.listEmployees(),
    ]).then(([txList, ledgerList, emps]) => {
      setTransactions(txList);
      setLedgers(ledgerList);
      setEmployees(emps);
      setEmpId(emps[0]?.id ?? '');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load canteen balances.');
      setIsLoading(false);
    });
  }, []);

  const submitTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empId || amount <= 0 || !description.trim() || !transactionDate || !formulaCode.trim()) {
      setFormError('Employee, amount > 0, description, date, and formula code are required.');
      return;
    }
    setFormError('');
    try {
      await canteenService.createTransaction(empId, amount, description.trim(), transactionDate, deductionType, formulaCode.trim());
      await refresh();
      setAmount(0);
      setDescription('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create canteen transaction.');
    }
  };

  const updateStatus = async (id: string, status: CanteenTransactionStatus) => {
    try {
      if (status === 'deducted') {
        await canteenService.markPayrollDeduction(id, 'Marked for payroll deduction.');
      } else if (status === 'paid' || status === 'partially-paid') {
        await canteenService.recordPayment(id, undefined, 'Recorded manual payment.');
      } else {
        await canteenService.updateTransaction(id, { status });
      }
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update canteen transaction.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Canteen Debt / Paycut Tracking</h2>
          <p className="lead">Track canteen transactions and employee balances. Deductions remain formula and payroll-component ready, with no final payroll posting in this module.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 022 canteen debt" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getCanteenServiceStatus().available && <p className="service-note">Canteen backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitTransaction}>
          <h3>Add canteen transaction</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeNumber}</option>
                ))}
              </select>
            </label>
            <label>Amount *
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
            </label>
            <label>Description *
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Lunch - May 6" required />
            </label>
            <label>Transaction date *
              <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
            </label>
            <label>Deduction type
              <select value={deductionType} onChange={(e) => setDeductionType(e.target.value as CanteenDeductionType)}>
                {deductionTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Payroll formula code *
              <input value={formulaCode} onChange={(e) => setFormulaCode(e.target.value)} placeholder="CONFIGURED_CANTEEN_DEDUCTION" required />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add transaction</button>
          </div>
        </form>

        <div className="cards single-column">
          <div className="filter-card training-filter-card">
            <label>Search<input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder="Search employee, description, or formula" /></label>
            <label>Status<select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as typeof statusFilter); }}><option value="all">All statuses</option>{['open', 'partially-paid', 'paid', 'deducted', 'void'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Sort by<select value={sortBy} onChange={(e) => { setPage(1); setSortBy(e.target.value as typeof sortBy); }}><option value="newest">Newest date</option><option value="oldest">Oldest date</option><option value="amount-desc">Highest amount</option></select></label>
          </div>
          {isLoading ? <EmptyStateCard title="Loading canteen transactions" message="Fetching transactions, balances, and payroll-ready references." /> : pagedTransactions.length ? pagedTransactions.map((tx) => (
            <article className="record-card" key={tx.id}>
              <div className="record-card-header">
                <h3>{empName(employees, tx.employeeId)} — {tx.description}</h3>
                <EmployeePortalStatusBadge status={tx.status} />
              </div>
              <p>Amount: {tx.amount} · Date: {tx.transactionDate} · Type: {tx.deductionType}</p>
              <p>Formula: <code>{tx.payrollFormulaCode}</code> · Settled: {tx.settledAmount ?? 0}</p>
              {tx.notes && <p>Notes: {tx.notes}</p>}
              {tx.status === 'open' && (
                <div className="button-row">
                  <button className="primary" type="button" onClick={() => updateStatus(tx.id, 'paid')}>Record payment</button>
                  <button className="secondary" type="button" onClick={() => updateStatus(tx.id, 'deducted')}>Mark deducted</button>
                  <button className="secondary" type="button" onClick={() => updateStatus(tx.id, 'void')}>Void</button>
                </div>
              )}
              {tx.status === 'partially-paid' && (
                <div className="button-row">
                  <button className="primary" type="button" onClick={() => updateStatus(tx.id, 'paid')}>Record remaining payment</button>
                  <button className="primary" type="button" onClick={() => updateStatus(tx.id, 'deducted')}>Mark deducted</button>
                  <button className="secondary" type="button" onClick={() => updateStatus(tx.id, 'void')}>Void</button>
                </div>
              )}
            </article>
          )) : <EmptyStateCard title="No transactions yet" message="Add a canteen transaction above." />}
          <div className="button-row table-pagination-row">
            <button className="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
            <span>Page {page} of {totalPages} · {filteredTransactions.length} matching transactions</span>
            <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
          </div>
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Employee balance summary</h3>
          <p className="lead">Running balances by employee. Balances update when transactions are created, paid, voided, or marked for payroll deduction.</p>
        </div>
        <div className="cards">
          {isLoading ? <EmptyStateCard title="Loading ledger" message="Fetching live employee debt balances." /> : ledgers.length ? ledgers.map((ledger) => (
            <article className="record-card" key={ledger.id}>
              <div className="record-card-header">
                <h3>{empName(employees, ledger.employeeId)}</h3>
                <EmployeePortalStatusBadge status={ledger.source} />
              </div>
              <p>Balance: {ledger.balance} · Formula: <code>{ledger.formulaCode}</code></p>
              {ledger.notes && <p>{ledger.notes}</p>}
              <p>Last updated: {new Date(ledger.lastUpdatedAt).toLocaleString()}</p>
            </article>
          )) : <EmptyStateCard title="No ledger entries yet" message="Ledger entries are created automatically when transactions are added." />}
        </div>
      </section>
    </section>
  );
}
