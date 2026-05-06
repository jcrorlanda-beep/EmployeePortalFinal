import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import type { Department, DepartmentDraft, Employee, SetupStatus } from '../types/employeeTypes';

const emptyDepartmentDraft: DepartmentDraft = { code: '', name: '', description: '', managerEmployeeId: '', status: 'active', sortOrder: 100 };
const setupStatusOptions: SetupStatus[] = ['active', 'inactive'];

const toDepartmentDraft = (department: Department): DepartmentDraft => ({
  code: department.code,
  name: department.name,
  description: department.description,
  managerEmployeeId: department.managerEmployeeId ?? '',
  status: department.status,
  sortOrder: department.sortOrder ?? 100,
});

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [draft, setDraft] = useState<DepartmentDraft>(emptyDepartmentDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);

  const employeeNameById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, `${employee.firstName} ${employee.lastName}`])),
    [employees],
  );

  const refreshDepartments = async () => setDepartments(await employeeService.listDepartments());

  useEffect(() => {
    void Promise.all([employeeService.listDepartments(), employeeService.listEmployees()]).then(([departmentList, employeeList]) => {
      setDepartments(departmentList);
      setEmployees(employeeList);
    });
  }, []);

  const resetForm = () => {
    setDraft(emptyDepartmentDraft);
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (department: Department) => {
    setDraft(toDepartmentDraft(department));
    setEditingId(department.id);
    setFormError('');
  };

  const deactivateDepartment = async (department: Department) => {
    if (pendingDeactivateId) return;
    setPendingDeactivateId(department.id);
    try {
      await employeeService.deactivateDepartment(department.id, createAuditMetadata('mvp-admin', 'Phase 003 department deactivate'));
      await refreshDepartments();
      if (editingId === department.id) resetForm();
    } finally {
      setPendingDeactivateId(null);
    }
  };

  const submitDepartment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const normalizedDraft: DepartmentDraft = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      managerEmployeeId: draft.managerEmployeeId || undefined,
      sortOrder: Number(draft.sortOrder ?? 100),
    };

    if (!normalizedDraft.code || !normalizedDraft.name) {
      setFormError('Department code and name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await employeeService.updateDepartment(editingId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 003 department update'));
      } else {
        await employeeService.createDepartment(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 003 department create'));
      }

      await refreshDepartments();
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Departments</h2>
          <p className="lead">Manage department setup records with codes, optional leads, sort order, and active/inactive status. Deactivation replaces deletion in this MVP.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 003 admin" />
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitDepartment}>
          <h3>{editingId ? 'Edit department' : 'Add department'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Department code *<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} required /></label>
            <label>Sort order<input type="number" value={draft.sortOrder ?? 100} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></label>
            <label className="full-width">Department name *<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
            <label>Manager / lead<select value={draft.managerEmployeeId ?? ''} onChange={(event) => setDraft({ ...draft, managerEmployeeId: event.target.value })}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SetupStatus })}>{setupStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="full-width">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>
          <div className="button-row"><button className="primary" disabled={isSubmitting} type="submit">{isSubmitting ? 'Saving…' : editingId ? 'Save department' : 'Add department'}</button><button className="secondary" disabled={isSubmitting} type="button" onClick={resetForm}>Clear</button></div>
        </form>

        <div className="cards single-column">
          {departments.map((department) => (
            <article className="record-card" key={department.id}>
              <div className="record-card-header"><div><span className="record-code">{department.code}</span><h3>{department.name}</h3></div><EmployeePortalStatusBadge status={department.status} /></div>
              <p>{department.description || 'No description yet.'}</p>
              <p>Manager / lead: {department.managerEmployeeId ? employeeNameById.get(department.managerEmployeeId) ?? 'Unknown employee' : 'Unassigned'}</p>
              <p>Sort order: {department.sortOrder ?? 'Not set'}</p>
              <div className="button-row"><button className="secondary" disabled={isSubmitting || pendingDeactivateId === department.id} type="button" onClick={() => startEdit(department)}>Edit department</button><button className="secondary danger" type="button" disabled={department.status === 'inactive' || Boolean(pendingDeactivateId)} onClick={() => deactivateDepartment(department)}>{pendingDeactivateId === department.id ? 'Deactivating…' : 'Deactivate'}</button></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
