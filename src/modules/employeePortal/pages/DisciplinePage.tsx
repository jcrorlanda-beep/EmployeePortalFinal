import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { isStaleRecordError } from '../services/employeePortalApi';
import { disciplineService, getDisciplineServiceStatus } from '../services/disciplineService';
import type { Employee } from '../types/employeeTypes';
import type { DisciplineCategory, DisciplineRecord, DisciplineRecordStatus, DisciplineSeverity } from '../types/disciplineTypes';

const severityOptions: DisciplineSeverity[] = ['verbal', 'written-warning', 'final-warning', 'suspension-notice', 'termination-notice'];

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

export function DisciplinePage() {
  const pageSize = 6;
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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DisciplineRecordStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | DisciplineSeverity>('all');
  const [page, setPage] = useState(1);
  const [catError, setCatError] = useState('');
  const [recError, setRecError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);

  const refresh = async () => {
    const [cats, recs] = await Promise.all([disciplineService.listCategories(), disciplineService.listRecords()]);
    setCategories(cats);
    setRecords(recs);
    setRecCatId((cur) => cur || cats[0]?.id || '');
  };

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...records]
      .filter((record) => {
        const statusMatch = statusFilter === 'all' || record.status === statusFilter;
        const severityMatch = severityFilter === 'all' || record.severity === severityFilter;
        const categoryName = categories.find((category) => category.id === record.categoryId)?.name ?? '';
        const text = `${empName(employees, record.employeeId)} ${categoryName} ${record.summary}`.toLowerCase();
        const queryMatch = !normalizedQuery || text.includes(normalizedQuery);
        return statusMatch && severityMatch && queryMatch;
      })
      .sort((left, right) => right.incidentDate.localeCompare(left.incidentDate));
  }, [categories, employees, query, records, severityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pagedRecords = useMemo(
    () => filteredRecords.slice((page - 1) * pageSize, page * pageSize),
    [filteredRecords, page, pageSize],
  );

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
    if (isSubmittingCategory) return;
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    setCatError('');
    setIsSubmittingCategory(true);
    try {
      await disciplineService.createCategory(catName.trim(), catSeverity);
      await refresh();
      setCatName('');
      setCatSeverity('verbal');
    } catch (error) {
      setCatError(error instanceof Error ? error.message : 'Unable to create discipline category.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const submitRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRecord) return;
    if (!recEmpId || !recCatId || !incidentDate || !summary.trim()) {
      setRecError('Employee, category, incident date, and summary are required.');
      return;
    }
    setRecError('');
    setIsSubmittingRecord(true);
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
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  const updateStatus = async (record: DisciplineRecord, status: DisciplineRecordStatus) => {
    if (pendingRecordId) return;
    setPendingRecordId(record.id);
    try {
      await disciplineService.updateRecordStatus(record.id, status, record.updatedAt);
      await refresh();
    } catch (error) {
      setRecError(error instanceof Error ? error.message : 'Unable to update discipline record.');
      if (isStaleRecordError(error)) {
        await refresh();
      }
    } finally {
      setPendingRecordId(null);
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
            <button className="primary" disabled={isSubmittingCategory} type="submit">{isSubmittingCategory ? 'Saving…' : 'Add category'}</button>
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
            <button className="primary" disabled={isSubmittingRecord} type="submit">{isSubmittingRecord ? 'Saving…' : 'Create write-up'}</button>
          </div>
        </form>
      </section>

      <section className="crud-layout narrow">
        <div className="cards single-column">
          <div className="filter-card training-filter-card">
            <label>Search<input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder="Search employee, category, or summary" /></label>
            <label>Status<select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as typeof statusFilter); }}><option value="all">All statuses</option>{['draft', 'issued', 'acknowledged', 'hr-reviewed'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Severity<select value={severityFilter} onChange={(e) => { setPage(1); setSeverityFilter(e.target.value as typeof severityFilter); }}><option value="all">All severities</option>{severityOptions.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></label>
          </div>
          {isLoading ? <EmptyStateCard title="Loading discipline records" message="Fetching live write-ups and acknowledgement status." /> : pagedRecords.length ? pagedRecords.map((rec) => {
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
                    <button className="primary" disabled={pendingRecordId === rec.id} type="button" onClick={() => updateStatus(rec, 'issued')}>{pendingRecordId === rec.id ? 'Updating…' : 'Issue'}</button>
                  )}
                  {rec.status === 'issued' && (
                    <button className="secondary" disabled={pendingRecordId === rec.id} type="button" onClick={() => updateStatus(rec, 'acknowledged')}>Mark acknowledged</button>
                  )}
                  {(rec.status === 'issued' || rec.status === 'acknowledged') && (
                    <button className="secondary" disabled={pendingRecordId === rec.id} type="button" onClick={() => updateStatus(rec, 'hr-reviewed')}>Mark HR reviewed</button>
                  )}
                </div>
              </article>
            );
          }) : <EmptyStateCard title="No discipline records yet" message="Create a write-up above." />}
          <div className="button-row table-pagination-row">
            <button className="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
            <span>Page {page} of {totalPages} · {filteredRecords.length} matching records</span>
            <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
          </div>
        </div>
      </section>
    </section>
  );
}
