import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import type { Department, Employee, EmployeeDraft, EmployeeRole, EmploymentStatus, Position } from '../types/employeeTypes';

const emptyEmployeeDraft: EmployeeDraft = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  preferredName: '',
  departmentId: '',
  positionId: '',
  role: 'role_employee',
  employmentStatus: 'onboarding',
  hireDate: new Date().toISOString().slice(0, 10),
  phone: '',
  email: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
};

const statusOptions: EmploymentStatus[] = ['active', 'onboarding', 'probation', 'inactive'];

const toEmployeeDraft = (employee: Employee): EmployeeDraft => ({
  employeeNumber: employee.employeeNumber,
  firstName: employee.firstName,
  lastName: employee.lastName,
  preferredName: employee.preferredName ?? '',
  departmentId: employee.departmentId ?? '',
  positionId: employee.positionId ?? '',
  role: employee.role,
  employmentStatus: employee.employmentStatus,
  hireDate: employee.hireDate,
  phone: employee.phone ?? '',
  email: employee.email ?? '',
  emergencyContactName: employee.emergencyContactName ?? '',
  emergencyContactPhone: employee.emergencyContactPhone ?? '',
  notes: employee.notes ?? '',
});

export function EmployeesPage() {
  const pageSize = 8;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [draft, setDraft] = useState<EmployeeDraft>(emptyEmployeeDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'recent-hire' | 'employee-number'>('name-asc');
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshEmployees = async () => setEmployees(await employeeService.listEmployees());

  useEffect(() => {
    void Promise.all([
      employeeService.listEmployees(),
      employeeService.listDepartments(),
      employeeService.listPositions(),
      employeeService.listRoles(),
    ]).then(([employeeList, departmentList, positionList, roleList]) => {
      setEmployees(employeeList);
      setDepartments(departmentList);
      setPositions(positionList);
      setRoles(roleList);
      setSelectedId(employeeList[0]?.id ?? null);
    });
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedId) ?? employees[0] ?? null,
    [employees, selectedId],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = employees.filter((employee) => {
      const departmentMatch = departmentFilter === 'all' || employee.departmentId === departmentFilter;
      const statusMatch = statusFilter === 'all' || employee.employmentStatus === statusFilter;
      const searchText = `${employee.employeeNumber} ${employee.firstName} ${employee.lastName} ${employee.preferredName ?? ''}`.toLowerCase();
      const queryMatch = !normalizedQuery || searchText.includes(normalizedQuery);
      return departmentMatch && statusMatch && queryMatch;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === 'employee-number') {
        return left.employeeNumber.localeCompare(right.employeeNumber);
      }
      if (sortBy === 'recent-hire') {
        return right.hireDate.localeCompare(left.hireDate);
      }
      const leftName = `${left.lastName} ${left.firstName}`.toLowerCase();
      const rightName = `${right.lastName} ${right.firstName}`.toLowerCase();
      return sortBy === 'name-desc' ? rightName.localeCompare(leftName) : leftName.localeCompare(rightName);
    });
  }, [departmentFilter, employees, query, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const pagedEmployees = useMemo(
    () => filteredEmployees.slice((page - 1) * pageSize, page * pageSize),
    [filteredEmployees, page, pageSize],
  );

  const departmentName = (departmentId?: string) => departments.find((department) => department.id === departmentId)?.name ?? 'Unassigned';
  const positionName = (positionId?: string) => positions.find((position) => position.id === positionId)?.title ?? 'Unassigned';
  const roleName = (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? roleId;

  const updatePositionAssignment = (positionId: string) => {
    const selectedPosition = positions.find((position) => position.id === positionId);
    setDraft({ ...draft, positionId, role: selectedPosition?.defaultRole ?? draft.role });
  };

  const resetForm = () => {
    setDraft(emptyEmployeeDraft);
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (employee: Employee) => {
    setDraft(toEmployeeDraft(employee));
    setEditingId(employee.id);
    setSelectedId(employee.id);
    setFormError('');
  };

  const submitEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const normalizedDraft: EmployeeDraft = {
      ...draft,
      employeeNumber: draft.employeeNumber.trim(),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      preferredName: draft.preferredName?.trim(),
      departmentId: draft.departmentId || undefined,
      positionId: draft.positionId || undefined,
      phone: draft.phone?.trim(),
      email: draft.email?.trim(),
      emergencyContactName: draft.emergencyContactName?.trim(),
      emergencyContactPhone: draft.emergencyContactPhone?.trim(),
      notes: draft.notes?.trim(),
    };

    if (!normalizedDraft.employeeNumber || !normalizedDraft.firstName || !normalizedDraft.lastName) {
      setFormError('Employee number, first name, and last name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const updated = await employeeService.updateEmployee(editingId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 002 employee update'));
        if (updated) setSelectedId(updated.id);
      } else {
        const created = await employeeService.createEmployee(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 002 employee create'));
        setSelectedId(created.id);
      }

      await refreshEmployees();
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Employee Management</h2>
          <p className="lead">Create, edit, search, and review employees with department, position, and role assignment foundations. Data is session-scoped through the service layer and does not use localStorage.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 002 CRUD" />
      </div>

      <div className="crud-layout">
        <form className="form-card" onSubmit={submitEmployee}>
          <h3>{editingId ? 'Edit employee' : 'Add employee'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Employee number *<input value={draft.employeeNumber} onChange={(event) => setDraft({ ...draft, employeeNumber: event.target.value })} required /></label>
            <label>Hire date<input type="date" value={draft.hireDate} onChange={(event) => setDraft({ ...draft, hireDate: event.target.value })} /></label>
            <label>First name *<input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} required /></label>
            <label>Last name *<input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} required /></label>
            <label>Preferred name<input value={draft.preferredName ?? ''} onChange={(event) => setDraft({ ...draft, preferredName: event.target.value })} /></label>
            <label>Status<select value={draft.employmentStatus} onChange={(event) => setDraft({ ...draft, employmentStatus: event.target.value as EmploymentStatus })}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Department<select value={draft.departmentId ?? ''} onChange={(event) => setDraft({ ...draft, departmentId: event.target.value })}><option value="">Unassigned</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label>Position<select value={draft.positionId ?? ''} onChange={(event) => updatePositionAssignment(event.target.value)}><option value="">Unassigned</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}</select></label>
            <label>Role<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label>Phone<input value={draft.phone ?? ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
            <label>Email<input type="email" value={draft.email ?? ''} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
            <label>Emergency contact name<input value={draft.emergencyContactName ?? ''} onChange={(event) => setDraft({ ...draft, emergencyContactName: event.target.value })} /></label>
            <label>Emergency contact phone<input value={draft.emergencyContactPhone ?? ''} onChange={(event) => setDraft({ ...draft, emergencyContactPhone: event.target.value })} /></label>
            <label className="full-width">Notes<textarea value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          </div>
          <div className="button-row"><button className="primary" disabled={isSubmitting} type="submit">{isSubmitting ? 'Saving…' : editingId ? 'Save employee' : 'Add employee'}</button><button className="secondary" disabled={isSubmitting} type="button" onClick={resetForm}>Clear</button></div>
        </form>

        <aside className="summary-card">
          <h3>Employee profile summary</h3>
          {selectedEmployee ? (
            <div>
              <p className="summary-name">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
              <EmployeePortalStatusBadge status={selectedEmployee.employmentStatus} />
              <dl>
                <dt>Employee no.</dt><dd>{selectedEmployee.employeeNumber}</dd>
                <dt>Preferred name</dt><dd>{selectedEmployee.preferredName || '—'}</dd>
                <dt>Department</dt><dd>{departmentName(selectedEmployee.departmentId)}</dd>
                <dt>Position</dt><dd>{positionName(selectedEmployee.positionId)}</dd>
                <dt>Role</dt><dd>{roleName(selectedEmployee.role)}</dd>
                <dt>Emergency contact</dt><dd>{selectedEmployee.emergencyContactName || '—'} {selectedEmployee.emergencyContactPhone ? `· ${selectedEmployee.emergencyContactPhone}` : ''}</dd>
              </dl>
            </div>
          ) : <p>No employee selected.</p>}
        </aside>
      </div>

      <div className="filter-card">
        <label>Search by name or number<input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search employees" /></label>
        <label>Status<select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }}><option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label>Department<select value={departmentFilter} onChange={(event) => { setPage(1); setDepartmentFilter(event.target.value); }}><option value="all">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        <label>Sort by<select value={sortBy} onChange={(event) => { setPage(1); setSortBy(event.target.value as typeof sortBy); }}><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="recent-hire">Most recent hire</option><option value="employee-number">Employee number</option></select></label>
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>No.</th><th>Name</th><th>Status</th><th>Department</th><th>Position</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>{pagedEmployees.map((employee) => <tr key={employee.id} className={employee.id === selectedEmployee?.id ? 'selected-row' : ''}><td>{employee.employeeNumber}</td><td>{employee.firstName} {employee.lastName}</td><td><EmployeePortalStatusBadge status={employee.employmentStatus} /></td><td>{departmentName(employee.departmentId)}</td><td>{positionName(employee.positionId)}</td><td>{roleName(employee.role)}</td><td><button className="link-button" type="button" onClick={() => setSelectedId(employee.id)}>View</button><button className="link-button" type="button" onClick={() => startEdit(employee)}>Edit</button></td></tr>)}</tbody>
        </table>
        <div className="button-row table-pagination-row">
          <button className="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
          <span>Page {page} of {totalPages} · {filteredEmployees.length} matching employees</span>
          <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
        </div>
      </div>
    </section>
  );
}
