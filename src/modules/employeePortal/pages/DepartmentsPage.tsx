import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import type { Department, DepartmentDraft, SetupStatus } from '../types/employeeTypes';

const emptyDepartmentDraft: DepartmentDraft = { name: '', description: '', status: 'active' };
const setupStatusOptions: SetupStatus[] = ['active', 'inactive'];

const toDepartmentDraft = (department: Department): DepartmentDraft => ({
  name: department.name,
  description: department.description,
  status: department.status,
});

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [draft, setDraft] = useState<DepartmentDraft>(emptyDepartmentDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const refreshDepartments = async () => setDepartments(await employeeService.listDepartments());

  useEffect(() => {
    void refreshDepartments();
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

  const submitDepartment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft: DepartmentDraft = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
    };

    if (!normalizedDraft.name) {
      setFormError('Department name is required.');
      return;
    }

    if (editingId) {
      await employeeService.updateDepartment(editingId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 002 department update'));
    } else {
      await employeeService.createDepartment(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 002 department create'));
    }

    await refreshDepartments();
    resetForm();
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Departments</h2>
          <p className="lead">Manage department setup records for employee assignment. Use inactive status instead of deletion during the MVP.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 002 setup" />
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitDepartment}>
          <h3>{editingId ? 'Edit department' : 'Add department'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid">
            <label>Department name *<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SetupStatus })}>{setupStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>
          <div className="button-row"><button className="primary" type="submit">{editingId ? 'Save department' : 'Add department'}</button><button className="secondary" type="button" onClick={resetForm}>Clear</button></div>
        </form>

        <div className="cards single-column">
          {departments.map((department) => (
            <article className="record-card" key={department.id}>
              <div className="record-card-header"><h3>{department.name}</h3><EmployeePortalStatusBadge status={department.status} /></div>
              <p>{department.description || 'No description yet.'}</p>
              <button className="secondary" type="button" onClick={() => startEdit(department)}>Edit department</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
