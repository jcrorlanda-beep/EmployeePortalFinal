import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { disciplineService, getDisciplineServiceStatus } from '../services/disciplineService';
import type { Employee } from '../types/employeeTypes';
import type { DisciplineCategory, DisciplineRecord, DisciplineRecordStatus, DisciplineSeverity } from '../types/disciplineTypes';

const severityOptions: DisciplineSeverity[] = ['verbal', 'written-warning', 'final-warning', 'suspension-notice', 'termination-notice'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function DisciplinePage() {
  const [categories, setCategories] = useState<DisciplineCategory[]>([]);
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [catName, setCatName] = useState('');
  const [catSeverity, setCatSeverity] = useState<DisciplineSeverity>('verbal');
  const [recEmpId, setRecEmpId] = useState('');
  const [recCatId, setRecCatId] = useState('');
  const [recSeverity, setRecSeverity] = useState<DisciplineSeverity>('verbal');
  const [incidentDate, setIncidentDate] = useState('');
  const [summary, setSummary] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [attachmentRef, setAttachmentRef] = useState('');
  const [catError, setCatError] = useState('');
  const [recError, setRecError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const [cats, recs] = await Promise.all([disciplineService.listCategories(), disciplineService.listRecords()]);
    setCategories(cats);
    setRecords(recs);
    setRecCatId((cur) => cur || cats[0]?.id || '');
  };

  useEffect(() => {
    void Promise.all([
      disciplineService.listCategories(),
      disciplineService.listRecords(),
      employeeService.listEmployees(),
    ]).then(([cats, recs, emps]) => {
      setCategories(cats);
      setRecords(recs);
      setEmployees(emps);
      setRecEmpId(emps[0]?.id ?? '');
      setRecCatId(cats[0]?.id ?? '');
      setIncidentDate(new Date().toISOString().slice(0, 10));
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load discipline data.');
      setIsLoading(false);
    });
  }, []);

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    setCatError('');
    try {
      await disciplineService.createCategory(catName.trim(), catSeverity);
      await refresh();
      setCatName('');
      setCatSeverity('verbal');
    } catch (error) {
      setCatError(error instanceof Error ? error.message : 'Unable to create discipline category.');
    }
  };

  const submitRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recEmpId || !recCatId || !incidentDate || !summary.trim()) {
      setRecError('Employee, category, incident date, and summary are required.');
      return;
    }
    setRecError('');
    try {
      await disciplineService.createRecord(
        recEmpId,
        recCatId,
        recSeverity,
        incidentDate,
        summary.trim(),
        correctiveAction.trim() || undefined,
        attachmentRef.trim() || undefined,
      );
      await refresh();
      setSummary('');
      setCorrectiveAction('');
      setAttachmentRef('');
    } catch (error) {
      setRecError(error instanceof Error ? error.message : 'Unable to create discipline record.');
    }
  };

  const updateStatus = async (id: string, status: DisciplineRecordStatus) => {
    try {
      await disciplineService.updateRecordStatus(id, status);
      await refresh();
    } catch (error) {
      setRecError(error instanceof Error ? error.message : 'Unable to update discipline record.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Write-Ups / Warnings</h2>
          <p className="lead">Categories are editable setup records. Write-ups now persist through the standalone backend with acknowledgement and HR review metadata.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 021 discipline" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getDisciplineServiceStatus().available && <p className="service-note">Discipline backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitCategory}>
          <h3>Add discipline category</h3>
          {catError && <p className="form-error">{catError}</p>}
          <div className="form-grid two-column">
            <label>Category name *
              <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Attendance" required />
            </label>
            <label>Default severity
              <select value={catSeverity} onChange={(e) => setCatSeverity(e.target.value as DisciplineSeverity)}>
                {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add category</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading discipline categories" message="Fetching live discipline categories and record counts." /> : categories.length ? categories.map((cat) => (
            <article className="record-card" key={cat.id}>
              <div className="record-card-header">
                <h3>{cat.name}</h3>
                <EmployeePortalStatusBadge status={cat.active ? 'active' : 'inactive'} />
              </div>
              <p>Default severity: {cat.defaultSeverity}</p>
              <p>Records: {records.filter((r) => r.categoryId === cat.id).length}</p>
            </article>
          )) : <EmptyStateCard title="No categories yet" message="Add a discipline category above." />}
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Add write-up / warning</h3>
          <p className="lead">Create a disciplinary record. Records start as drafts and must be explicitly issued.</p>
        </div>
        <form className="filter-card" onSubmit={submitRecord}>
          {recError && <p className="form-error">{recError}</p>}
          <div className="form-grid two-column">
            <label>Employee
              <select value={recEmpId} onChange={(e) => setRecEmpId(e.target.value)}>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </label>
            <label>Category
              <select value={recCatId} onChange={(e) => setRecCatId(e.target.value)}>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </label>
            <label>Severity
              <select value={recSeverity} onChange={(e) => setRecSeverity(e.target.value as DisciplineSeverity)}>
                {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Incident date *
              <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} required />
            </label>
            <label className="full-width">Summary *
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe the incident" required />
            </label>
            <label className="full-width">Corrective action
              <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} placeholder="Describe corrective action required (optional)" />
            </label>
            <label className="full-width">Attachment reference
              <input value={attachmentRef} onChange={(e) => setAttachmentRef(e.target.value)} placeholder="future-document-store://..." />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Create write-up</button>
          </div>
        </form>
      </section>

      <section className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading discipline records" message="Fetching live write-ups and acknowledgement status." /> : records.length ? records.map((rec) => {
            const cat = categories.find((c) => c.id === rec.categoryId);
            return (
              <article className="record-card" key={rec.id}>
                <div className="record-card-header">
                  <h3>{empName(employees, rec.employeeId)} — {rec.severity}</h3>
                  <EmployeePortalStatusBadge status={rec.status} />
                </div>
                <p>Category: {cat?.name ?? rec.categoryId} · Incident: {rec.incidentDate}</p>
                <p>{rec.summary}</p>
                {rec.correctiveAction && <p>Corrective action: {rec.correctiveAction}</p>}
                {rec.attachmentReference && <p>Attachment: {rec.attachmentReference}</p>}
                {rec.employeeAcknowledgedAt && <p>Acknowledged: {new Date(rec.employeeAcknowledgedAt).toLocaleString()}</p>}
                {rec.hrReviewedAt && <p>HR reviewed: {new Date(rec.hrReviewedAt).toLocaleString()}</p>}
                <div className="button-row">
                  {rec.status === 'draft' && (
                    <button className="primary" type="button" onClick={() => updateStatus(rec.id, 'issued')}>Issue</button>
                  )}
                  {rec.status === 'issued' && (
                    <button className="secondary" type="button" onClick={() => updateStatus(rec.id, 'acknowledged')}>Mark acknowledged</button>
                  )}
                  {(rec.status === 'issued' || rec.status === 'acknowledged') && (
                    <button className="secondary" type="button" onClick={() => updateStatus(rec.id, 'hr-reviewed')}>Mark HR reviewed</button>
                  )}
                </div>
              </article>
            );
          }) : <EmptyStateCard title="No discipline records yet" message="Create a write-up above." />}
        </div>
      </section>
    </section>
  );
}
