import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import { getTrainingServiceStatus, trainingService } from '../services/trainingService';
import type { Employee, EmployeeRole } from '../types/employeeTypes';
import type {
  TrainingAssignment,
  TrainingAssignmentStatus,
  TrainingContentType,
  TrainingLevel,
  TrainingModule,
  TrainingModuleDraft,
  TrainingModuleStatus,
} from '../types/trainingTypes';

const levelOptions: TrainingLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Specialist'];
const contentTypeOptions: TrainingContentType[] = ['SOP', 'Video', 'Checklist', 'Quiz', 'Hands-On', 'External Link'];
const moduleStatusOptions: TrainingModuleStatus[] = ['Draft', 'Active', 'Archived'];
const assignmentStatusOptions: TrainingAssignmentStatus[] = ['Assigned', 'In Progress', 'Completed', 'Failed', 'Waived'];

const emptyModuleDraft: TrainingModuleDraft = {
  title: '',
  description: '',
  category: 'Safety',
  level: 'Beginner',
  targetRole: '',
  estimatedMinutes: 30,
  contentType: 'SOP',
  contentReference: '',
  status: 'Draft',
  certificationEligible: false,
};

const toModuleDraft = (module: TrainingModule): TrainingModuleDraft => ({
  title: module.title,
  description: module.description,
  category: module.category,
  level: module.level,
  targetRole: module.targetRole ?? '',
  estimatedMinutes: module.estimatedMinutes,
  contentType: module.contentType,
  contentReference: module.contentReference ?? '',
  status: module.status,
  certificationEligible: module.certificationEligible,
});

const employeeName = (employees: Employee[], employeeId: string) => {
  const employee = employees.find((item) => item.id === employeeId);
  return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNumber})` : employeeId;
};

export function TrainingPage() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [draft, setDraft] = useState<TrainingModuleDraft>(emptyModuleDraft);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignModuleId, setAssignModuleId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [serviceMode, setServiceMode] = useState<'api' | 'fallback'>('fallback');
  const [serviceMessage, setServiceMessage] = useState('Using local fallback data until the backend is available.');

  const moduleById = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules]);
  const roleById = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);
  const categoryOptions = useMemo(() => Array.from(new Set(modules.map((module) => module.category))).sort(), [modules]);
  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? assignments[0] ?? null,
    [assignments, selectedAssignmentId],
  );

  const filteredModules = useMemo(
    () =>
      modules.filter((module) => {
        const categoryMatch = categoryFilter === 'all' || module.category === categoryFilter;
        const levelMatch = levelFilter === 'all' || module.level === levelFilter;
        return categoryMatch && levelMatch;
      }),
    [categoryFilter, levelFilter, modules],
  );

  const refreshTraining = async () => {
    const [moduleList, assignmentList] = await Promise.all([
      trainingService.listTrainingModules(),
      trainingService.listAssignments(),
    ]);
    const status = getTrainingServiceStatus();
    setServiceMode(status.mode);
    setServiceMessage(status.message ?? '');
    setModules(moduleList);
    setAssignments(assignmentList);
    setAssignModuleId((current) => current || moduleList.find((module) => module.status === 'Active')?.id || moduleList[0]?.id || '');
    setSelectedAssignmentId((current) => current || assignmentList[0]?.id || null);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [moduleList, assignmentList, employeeList, roleList] = await Promise.all([
          trainingService.listTrainingModules(),
          trainingService.listAssignments(),
          employeeService.listEmployees(),
          employeeService.listRoles(),
        ]);
        const status = getTrainingServiceStatus();
        setServiceMode(status.mode);
        setServiceMessage(status.message ?? '');
        setModules(moduleList);
        setAssignments(assignmentList);
        setEmployees(employeeList);
        setRoles(roleList);
        setAssignEmployeeId(employeeList[0]?.id ?? '');
        setAssignModuleId(moduleList.find((module) => module.status === 'Active')?.id ?? moduleList[0]?.id ?? '');
        setSelectedAssignmentId(assignmentList[0]?.id ?? null);
        setLoadError('');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load training data.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setDraft(emptyModuleDraft);
    setEditingModuleId(null);
    setFormError('');
  };

  const startEdit = (module: TrainingModule) => {
    setDraft(toModuleDraft(module));
    setEditingModuleId(module.id);
    setFormError('');
  };

  const submitModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft: TrainingModuleDraft = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category.trim() || 'General',
      targetRole: draft.targetRole || undefined,
      estimatedMinutes: Number(draft.estimatedMinutes || 0),
      contentReference: draft.contentReference?.trim() || undefined,
    };

    if (!normalizedDraft.title || !normalizedDraft.category || normalizedDraft.estimatedMinutes <= 0) {
      setFormError('Title, category, and estimated minutes are required.');
      return;
    }

    if (editingModuleId) {
      await trainingService.updateTrainingModule(editingModuleId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 005 training module update'));
    } else {
      await trainingService.createTrainingModule(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 005 training module create'));
    }
    await refreshTraining();
    resetForm();
  };

  const assignTraining = async () => {
    if (!assignEmployeeId || !assignModuleId) return;
    const assignment = await trainingService.assignTraining(
      {
        employeeId: assignEmployeeId,
        trainingModuleId: assignModuleId,
        dueDate: assignDueDate || undefined,
        supervisorNotes: assignNotes,
      },
      createAuditMetadata('mvp-admin', 'Phase 005 training assignment'),
    );
    await refreshTraining();
    if (assignment) setSelectedAssignmentId(assignment.id);
    setAssignNotes('');
  };

  const updateAssignment = async (assignment: TrainingAssignment, status: TrainingAssignmentStatus, score?: number, supervisorNotes?: string, certificationIssued?: boolean) => {
    await trainingService.updateAssignmentProgress(
      assignment.id,
      { status, score, supervisorNotes, certificationIssued },
      createAuditMetadata('mvp-admin', 'Phase 005 training progress update'),
    );
    await refreshTraining();
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Training & Learning Hub</h2>
          <p className="lead">Create training modules, assign them to employees, track completion status, and prepare certification records. Live persistence is used when the backend is reachable, with local fallback kept as a resilience layer.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 005 training" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {serviceMode === 'fallback' && !loadError && <p className="service-note">Backend unavailable. Using local fallback training data. {serviceMessage}</p>}
      {serviceMode === 'api' && !loadError && <p className="service-note success">Live API mode is active for training modules and assignments.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitModule}>
          <h3>{editingModuleId ? 'Edit training module' : 'Add training module'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label className="full-width">Title *<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
            <label>Category *<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} required /></label>
            <label>Level<select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as TrainingLevel })}>{levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
            <label>Target role<select value={draft.targetRole ?? ''} onChange={(event) => setDraft({ ...draft, targetRole: event.target.value })}><option value="">Any role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label>Estimated minutes<input type="number" min="1" value={draft.estimatedMinutes} onChange={(event) => setDraft({ ...draft, estimatedMinutes: Number(event.target.value) })} /></label>
            <label>Content type<select value={draft.contentType} onChange={(event) => setDraft({ ...draft, contentType: event.target.value as TrainingContentType })}>{contentTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TrainingModuleStatus })}>{moduleStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="full-width">Content reference<input value={draft.contentReference ?? ''} onChange={(event) => setDraft({ ...draft, contentReference: event.target.value })} placeholder="SOP id, URL, or future document reference" /></label>
            <label className="full-width">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label className="inline-check full-width"><input type="checkbox" checked={draft.certificationEligible} onChange={(event) => setDraft({ ...draft, certificationEligible: event.target.checked })} /> Certification eligible</label>
          </div>
          <div className="button-row"><button className="primary" type="submit">{editingModuleId ? 'Save module' : 'Add module'}</button><button className="secondary" type="button" onClick={resetForm}>Clear</button></div>
        </form>

        <div className="cards single-column">
          <div className="filter-card training-filter-card">
            <label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Level<select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">All levels</option>{levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
          </div>
          {isLoading ? <EmptyStateCard title="Loading training modules" message="Fetching training modules and current assignments." /> : filteredModules.length ? filteredModules.map((module) => (
            <article className="record-card" key={module.id}>
              <div className="record-card-header"><h3>{module.title}</h3><EmployeePortalStatusBadge status={module.status} /></div>
              <p>{module.description || 'No description entered.'}</p>
              <p>{module.category} · {module.level} · {module.estimatedMinutes} minutes · {module.contentType}</p>
              <p>Target role: {module.targetRole ? roleById.get(module.targetRole) ?? module.targetRole : 'Any role'}</p>
              <p>Reference: {module.contentReference || 'Reference placeholder pending content upload/link'}</p>
              <div className="training-card-footer">
                {module.certificationEligible ? <EmployeePortalStatusBadge status="Certification eligible" /> : <span className="muted-text">No certification</span>}
                <button className="secondary" type="button" onClick={() => startEdit(module)}>Edit module</button>
              </div>
            </article>
          )) : <EmptyStateCard title="No training modules match these filters" message="Clear filters or add a module to begin assignment tracking." />}
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Assign training to employee</h3>
          <p className="lead">Assignments track status, due dates, scores, supervisor notes, and certification issuance readiness in session state.</p>
        </div>
        <div className="filter-card training-assignment-form">
          <label>Employee<select value={assignEmployeeId} onChange={(event) => setAssignEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeNumber}</option>)}</select></label>
          <label>Module<select value={assignModuleId} onChange={(event) => setAssignModuleId(event.target.value)}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
          <label>Due date<input type="date" value={assignDueDate} onChange={(event) => setAssignDueDate(event.target.value)} /></label>
          <label className="full-width">Supervisor notes<input value={assignNotes} onChange={(event) => setAssignNotes(event.target.value)} placeholder="Optional assignment note" /></label>
          <button className="primary align-end" type="button" onClick={assignTraining}>Assign training</button>
        </div>
      </section>

      <section className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading training assignments" message="Fetching assignment progress and completion data." /> : assignments.length ? assignments.map((assignment) => {
            const module = moduleById.get(assignment.trainingModuleId);
            return (
              <article className="record-card" key={assignment.id}>
                <div className="record-card-header"><h3>{employeeName(employees, assignment.employeeId)}</h3><EmployeePortalStatusBadge status={assignment.status} /></div>
                <p>Module: {module?.title ?? assignment.trainingModuleId}</p>
                <p>Assigned: {new Date(assignment.assignedAt).toLocaleDateString()} {assignment.dueDate ? `· Due ${assignment.dueDate}` : ''}</p>
                <p>Score: {assignment.score ?? 'Pending'} · Certification: {assignment.certificationIssued ? 'Issued' : module?.certificationEligible ? 'Eligible' : 'Not eligible'}</p>
                <button className="secondary" type="button" onClick={() => setSelectedAssignmentId(assignment.id)}>Review assignment</button>
              </article>
            );
          }) : <EmptyStateCard title="No training assignments yet" message="Assign an active module to an employee to begin completion tracking." />}
        </div>

        <aside className="summary-card">
          <h3>Completion tracking</h3>
          {selectedAssignment ? (
            <div>
              <p className="summary-name">{employeeName(employees, selectedAssignment.employeeId)}</p>
              <EmployeePortalStatusBadge status={selectedAssignment.status} />
              <p>Module: {moduleById.get(selectedAssignment.trainingModuleId)?.title ?? selectedAssignment.trainingModuleId}</p>
              <p>Certification eligible: {moduleById.get(selectedAssignment.trainingModuleId)?.certificationEligible ? 'Yes' : 'No'}</p>
              <div className="progress-step training-progress-editor">
                <label>Status<select value={selectedAssignment.status} onChange={(event) => updateAssignment(selectedAssignment, event.target.value as TrainingAssignmentStatus, selectedAssignment.score, selectedAssignment.supervisorNotes, selectedAssignment.certificationIssued)}>{assignmentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <label>Score<input type="number" min="0" max="100" value={selectedAssignment.score ?? ''} onChange={(event) => updateAssignment(selectedAssignment, selectedAssignment.status, event.target.value ? Number(event.target.value) : undefined, selectedAssignment.supervisorNotes, selectedAssignment.certificationIssued)} /></label>
                <label className="full-width">Supervisor notes<textarea value={selectedAssignment.supervisorNotes ?? ''} onChange={(event) => updateAssignment(selectedAssignment, selectedAssignment.status, selectedAssignment.score, event.target.value, selectedAssignment.certificationIssued)} /></label>
              </div>
              <button
                className="primary"
                type="button"
                disabled={!moduleById.get(selectedAssignment.trainingModuleId)?.certificationEligible || selectedAssignment.status !== 'Completed' || selectedAssignment.certificationIssued}
                onClick={() => updateAssignment(selectedAssignment, 'Completed', selectedAssignment.score, selectedAssignment.supervisorNotes, true)}
              >
                Mark certification issued
              </button>
              {selectedAssignment.completedAt && <p>Completed at {new Date(selectedAssignment.completedAt).toLocaleString()}</p>}
            </div>
          ) : <p>No training assignment selected.</p>}
        </aside>
      </section>
    </section>
  );
}
