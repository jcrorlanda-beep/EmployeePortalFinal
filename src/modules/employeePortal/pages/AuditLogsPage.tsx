import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { auditLogService, getAuditLogServiceStatus } from '../services/auditLogService';
import { getPortalApiErrorMessage } from '../services/employeePortalApi';
import type { AuditLogEntry, AuditLogListFilters } from '../types/auditTypes';

const prettyJson = (value: unknown) => {
  if (value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogListFilters>({ page: 1, pageSize: 25 });
  const [quickSearch, setQuickSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const visibleLogs = useMemo(() => {
    const normalizedQuery = quickSearch.trim().toLowerCase();
    const filtered = logs.filter((entry) => {
      if (!normalizedQuery) return true;
      const text = `${entry.module} ${entry.action} ${entry.actorLabel} ${entry.entityLabel ?? ''} ${entry.summary}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
    return [...filtered].sort((left, right) =>
      sortOrder === 'oldest'
        ? left.createdAt.localeCompare(right.createdAt)
        : right.createdAt.localeCompare(left.createdAt),
    );
  }, [logs, quickSearch, sortOrder]);

  const selectedLog = useMemo(
    () => visibleLogs.find((entry) => entry.id === selectedId) ?? visibleLogs[0] ?? null,
    [selectedId, visibleLogs],
  );

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await auditLogService.searchAuditLogs(filters);
      setLogs(result.items);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setSelectedId((current) => current ?? result.items[0]?.id ?? null);
      setLoadError('');
    } catch (error) {
      setLoadError(getPortalApiErrorMessage(error, 'Unable to load audit logs.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Central Audit Logs</h2>
          <p className="lead">Persistent backend audit records with module, action, actor, entity context, and before/after snapshots where available.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 060 audit logs" />
      </div>

      {loadError && <div className="inline-feedback-row"><p className="form-error">{loadError}</p><button className="secondary" type="button" onClick={() => void loadLogs()}>Retry</button></div>}
      {!loadError && !getAuditLogServiceStatus().available && <p className="service-note">Audit backend unavailable. Showing fallback audit history where live data is not reachable.</p>}

      <section className="role-admin-section">
        <div>
          <h3>Filters</h3>
        </div>
        <div className="filter-card training-assignment-form">
          <label>Quick search
            <input value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} placeholder="Search module, action, actor, entity, or summary" />
          </label>
          <label>Sort
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <label>Module
            <input value={filters.module ?? ''} onChange={(e) => setFilters((current) => ({ ...current, page: 1, module: e.target.value || undefined }))} />
          </label>
          <label>Action
            <input value={filters.action ?? ''} onChange={(e) => setFilters((current) => ({ ...current, page: 1, action: e.target.value || undefined }))} />
          </label>
          <label>Entity type
            <input value={filters.entityType ?? ''} onChange={(e) => setFilters((current) => ({ ...current, page: 1, entityType: e.target.value || undefined }))} />
          </label>
          <label>Entity ID
            <input value={filters.entityId ?? ''} onChange={(e) => setFilters((current) => ({ ...current, page: 1, entityId: e.target.value || undefined }))} />
          </label>
          <label>Actor user ID
            <input value={filters.actorUserId ?? ''} onChange={(e) => setFilters((current) => ({ ...current, page: 1, actorUserId: e.target.value || undefined }))} />
          </label>
          <label>Date from
            <input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters((current) => ({ ...current, page: 1, dateFrom: e.target.value || undefined }))} />
          </label>
          <label>Date to
            <input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters((current) => ({ ...current, page: 1, dateTo: e.target.value || undefined }))} />
          </label>
          <label>Page size
            <select value={String(filters.pageSize ?? 25)} onChange={(e) => setFilters((current) => ({ ...current, page: 1, pageSize: Number(e.target.value) }))}>
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading audit logs" message="Fetching persistent audit records from the standalone backend." /> : visibleLogs.length ? visibleLogs.map((log) => (
            <article className="record-card" key={log.id}>
              <div className="record-card-header">
                <h3>{log.entityLabel || log.entityId}</h3>
                <EmployeePortalStatusBadge status={log.action} />
              </div>
              <p>{log.module} · {log.entityType || 'entity'} · {new Date(log.createdAt).toLocaleString()}</p>
              <p>Actor: {log.actorLabel}{log.actorRole ? ` (${log.actorRole})` : ''}</p>
              <p>{log.summary}</p>
              <button className="secondary" type="button" onClick={() => setSelectedId(log.id)}>View details</button>
            </article>
          )) : <EmptyStateCard title="No audit logs found" message="Try widening the filters or clearing the quick search to view persisted audit records." />}

          <div className="button-row">
            <button className="secondary" type="button" disabled={page <= 1} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))}>Previous</button>
            <span>Page {page} of {totalPages} · {total} total</span>
            <button className="secondary" type="button" disabled={page >= totalPages} onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}>Next</button>
          </div>
        </div>

        {selectedLog && (
          <aside className="summary-card">
            <h3>Audit detail</h3>
            <p><strong>Module:</strong> {selectedLog.module}</p>
            <p><strong>Action:</strong> {selectedLog.action}</p>
            <p><strong>Actor:</strong> {selectedLog.actorLabel}</p>
            {selectedLog.actorUserId && <p><strong>Actor user ID:</strong> {selectedLog.actorUserId}</p>}
            {selectedLog.requestId && <p><strong>Request ID:</strong> {selectedLog.requestId}</p>}
            <p><strong>Entity:</strong> {selectedLog.entityType || 'entity'} · {selectedLog.entityLabel || selectedLog.entityId}</p>
            <p><strong>Created:</strong> {new Date(selectedLog.createdAt).toLocaleString()}</p>
            {selectedLog.metadata && (
              <>
                <h4>Metadata</h4>
                <pre>{prettyJson(selectedLog.metadata)}</pre>
              </>
            )}
            {selectedLog.beforeSnapshot !== undefined && (
              <>
                <h4>Before</h4>
                <pre>{prettyJson(selectedLog.beforeSnapshot)}</pre>
              </>
            )}
            {selectedLog.afterSnapshot !== undefined && (
              <>
                <h4>After</h4>
                <pre>{prettyJson(selectedLog.afterSnapshot)}</pre>
              </>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
