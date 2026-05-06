import type { PortalCurrentUser } from '../types/authTypes';
import { portalSafetyNotes } from '../utils/employeePortalConstants';

interface Props {
  currentUser?: PortalCurrentUser | null;
  authState?: 'loading' | 'authenticated' | 'anonymous';
}

export function EmployeePortalHeader({ currentUser, authState = 'anonymous' }: Props) {
  return (
    <header className="portal-header">
      <div>
        <p className="eyebrow">Northeast Car Care Centre</p>
        <h1>NCCC Employee Portal MVP</h1>
        <p>Separate HR/workforce management portal prepared for future landing-page entry only.</p>
        <div className="header-user-strip">
          <span className="header-user-badge">{authState === 'authenticated' ? 'Standalone auth active' : authState === 'loading' ? 'Checking portal session' : 'Standalone preview mode'}</span>
          <span className="header-user-copy">
            {currentUser ? `${currentUser.email} · ${currentUser.role}` : 'No portal user session detected.'}
          </span>
        </div>
      </div>
      <ul>{portalSafetyNotes.map((note) => <li key={note}>{note}</li>)}</ul>
    </header>
  );
}
