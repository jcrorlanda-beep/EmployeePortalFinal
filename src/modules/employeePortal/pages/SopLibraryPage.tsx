import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { createAuditMetadata } from '../services/employeePortalApi';
import { employeeService } from '../services/employeeService';
import { getSopServiceStatus, sopService } from '../services/sopService';
import type { Employee } from '../types/employeeTypes';
import type { SopAcknowledgement, SopDocument, SopDocumentDraft, SopDocumentStatus, SopDocumentType } from '../types/sopTypes';

const documentTypeOptions: SopDocumentType[] = ['SOP', 'Policy', 'Checklist', 'Form', 'Memo', 'External Reference'];
const documentStatusOptions: SopDocumentStatus[] = ['Draft', 'Active', 'Archived'];

const emptyDocumentDraft: SopDocumentDraft = {
  title: '',
  description: '',
  category: 'Operations',
  documentType: 'SOP',
  version: 'draft-1',
  owner: '',
  fileReference: '',
  acknowledgementRequired: true,
  status: 'Draft',
  effectiveDate: new Date().toISOString().slice(0, 10),
};

const toDocumentDraft = (document: SopDocument): SopDocumentDraft => ({
  title: document.title,
  description: document.description,
  category: document.category,
  documentType: document.documentType,
  version: document.version,
  owner: document.owner,
  fileReference: document.fileReference,
  acknowledgementRequired: document.acknowledgementRequired,
  status: document.status,
  effectiveDate: document.effectiveDate ?? '',
});

const employeeName = (employees: Employee[], employeeId: string) => {
  const employee = employees.find((item) => item.id === employeeId);
  return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNumber})` : employeeId;
};

export function SopLibraryPage() {
  const pageSize = 6;
  const [documents, setDocuments] = useState<SopDocument[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<SopAcknowledgement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [draft, setDraft] = useState<SopDocumentDraft>(emptyDocumentDraft);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'title-asc' | 'effective-desc' | 'status'>('effective-desc');
  const [page, setPage] = useState(1);
  const [ackDocumentId, setAckDocumentId] = useState('');
  const [ackEmployeeId, setAckEmployeeId] = useState('');
  const [ackNotes, setAckNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [serviceMode, setServiceMode] = useState<'api' | 'fallback'>('fallback');
  const [serviceMessage, setServiceMessage] = useState('Using local fallback data until the backend is available.');

  const categoryOptions = useMemo(() => Array.from(new Set(documents.map((document) => document.category))).sort(), [documents]);
  const documentById = useMemo(() => new Map(documents.map((document) => [document.id, document])), [documents]);
  const filteredDocuments = useMemo(
    () => {
      const normalizedQuery = query.trim().toLowerCase();
      const filtered = documents.filter((document) => {
        const categoryMatch = categoryFilter === 'all' || document.category === categoryFilter;
        const statusMatch = statusFilter === 'all' || document.status === statusFilter;
        const queryMatch = !normalizedQuery || `${document.title} ${document.owner} ${document.fileReference}`.toLowerCase().includes(normalizedQuery);
        return categoryMatch && statusMatch && queryMatch;
      });

      return [...filtered].sort((left, right) => {
        if (sortBy === 'title-asc') return left.title.localeCompare(right.title);
        if (sortBy === 'status') return left.status.localeCompare(right.status);
        return (right.effectiveDate ?? '').localeCompare(left.effectiveDate ?? '');
      });
    },
    [categoryFilter, documents, query, sortBy, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const pagedDocuments = useMemo(
    () => filteredDocuments.slice((page - 1) * pageSize, page * pageSize),
    [filteredDocuments, page, pageSize],
  );

  const refreshSops = async () => {
    const [documentList, acknowledgementList] = await Promise.all([sopService.listDocuments(), sopService.listAcknowledgements()]);
    const status = getSopServiceStatus();
    setServiceMode(status.mode);
    setServiceMessage(status.message ?? '');
    setDocuments(documentList);
    setAcknowledgements(acknowledgementList);
    setAckDocumentId((current) => current || documentList.find((document) => document.status === 'Active')?.id || documentList[0]?.id || '');
  };

  useEffect(() => {
    void (async () => {
      try {
        const [documentList, acknowledgementList, employeeList] = await Promise.all([sopService.listDocuments(), sopService.listAcknowledgements(), employeeService.listEmployees()]);
        const status = getSopServiceStatus();
        setServiceMode(status.mode);
        setServiceMessage(status.message ?? '');
        setDocuments(documentList);
        setAcknowledgements(acknowledgementList);
        setEmployees(employeeList);
        setAckDocumentId(documentList.find((document) => document.status === 'Active')?.id ?? documentList[0]?.id ?? '');
        setAckEmployeeId(employeeList[0]?.id ?? '');
        setLoadError('');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load SOP data.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setDraft(emptyDocumentDraft);
    setEditingDocumentId(null);
    setFormError('');
  };

  const startEdit = (document: SopDocument) => {
    setDraft(toDocumentDraft(document));
    setEditingDocumentId(document.id);
    setFormError('');
  };

  const submitDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingDocument) return;
    const normalizedDraft: SopDocumentDraft = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category.trim() || 'General',
      owner: draft.owner.trim(),
      version: draft.version.trim(),
      fileReference: draft.fileReference.trim(),
      effectiveDate: draft.effectiveDate || undefined,
    };

    if (!normalizedDraft.title || !normalizedDraft.version || !normalizedDraft.owner || !normalizedDraft.fileReference) {
      setFormError('Title, version, owner, and file reference are required.');
      return;
    }

    setFormError('');
    setIsSubmittingDocument(true);
    try {
      if (editingDocumentId) {
        await sopService.updateDocument(editingDocumentId, normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 006 SOP/document update'));
      } else {
        await sopService.createDocument(normalizedDraft, createAuditMetadata('mvp-admin', 'Phase 006 SOP/document create'));
      }
      await refreshSops();
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save the SOP/document record.');
    } finally {
      setIsSubmittingDocument(false);
    }
  };

  const archiveDocument = async (documentId: string) => {
    if (pendingArchiveId) return;
    setPendingArchiveId(documentId);
    try {
      await sopService.archiveDocument(documentId, createAuditMetadata('mvp-admin', 'Phase 006 SOP/document archive'));
      await refreshSops();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to archive the SOP/document record.');
    } finally {
      setPendingArchiveId(null);
    }
  };

  const acknowledgeDocument = async () => {
    if (!ackDocumentId || !ackEmployeeId || isAcknowledging) return;
    setIsAcknowledging(true);
    try {
      await sopService.acknowledgeDocument(ackDocumentId, ackEmployeeId, ackNotes, createAuditMetadata('mvp-admin', 'Phase 006 SOP acknowledgement placeholder'));
      await refreshSops();
      setAckNotes('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to record the SOP acknowledgement.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>SOP / Document Library</h2>
          <p className="lead">Maintain SOPs, policies, checklists, forms, versions, owners, and acknowledgement-ready records. Live persistence is used when the backend is reachable, while file references still point to future document storage only.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 006 SOP" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {serviceMode === 'fallback' && !loadError && <p className="service-note">Backend unavailable. Using local fallback SOP data. {serviceMessage}</p>}
      {serviceMode === 'api' && !loadError && <p className="service-note success">Live API mode is active for SOP documents and acknowledgements.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitDocument}>
          <h3>{editingDocumentId ? 'Edit SOP/document' : 'Add SOP/document'}</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label className="full-width">Title *<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
            <label>Category<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
            <label>Document type<select value={draft.documentType} onChange={(event) => setDraft({ ...draft, documentType: event.target.value as SopDocumentType })}>{documentTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label>Version *<input value={draft.version} onChange={(event) => setDraft({ ...draft, version: event.target.value })} required /></label>
            <label>Owner *<input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} required /></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SopDocumentStatus })}>{documentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Effective date<input type="date" value={draft.effectiveDate ?? ''} onChange={(event) => setDraft({ ...draft, effectiveDate: event.target.value })} /></label>
            <label className="full-width">File reference *<input value={draft.fileReference} onChange={(event) => setDraft({ ...draft, fileReference: event.target.value })} placeholder="future-document-store://..." required /></label>
            <label className="full-width">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label className="inline-check full-width"><input type="checkbox" checked={draft.acknowledgementRequired} onChange={(event) => setDraft({ ...draft, acknowledgementRequired: event.target.checked })} /> Acknowledgement required</label>
          </div>
          <div className="button-row"><button className="primary" disabled={isSubmittingDocument} type="submit">{isSubmittingDocument ? 'Saving…' : editingDocumentId ? 'Save document' : 'Add document'}</button><button className="secondary" disabled={isSubmittingDocument} type="button" onClick={resetForm}>Clear</button></div>
        </form>

        <div className="cards single-column">
          <div className="filter-card training-filter-card">
            <label>Search<input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search title, owner, or reference" /></label>
            <label>Category<select value={categoryFilter} onChange={(event) => { setPage(1); setCategoryFilter(event.target.value); }}><option value="all">All categories</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Status<select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }}><option value="all">All statuses</option>{documentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Sort by<select value={sortBy} onChange={(event) => { setPage(1); setSortBy(event.target.value as typeof sortBy); }}><option value="effective-desc">Newest effective date</option><option value="title-asc">Title A-Z</option><option value="status">Status</option></select></label>
          </div>
          {isLoading ? <EmptyStateCard title="Loading SOP documents" message="Fetching documents and acknowledgement records." /> : pagedDocuments.length ? pagedDocuments.map((document) => (
            <article className="record-card" key={document.id}>
              <div className="record-card-header"><h3>{document.title}</h3><EmployeePortalStatusBadge status={document.status} /></div>
              <p>{document.description || 'No description entered.'}</p>
              <p>{document.category} · {document.documentType} · Version {document.version}</p>
              <p>Owner: {document.owner} · Effective: {document.effectiveDate || 'Not set'}</p>
              <p>Reference: {document.fileReference}</p>
              <div className="training-card-footer">
                {document.acknowledgementRequired ? <EmployeePortalStatusBadge status="Acknowledgement required" /> : <span className="muted-text">Acknowledgement optional</span>}
                <div className="button-row compact-buttons">
                  <button className="secondary" disabled={isSubmittingDocument || pendingArchiveId === document.id} type="button" onClick={() => startEdit(document)}>Edit</button>
                  <button className="secondary danger" type="button" disabled={document.status === 'Archived' || Boolean(pendingArchiveId)} onClick={() => archiveDocument(document.id)}>{pendingArchiveId === document.id ? 'Archiving…' : 'Archive'}</button>
                </div>
              </div>
            </article>
          )) : <EmptyStateCard title="No SOP/documents match these filters" message="Clear filters or add a document record to continue." />}
          <div className="button-row table-pagination-row">
            <button className="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
            <span>Page {page} of {totalPages} · {filteredDocuments.length} matching documents</span>
            <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
          </div>
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Acknowledgement placeholder</h3>
          <p className="lead">Record employee acknowledgement readiness without enabling login/auth or electronic signature enforcement.</p>
        </div>
        <div className="filter-card training-assignment-form">
          <label>Document<select value={ackDocumentId} onChange={(event) => setAckDocumentId(event.target.value)}>{documents.map((document) => <option key={document.id} value={document.id}>{document.title} · {document.version}</option>)}</select></label>
          <label>Employee<select value={ackEmployeeId} onChange={(event) => setAckEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeNumber}</option>)}</select></label>
          <label className="full-width">Acknowledgement notes<input value={ackNotes} onChange={(event) => setAckNotes(event.target.value)} placeholder="Optional acknowledgement note" /></label>
          <button className="primary align-end" disabled={isAcknowledging} type="button" onClick={acknowledgeDocument}>{isAcknowledging ? 'Saving…' : 'Record acknowledgement'}</button>
        </div>
      </section>

      <div className="cards single-column">
        {isLoading ? <EmptyStateCard title="Loading acknowledgements" message="Fetching SOP acknowledgement activity." /> : acknowledgements.length ? acknowledgements.map((acknowledgement) => (
          <article className="record-card" key={acknowledgement.id}>
            <div className="record-card-header"><h3>{employeeName(employees, acknowledgement.employeeId)}</h3><EmployeePortalStatusBadge status={acknowledgement.status} /></div>
            <p>Document: {documentById.get(acknowledgement.documentId)?.title ?? acknowledgement.documentId}</p>
            <p>Acknowledged: {acknowledgement.acknowledgedAt ? new Date(acknowledgement.acknowledgedAt).toLocaleString() : 'Pending'}</p>
            <p>Notes: {acknowledgement.notes || 'No notes'}</p>
          </article>
        )) : <EmptyStateCard title="No acknowledgements yet" message="Use the acknowledgement placeholder when an employee has reviewed a document." />}
      </div>
    </section>
  );
}
