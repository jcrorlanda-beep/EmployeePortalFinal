import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmployeePortalStatusBadge } from '../components/EmployeePortalStatusBadge';
import { EmptyStateCard } from '../components/EmptyStateCard';

interface Announcement {
  id: string;
  title: string;
  body: string;
  targetDepartment: string;
  effectiveDate: string;
  archived: boolean;
  createdAt: string;
}

let nextId = 1;
const createAnnouncementId = () => `ann_${(nextId++).toString().padStart(3, '0')}`;

export function InternalCommunicationPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 'ann_seed_001',
      title: 'Welcome to the Employee Portal',
      body: 'This portal is your central hub for HR, payroll, scheduling, and operations. Contact HR for any questions.',
      targetDepartment: 'All',
      effectiveDate: '2026-05-06',
      archived: false,
      createdAt: '2026-05-06T00:00:00.000Z',
    },
  ]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('All');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [showArchived, setShowArchived] = useState(false);
  const [formError, setFormError] = useState('');

  const visible = announcements.filter((a) => showArchived || !a.archived);

  const submitAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim() || !effectiveDate) {
      setFormError('Title, body, and effective date are required.');
      return;
    }
    setFormError('');
    const announcement: Announcement = {
      id: createAnnouncementId(),
      title: title.trim(),
      body: body.trim(),
      targetDepartment: targetDepartment.trim() || 'All',
      effectiveDate,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => [announcement, ...prev]);
    setTitle('');
    setBody('');
    setTargetDepartment('All');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
  };

  const archiveAnnouncement = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, archived: true } : a)),
    );
  };

  const unarchiveAnnouncement = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, archived: false } : a)),
    );
  };

  return (
    <section className="crud-page">
      <div className="page-heading-row">
        <div>
          <h2>Internal Communication</h2>
          <p className="lead">Post announcements to all employees or specific departments. Archive old notices to keep the board current.</p>
        </div>
        <EmployeePortalStatusBadge status="Phase 024 internal communication" />
      </div>

      <div className="crud-layout narrow">
        <form className="form-card" onSubmit={submitAnnouncement}>
          <h3>New announcement</h3>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-grid two-column">
            <label className="full-width">Title *
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" required />
            </label>
            <label className="full-width">Body *
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Announcement content" required />
            </label>
            <label>Target department
              <input value={targetDepartment} onChange={(e) => setTargetDepartment(e.target.value)} placeholder="All" />
            </label>
            <label>Effective date *
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
            </label>
          </div>
          <div className="button-row">
            <button className="primary" type="submit">Post announcement</button>
          </div>
        </form>

        <div className="cards single-column">
          <div className="filter-card">
            <label className="inline-check">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
            </label>
          </div>
          {visible.length ? visible.map((ann) => (
            <article className="record-card" key={ann.id}>
              <div className="record-card-header">
                <h3>{ann.title}</h3>
                <EmployeePortalStatusBadge status={ann.archived ? 'archived' : 'active'} />
              </div>
              <p>{ann.body}</p>
              <p>Target: {ann.targetDepartment} · Effective: {ann.effectiveDate}</p>
              <p>Posted: {new Date(ann.createdAt).toLocaleString()}</p>
              <div className="button-row">
                {ann.archived
                  ? <button className="secondary" type="button" onClick={() => unarchiveAnnouncement(ann.id)}>Unarchive</button>
                  : <button className="secondary" type="button" onClick={() => archiveAnnouncement(ann.id)}>Archive</button>}
              </div>
            </article>
          )) : <EmptyStateCard title="No announcements" message="Post an announcement above." />}
        </div>
      </div>
    </section>
  );
}
