import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { employeeService } from '../services/employeeService';
import { getReviewServiceStatus, reviewService } from '../services/reviewService';
import type { Employee } from '../types/employeeTypes';
import type { PerformanceReview, PerformanceReviewTemplate, ReviewStatus, ReviewTemplateItem } from '../types/performanceReviewTypes';

const empName = (employees: Employee[], id: string) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
};

const weightedScore = (review: PerformanceReview): string => {
  if (!review.items.length) return 'No items';
  const totalWeight = review.items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 'N/A';
  const weighted = review.items.reduce((sum, item) => sum + (item.score / item.maxScore) * item.weight, 0);
  return `${((weighted / totalWeight) * 100).toFixed(1)}%`;
};

export function MonthlyReviewsPage() {
  const [templates, setTemplates] = useState<PerformanceReviewTemplate[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tplName, setTplName] = useState('');
  const [tplItemsCsv, setTplItemsCsv] = useState('Quality:30:10, Attendance:25:10, Teamwork:25:10, Productivity:20:10');
  const [revEmpId, setRevEmpId] = useState('');
  const [revTplId, setRevTplId] = useState('');
  const [revMonth, setRevMonth] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [tplError, setTplError] = useState('');
  const [revError, setRevError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const selectedReview = useMemo(
    () => reviews.find((r) => r.id === selectedReviewId) ?? null,
    [reviews, selectedReviewId],
  );

  const refresh = async () => {
    const [tpls, revList] = await Promise.all([reviewService.listTemplates(), reviewService.listReviews()]);
    setTemplates(tpls);
    setReviews(revList);
    setRevTplId((cur) => cur || tpls[0]?.id || '');
  };

  useEffect(() => {
    void Promise.all([
      reviewService.listTemplates(),
      reviewService.listReviews(),
      employeeService.listEmployees(),
    ]).then(([tpls, revList, emps]) => {
      setTemplates(tpls);
      setReviews(revList);
      setEmployees(emps);
      setRevEmpId(emps[0]?.id ?? '');
      setRevTplId(tpls[0]?.id ?? '');
      setRevMonth(new Date().toISOString().slice(0, 7));
      setSelectedReviewId(revList[0]?.id ?? null);
      setLoadError('');
      setIsLoading(false);
    }, (error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load review data.');
      setIsLoading(false);
    });
  }, []);

  const submitTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tplName.trim()) {
      setTplError('Template name is required.');
      return;
    }
    const items: ReviewTemplateItem[] = tplItemsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const parts = s.split(':');
        return {
          label: parts[0]?.trim() ?? s,
          weight: Number(parts[1]) || 25,
          maxScore: Number(parts[2]) || 10,
        };
      });
    if (!items.length) {
      setTplError('Add at least one item (label:weight:maxScore).');
      return;
    }
    setTplError('');
    try {
      await reviewService.createTemplate(tplName.trim(), items);
      await refresh();
      setTplName('');
    } catch (error) {
      setTplError(error instanceof Error ? error.message : 'Unable to create review template.');
    }
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!revEmpId || !revTplId || !revMonth) {
      setRevError('Employee, template, and review month are required.');
      return;
    }
    setRevError('');
    try {
      const review = await reviewService.createReview(revEmpId, revTplId, revMonth);
      await refresh();
      if (review) setSelectedReviewId(review.id);
    } catch (error) {
      setRevError(error instanceof Error ? error.message : 'Unable to create performance review.');
    }
  };

  const updateScore = async (reviewId: string, itemId: string, score: number, notes?: string) => {
    try {
      await reviewService.updateReviewItemScore(reviewId, itemId, score, notes);
      await refresh();
      setSelectedReviewId(reviewId);
    } catch (error) {
      setRevError(error instanceof Error ? error.message : 'Unable to update review score.');
    }
  };

  const updateStatus = async (id: string, status: ReviewStatus) => {
    try {
      await reviewService.updateReviewStatus(id, status);
      await refresh();
      setSelectedReviewId(id);
    } catch (error) {
      setRevError(error instanceof Error ? error.message : 'Unable to update review status.');
    }
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Monthly Performance Reviews</h2>
          <p className="lead">Create review templates with weighted items, assign them to employees, and track submission, acknowledgement, and HR approval through live backend persistence.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 023 monthly reviews" />
      </div>

      {loadError && <p className="form-error">{loadError}</p>}
      {!loadError && !getReviewServiceStatus().available && <p className="service-note">Review backend unavailable. Live persistence is required for this module.</p>}

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitTemplate}>
          <h3>Add review template</h3>
          {tplError && <p className="form-error">{tplError}</p>}
          <div className="form-grid two-column">
            <label className="full-width">Template name *
              <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Monthly Performance Review" required />
            </label>
            <label className="full-width">Items (label:weight:maxScore, comma separated)
              <input value={tplItemsCsv} onChange={(e) => setTplItemsCsv(e.target.value)} placeholder="Quality:30:10, Attendance:25:10" />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Add template</button>
          </div>
        </form>

        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading review templates" message="Fetching live review templates and their item definitions." /> : templates.length ? templates.map((tpl) => (
            <article className="record-card" key={tpl.id}>
              <div className="record-card-header">
                <h3>{tpl.name}</h3>
                <EmployeePortalStatusBadge status={tpl.active ? 'active' : 'inactive'} />
              </div>
              <p>Items: {tpl.items.map((i) => `${i.label} (${i.weight}%)`).join(', ')}</p>
              <p>Reviews: {reviews.filter((r) => r.templateId === tpl.id).length}</p>
            </article>
          )) : <EmptyStateCard title="No templates yet" message="Add a review template above." />}
        </div>
      </div>

      <section className="role-admin-section">
        <div>
          <h3>Create performance review</h3>
        </div>
        <form className="filter-card training-assignment-form" onSubmit={submitReview}>
          {revError && <p className="form-error">{revError}</p>}
          <label>Employee
            <select value={revEmpId} onChange={(e) => setRevEmpId(e.target.value)}>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </label>
          <label>Template
            <select value={revTplId} onChange={(e) => setRevTplId(e.target.value)}>
              {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
            </select>
          </label>
          <label>Review month
            <input type="month" value={revMonth} onChange={(e) => setRevMonth(e.target.value)} />
          </label>
          <button className="primary align-end" type="submit">Create review</button>
        </form>
      </section>

      <div className="crud-layout narrow">
        <div className="cards single-column">
          {isLoading ? <EmptyStateCard title="Loading reviews" message="Fetching live monthly review records and score state." /> : reviews.length ? reviews.map((rev) => (
            <article className="record-card" key={rev.id}>
              <div className="record-card-header">
                <h3>{empName(employees, rev.employeeId)} — {rev.reviewMonth}</h3>
                <EmployeePortalStatusBadge status={rev.status} />
              </div>
              <p>Template: {templates.find((t) => t.id === rev.templateId)?.name ?? rev.templateId}</p>
              <p>Weighted score: {weightedScore(rev)}</p>
              <button className="secondary" type="button" onClick={() => setSelectedReviewId(rev.id)}>Review scores</button>
            </article>
          )) : <EmptyStateCard title="No reviews yet" message="Create a review above." />}
        </div>

        {selectedReview && (
          <aside className="summary-card">
            <h3>Score entry — {empName(employees, selectedReview.employeeId)}</h3>
            <EmployeePortalStatusBadge status={selectedReview.status} />
            <p>Month: {selectedReview.reviewMonth}</p>
            <p>Weighted score: {weightedScore(selectedReview)}</p>
            {selectedReview.items.map((item) => (
              <div key={item.id} className="progress-step">
                <p>{item.label} (weight: {item.weight}%)</p>
                <label>Score (0–{item.maxScore})
                  <input
                    type="number"
                    min="0"
                    max={item.maxScore}
                    value={item.score}
                    onChange={(e) => updateScore(selectedReview.id, item.id, Number(e.target.value), item.notes)}
                  />
                </label>
                {item.notes && <p>{item.notes}</p>}
              </div>
            ))}
            <div className="button-row">
              {selectedReview.status === 'draft' && (
                <button className="primary" type="button" onClick={() => updateStatus(selectedReview.id, 'submitted')}>Submit</button>
              )}
              {selectedReview.status === 'submitted' && (
                <button className="secondary" type="button" onClick={() => updateStatus(selectedReview.id, 'employee-acknowledged')}>Employee acknowledge</button>
              )}
              {selectedReview.status === 'employee-acknowledged' && (
                <button className="primary" type="button" onClick={() => updateStatus(selectedReview.id, 'hr-approved')}>HR approve</button>
              )}
            </div>
            {selectedReview.employeeAcknowledgedAt && <p>Acknowledged: {new Date(selectedReview.employeeAcknowledgedAt).toLocaleString()}</p>}
            {selectedReview.hrApprovedAt && <p>HR approved: {new Date(selectedReview.hrApprovedAt).toLocaleString()}</p>}
          </aside>
        )}
      </div>
    </section>
  );
}
