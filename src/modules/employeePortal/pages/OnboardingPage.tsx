import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import { getOnboardingServiceStatus, onboardingService } from '../services/onboardingService';
import type { Department, Employee, EmployeeRole } from '../types/employeeTypes';
import type {
  EmployeeOnboardingChecklist,
  OnboardingStep,
  OnboardingStepProgressStatus,
  OnboardingTemplate,
  OnboardingTemplateDraft,
  OnboardingTemplateStatus,
} from '../types/onboardingTypes';

const emptyStep = (): OnboardingStep => ({
  id: '',
  title: '',
  description: '',
  category: 'HR',
  required: true,
  estimatedMinutes: 30,
  sortOrder: 10,
});

const emptyTemplateDraft: OnboardingTemplateDraft = {
  name: '',
  description: '',
  targetRole: 'role_employee',
  targetDepartmentId: '',
  steps: [emptyStep()],
  status: 'active',
};

const progressStatuses: OnboardingStepProgressStatus[] = ['Not Started', 'In Progress', 'Completed', 'Skipped'];
const templateStatuses: OnboardingTemplateStatus[] = ['active', 'inactive'];

const toTemplateDraft = (template: OnboardingTemplate): OnboardingTemplateDraft => ({
  name: template.name,
  description: template.description,
  targetRole: template.targetRole,
  targetDepartmentId: template.targetDepartmentId ?? '',
  steps: template.steps.map((step) => ({ ...step })),
  status: template.status,
});

const calculateProgress = (checklist: EmployeeOnboardingChecklist, template?: OnboardingTemplate) => {
  const totalRequired = template?.steps.filter((step) => step.required).length || checklist.stepProgress.length;
  if (!totalRequired) return 0;
  const completedRequired = checklist.stepProgress.filter((progress) => {
    const step = template?.steps.find((item) => item.id === progress.stepId);
    return (step?.required ?? true) && (progress.status === 'Completed' || progress.status === 'Skipped');
  }).length;
  return Math.round((completedRequired / totalRequired) * 100);
};

export function OnboardingPage() {
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [checklists, setChecklists] = useState<EmployeeOnboardingChecklist[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [draft, setDraft] = useState<OnboardingTemplateDraft>(emptyTemplateDraft);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignTemplateId, setAssignTemplateId] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [serviceMode, setServiceMode] = useState<'api' | 'fallback'>('fallback');
  const [serviceMessage, setServiceMessage] = useState('Using local fallback data until the backend is available.');

  const templateById = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates]);
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, `${employee.firstName} ${employee.lastName}`])), [employees]);
  const departmentById = useMemo(() => new Map(departments.map((department) => [department.id, department.name])), [departments]);
  const roleById = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);
  const selectedChecklist = useMemo(
    () => checklists.find((checklist) => checklist.id === selectedChecklistId) ?? checklists[0] ?? null,
    [checklists, selectedChecklistId],
  );

  const refreshOnboarding = async () => {
    const [templateList, checklistList] = await Promise.all([onboardingService.listTemplates(), onboardingService.listEmployeeChecklists()]);
    const status = getOnboardingServiceStatus();
    setServiceMode(status.mode);
    setServiceMessage(status.message ?? '');
    setTemplates(templateList);
    setChecklists(checklistList);
    setAssignTemplateId((current) => current || templateList[0]?.id || '');
    setSelectedChecklistId((current) => current || checklistList[0]?.id || null);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [templateList, checklistList, employeeList, departmentList, roleList] = await Promise.all([
          onboardingService.listTemplates(),
          onboardingService.listEmployeeChecklists(),
          employeeService.listEmployees(),
          employeeService.listDepartments(),
          employeeService.listRoles(),
        ]);
        const status = getOnboardingServiceStatus();
        setServiceMode(status.mode);
        setServiceMessage(status.message ?? '');
        setTemplates(templateList);
        setChecklists(checklistList);
        setEmployees(employeeList);
        setDepartments(departmentList);
        setRoles(roleList);
        setAssignEmployeeId(employeeList[0]?.id ?? '');
        setAssignTemplateId(templateList[0]?.id ?? '');
        setSelectedChecklistId(checklistList[0]?.id ?? null);
        setLoadError('');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load onboarding data.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const resetTemplateForm = () => {
    setDraft(emptyTemplateDraft);
    setEditingTemplateId(null);
    setFormError('');
  };

  const startEditTemplate = (template: OnboardingTemplate) => {
    setDraft(toTemplateDraft(template));
    setEditingTemplateId(template.id);
    setFormError('');
  };

  const updateStep = (index: number, patch: Partial<OnboardingStep>) => {
    setDraft({ ...draft, steps: draft.steps.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step)) });
  };

  const removeStep = (index: number) => {
    setDraft({ ...draft, steps: draft.steps.filter((_step, stepIndex) => stepIndex !== index) });
  };

  const submitTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft: OnboardingTemplateDraft = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      targetDepartmentId: draft.targetDepartmentId || undefined,
      steps: draft.steps
        .map((step, index) => ({
          ...step,
          title: step.title.trim(),
          description: step.description.trim(),
          category: step.category.trim() || 'General',
          estimatedMinutes: Number(step.estimatedMinutes || 0),
          sortOrder: Number(step.sortOrder || (index + 1) * 10),
        }))
        .filter((step) => step.title),
    };

    if (!normalizedDraft.name || !normalizedDraft.targetRole || normalizedDraft.steps.length === 0) {
      setFormError('Template name, target role, and at least one step title are required.');
      return;
    }

    if (editingTemplateId) {
      await onboardingService.updateTemplate(editingTemplateId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 004 onboarding template update'));
    } else {
      await onboardingService.createTemplate(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 004 onboarding template create'));
    }

    await refreshOnboarding();
    resetTemplateForm();
  };

  const assignTemplate = async () => {
    if (!assignEmployeeId || !assignTemplateId) return;
    const checklist = await onboardingService.assignTemplate(assignEmployeeId, assignTemplateId, createAuditMetadata('mvp-admin', 'Phase 004 onboarding assignment'));
    await refreshOnboarding();
    if (checklist) setSelectedChecklistId(checklist.id);
  };

  const updateProgress = async (checklistId: string, stepId: string, status: OnboardingStepProgressStatus, notes?: string) => {
    await onboardingService.updateStepProgress(checklistId, stepId, status, notes, createAuditMetadata('mvp-admin', 'Phase 004 onboarding step progress update'));
    await refreshOnboarding();
  };

  const approveChecklist = async (checklistId: string) => {
    await onboardingService.approveChecklist(checklistId, 'Supervisor placeholder', createAuditMetadata('mvp-admin', 'Phase 004 supervisor approval placeholder'));
    await refreshOnboarding();
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Onboarding Checklist System</h2>
          <p className="lead">Create onboarding templates, assign them to new hires, track checklist progress, and capture supervisor approval placeholders with live API persistence when the backend is available.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 004 onboarding" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {serviceMode === 'fallback' && !loadError && <p className="service-note">Backend unavailable. Using local fallback onboarding data. {serviceMessage}</p>}
      {serviceMode === 'api' && !loadError && <p className="service-note success">Live API mode is active for onboarding templates and checklists.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitTemplate}>
          <h3>{editingTemplateId ? 'Edit onboarding template' : 'Add onboarding template'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label className="full-width">Template name *<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
            <label>Target role<select value={draft.targetRole} onChange={(event) => setDraft({ ...draft, targetRole: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label>Target department<select value={draft.targetDepartmentId ?? ''} onChange={(event) => setDraft({ ...draft, targetDepartmentId: event.target.value })}><option value="">Any department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OnboardingTemplateStatus })}>{templateStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="full-width">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>

          <div className="step-editor">
            <div className="record-card-header"><h3>Template step editor</h3><button className="secondary" type="button" onClick={() => setDraft({ ...draft, steps: [...draft.steps, emptyStep()] })}>Add step</button></div>
            {draft.steps.map((step, index) => (
              <div className="step-editor-row" key={`${step.id}-${index}`}>
                <label>Title *<input value={step.title} onChange={(event) => updateStep(index, { title: event.target.value })} /></label>
                <label>Category<input value={step.category} onChange={(event) => updateStep(index, { category: event.target.value })} /></label>
                <label>Minutes<input type="number" value={step.estimatedMinutes} onChange={(event) => updateStep(index, { estimatedMinutes: Number(event.target.value) })} /></label>
                <label>Sort<input type="number" value={step.sortOrder} onChange={(event) => updateStep(index, { sortOrder: Number(event.target.value) })} /></label>
                <label className="full-width">Description<textarea value={step.description} onChange={(event) => updateStep(index, { description: event.target.value })} /></label>
                <label className="inline-check"><input type="checkbox" checked={step.required} onChange={(event) => updateStep(index, { required: event.target.checked })} /> Required</label>
                <button className="secondary danger" type="button" disabled={draft.steps.length === 1} onClick={() => removeStep(index)}>Remove step</button>
              </div>
            ))}
          </div>
          <div className="button-row"><button className="primary" type="submit">{editingTemplateId ? 'Save template' : 'Add template'}</button><button className="secondary" type="button" onClick={resetTemplateForm}>Clear</button></div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading onboarding templates" message="Fetching onboarding templates and checklist state." /> : templates.length ? templates.map((template) => (
            <article className="record-card" key={template.id}>
              <div className="record-card-header"><h3>{template.name}</h3><EmployeePortalStatusBadge status={template.status} /></div>
              <p>{template.description}</p>
              <p>Target role: {roleById.get(template.targetRole) ?? template.targetRole}</p>
              <p>Target department: {template.targetDepartmentId ? departmentById.get(template.targetDepartmentId) ?? 'Unknown department' : 'Any department'}</p>
              <p>Steps: {template.steps.length}</p>
              <button className="secondary" type="button" onClick={() => startEditTemplate(template)}>Edit template</button>
            </article>
          )) : <EmptyStateCard title="No onboarding templates yet" message="Add a template above to begin assigning onboarding checklists." />}
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Assign onboarding template to employee</h3>
          <p className="lead">Assignments create an employee checklist in session state only. Completion does not automatically activate employees.</p>
        </div>
        <div className="filter-card">
          <label>Employee<select value={assignEmployeeId} onChange={(event) => setAssignEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeNumber}</option>)}</select></label>
          <label>Template<select value={assignTemplateId} onChange={(event) => setAssignTemplateId(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
          <button className="primary align-end" type="button" onClick={assignTemplate}>Assign template</button>
        </div>
      </section>

      <section className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading onboarding assignments" message="Fetching assigned onboarding checklists." /> : checklists.length ? checklists.map((checklist) => {
            const template = templateById.get(checklist.templateId);
            return (
              <article className="record-card" key={checklist.id}>
                <div className="record-card-header"><h3>{employeeById.get(checklist.employeeId) ?? checklist.employeeId}</h3><EmployeePortalStatusBadge status={checklist.status} /></div>
                <p>Template: {template?.name ?? checklist.templateId}</p>
                <p>Assigned: {new Date(checklist.assignedAt).toLocaleString()}</p>
                <div className="progress-track"><span style={{ width: `${calculateProgress(checklist, template)}%` }} /></div>
                <p>{calculateProgress(checklist, template)}% complete</p>
                <button className="secondary" type="button" onClick={() => setSelectedChecklistId(checklist.id)}>View progress</button>
              </article>
            );
          }) : <EmptyStateCard title="No onboarding assignments yet" message="Assign a template to an employee to begin progress tracking." />}
        </div>

        <aside className="summary-card">
          <h3>Employee onboarding progress</h3>
          {selectedChecklist ? (
            <div>
              <p className="summary-name">{employeeById.get(selectedChecklist.employeeId) ?? selectedChecklist.employeeId}</p>
              <EmployeePortalStatusBadge status={selectedChecklist.status} />
              <p>Template: {templateById.get(selectedChecklist.templateId)?.name ?? selectedChecklist.templateId}</p>
              <p>Progress: {calculateProgress(selectedChecklist, templateById.get(selectedChecklist.templateId))}%</p>
              <div className="progress-track"><span style={{ width: `${calculateProgress(selectedChecklist, templateById.get(selectedChecklist.templateId))}%` }} /></div>
              {(templateById.get(selectedChecklist.templateId)?.steps ?? []).map((step) => {
                const progress = selectedChecklist.stepProgress.find((item) => item.stepId === step.id);
                return (
                  <div className="progress-step" key={step.id}>
                    <div><strong>{step.title}</strong><p>{step.category} · {step.estimatedMinutes} minutes · {step.required ? 'Required' : 'Optional'}</p></div>
                    <select value={progress?.status ?? 'Not Started'} onChange={(event) => updateProgress(selectedChecklist.id, step.id, event.target.value as OnboardingStepProgressStatus, progress?.notes)}>{progressStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                    <input value={progress?.notes ?? ''} placeholder="Progress notes" onChange={(event) => updateProgress(selectedChecklist.id, step.id, progress?.status ?? 'Not Started', event.target.value)} />
                  </div>
                );
              })}
              <button className="primary" type="button" disabled={selectedChecklist.status === 'approved'} onClick={() => approveChecklist(selectedChecklist.id)}>Supervisor approval placeholder</button>
              {selectedChecklist.approvedAt && <p>Approved by {selectedChecklist.approvedBy} at {new Date(selectedChecklist.approvedAt).toLocaleString()}</p>}
            </div>
          ) : <p>No onboarding checklist selected.</p>}
        </aside>
      </section>
    </section>
  );
}
