import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import type { Department, Position, PositionDraft, SetupStatus } from '../types/employeeTypes';

const emptyPositionDraft: PositionDraft = { title: '', departmentId: '', description: '', status: 'active' };
const setupStatusOptions: SetupStatus[] = ['active', 'inactive'];

const toPositionDraft = (position: Position): PositionDraft => ({
  title: position.title,
  departmentId: position.departmentId ?? '',
  description: position.description,
  status: position.status,
});

export function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [draft, setDraft] = useState<PositionDraft>(emptyPositionDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const departmentNameById = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );

  const refreshPositions = async () => setPositions(await employeeService.listPositions());

  useEffect(() => {
    void Promise.all([employeeService.listPositions(), employeeService.listDepartments()]).then(([positionList, departmentList]) => {
      setPositions(positionList);
      setDepartments(departmentList);
    });
  }, []);

  const resetForm = () => {
    setDraft(emptyPositionDraft);
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (position: Position) => {
    setDraft(toPositionDraft(position));
    setEditingId(position.id);
    setFormError('');
  };

  const submitPosition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft: PositionDraft = {
      ...draft,
      title: draft.title.trim(),
      departmentId: draft.departmentId || undefined,
      description: draft.description.trim(),
    };

    if (!normalizedDraft.title) {
      setFormError('Position title is required.');
      return;
    }

    if (editingId) {
      await employeeService.updatePosition(editingId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 002 position update'));
    } else {
      await employeeService.createPosition(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 002 position create'));
    }

    await refreshPositions();
    resetForm();
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Positions & Roles</h2>
          <p className="lead">Manage positions with optional department links. Role assignment foundations are available from employee records and remain separate from TalyerOS auth.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 002 setup" />
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitPosition}>
          <h3>{editingId ? 'Edit position' : 'Add position'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid">
            <label>Position title *<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
            <label>Department<select value={draft.departmentId ?? ''} onChange={(event) => setDraft({ ...draft, departmentId: event.target.value })}><option value="">Unassigned</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SetupStatus })}>{setupStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>
          <div className="button-row"><button className="primary" type="submit">{editingId ? 'Save position' : 'Add position'}</button><button className="secondary" type="button" onClick={resetForm}>Clear</button></div>
        </form>

        <div className="cards single-column">
          {positions.map((position) => (
            <article className="record-card" key={position.id}>
              <div className="record-card-header"><h3>{position.title}</h3><EmployeePortalStatusBadge status={position.status} /></div>
              <p>Department: {position.departmentId ? departmentNameById.get(position.departmentId) ?? 'Unknown department' : 'Unassigned'}</p>
              <p>{position.description || 'No description yet.'}</p>
              <button className="secondary" type="button" onClick={() => startEdit(position)}>Edit position</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
