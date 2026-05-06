import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import type { Department, EmployeeRole, EmployeeRoleDraft, PermissionGroup, Position, PositionDraft, SetupStatus } from '../types/employeeTypes';

const emptyPositionDraft: PositionDraft = { code: '', title: '', departmentId: '', description: '', defaultRole: 'role_employee', status: 'active' };
const emptyRoleDraft: EmployeeRoleDraft = { code: '', name: '', description: '', permissions: [], status: 'active' };
const setupStatusOptions: SetupStatus[] = ['active', 'inactive'];

const toPositionDraft = (position: Position): PositionDraft => ({
  code: position.code,
  title: position.title,
  departmentId: position.departmentId ?? '',
  description: position.description,
  defaultRole: position.defaultRole,
  status: position.status,
});

const toRoleDraft = (role: EmployeeRole): EmployeeRoleDraft => ({
  code: role.code,
  name: role.name,
  description: role.description,
  permissions: role.permissions,
  status: role.status,
});

export function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [draft, setDraft] = useState<PositionDraft>(emptyPositionDraft);
  const [roleDraft, setRoleDraft] = useState<EmployeeRoleDraft>(emptyRoleDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [roleFormError, setRoleFormError] = useState('');

  const departmentNameById = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );

  const roleNameById = useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles],
  );

  const refreshPositions = async () => setPositions(await employeeService.listPositions());
  const refreshRoles = async () => setRoles(await employeeService.listRoles());

  useEffect(() => {
    void Promise.all([
      employeeService.listPositions(),
      employeeService.listDepartments(),
      employeeService.listRoles(),
      employeeService.listPermissionGroups(),
    ]).then(([positionList, departmentList, roleList, permissionGroupList]) => {
      setPositions(positionList);
      setDepartments(departmentList);
      setRoles(roleList);
      setPermissionGroups(permissionGroupList);
    });
  }, []);

  const resetForm = () => {
    setDraft(emptyPositionDraft);
    setEditingId(null);
    setFormError('');
  };

  const resetRoleForm = () => {
    setRoleDraft(emptyRoleDraft);
    setEditingRoleId(null);
    setRoleFormError('');
  };

  const startEdit = (position: Position) => {
    setDraft(toPositionDraft(position));
    setEditingId(position.id);
    setFormError('');
  };

  const startRoleEdit = (role: EmployeeRole) => {
    setRoleDraft(toRoleDraft(role));
    setEditingRoleId(role.id);
    setRoleFormError('');
  };

  const deactivatePosition = async (position: Position) => {
    await employeeService.deactivatePosition(position.id, createAuditMetadata('mvp-admin', 'Phase 003 position deactivate'));
    await refreshPositions();
    if (editingId === position.id) resetForm();
  };

  const submitPosition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft: PositionDraft = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      departmentId: draft.departmentId || undefined,
      description: draft.description.trim(),
      defaultRole: draft.defaultRole || 'role_employee',
    };

    if (!normalizedDraft.code || !normalizedDraft.title) {
      setFormError('Position code and title are required.');
      return;
    }

    if (editingId) {
      await employeeService.updatePosition(editingId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 003 position update'));
    } else {
      await employeeService.createPosition(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 003 position create'));
    }

    await refreshPositions();
    resetForm();
  };

  const togglePermission = (permissionCode: string) => {
    const currentPermissions = new Set(roleDraft.permissions);
    if (currentPermissions.has(permissionCode)) {
      currentPermissions.delete(permissionCode);
    } else {
      currentPermissions.add(permissionCode);
    }
    setRoleDraft({ ...roleDraft, permissions: [...currentPermissions] });
  };

  const submitRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft: EmployeeRoleDraft = {
      ...roleDraft,
      code: roleDraft.code.trim().toUpperCase(),
      name: roleDraft.name.trim(),
      description: roleDraft.description.trim(),
      permissions: [...new Set(roleDraft.permissions)].sort(),
    };

    if (!normalizedDraft.code || !normalizedDraft.name) {
      setRoleFormError('Role code and name are required.');
      return;
    }

    if (editingRoleId) {
      await employeeService.updateRole(editingRoleId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 003 role update'));
      await employeeService.updateRolePermissions(editingRoleId, normalizedDraft.permissions, createAuditMetadata('mvp-admin', 'Phase 003 role permission update'));
    } else {
      await employeeService.createRole(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 003 role create'));
    }

    await refreshRoles();
    resetRoleForm();
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Positions, Roles & Permissions</h2>
          <p className="lead">Manage positions with department links and default roles, then configure role permission groups for future authorization. No login/auth enforcement is active in Phase 003.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 003 admin" />
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitPosition}>
          <h3>{editingId ? 'Edit position' : 'Add position'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label>Position code *<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} required /></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SetupStatus })}>{setupStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="full-width">Position title *<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
            <label>Department<select value={draft.departmentId ?? ''} onChange={(event) => setDraft({ ...draft, departmentId: event.target.value })}><option value="">Unassigned</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label>Default role<select value={draft.defaultRole} onChange={(event) => setDraft({ ...draft, defaultRole: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label className="full-width">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>
          <div className="button-row"><button className="primary" type="submit">{editingId ? 'Save position' : 'Add position'}</button><button className="secondary" type="button" onClick={resetForm}>Clear</button></div>
        </form>

        <div className="cards single-column">
          {positions.map((position) => (
            <article className="record-card" key={position.id}>
              <div className="record-card-header"><div><span className="record-code">{position.code}</span><h3>{position.title}</h3></div><EmployeePortalStatusBadge status={position.status} /></div>
              <p>Department: {position.departmentId ? departmentNameById.get(position.departmentId) ?? 'Unknown department' : 'Unassigned'}</p>
              <p>Default role: {roleNameById.get(position.defaultRole) ?? 'Employee'}</p>
              <p>{position.description || 'No description yet.'}</p>
              <div className="button-row"><button className="secondary" type="button" onClick={() => startEdit(position)}>Edit position</button><button className="secondary danger" type="button" disabled={position.status === 'inactive'} onClick={() => deactivatePosition(position)}>Deactivate</button></div>
            </article>
          ))}
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Role & permission administration foundation</h3>
          <p className="lead">Permission groups are definitions only. They are stored on roles for future use but do not enforce application access yet.</p>
        </div>
        <div className="crud-layout narrow">
          <form className="form-card" onSubmit={submitRole}>
            <h3>{editingRoleId ? 'Edit role permissions' : 'Add role'}</h3>
            {roleFormError && <p className="form-error">{roleFormError}</p>}
            <div className="form-grid two-column">
              <label>Role code *<input value={roleDraft.code} onChange={(event) => setRoleDraft({ ...roleDraft, code: event.target.value })} required /></label>
              <label>Status<select value={roleDraft.status} onChange={(event) => setRoleDraft({ ...roleDraft, status: event.target.value as SetupStatus })}>{setupStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="full-width">Role name *<input value={roleDraft.name} onChange={(event) => setRoleDraft({ ...roleDraft, name: event.target.value })} required /></label>
              <label className="full-width">Description<textarea value={roleDraft.description} onChange={(event) => setRoleDraft({ ...roleDraft, description: event.target.value })} /></label>
            </div>
            <div className="permission-grid">
              {permissionGroups.map((permission) => <label className="permission-option" key={permission.code}><input type="checkbox" checked={roleDraft.permissions.includes(permission.code)} onChange={() => togglePermission(permission.code)} /><span>{permission.code}</span></label>)}
            </div>
            <div className="button-row"><button className="primary" type="submit">{editingRoleId ? 'Save role' : 'Add role'}</button><button className="secondary" type="button" onClick={resetRoleForm}>Clear</button></div>
          </form>

          <div className="cards single-column">
            {roles.map((role) => (
              <article className="record-card" key={role.id}>
                <div className="record-card-header"><div><span className="record-code">{role.code}</span><h3>{role.name}</h3></div><EmployeePortalStatusBadge status={role.status} /></div>
                <p>{role.description}</p>
                <div className="permission-badges">{role.permissions.map((permission) => <span className="permission-badge" key={permission}>{permission}</span>)}</div>
                <button className="secondary" type="button" onClick={() => startRoleEdit(role)}>Edit role / permissions</button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
