import type { PortalAuthState, PortalCurrentUser } from '../types/authTypes';
import { portalSafetyNotes } from '../utils/employeePortalConstants';

interface Props {
  currentUser?: PortalCurrentUser | null;
  authState?: PortalAuthState;
  authError?: string | null;
  onLogout?: () => Promise<void> | void;
  onRetrySession?: () => Promise<void> | void;
}

const authLabels: Record<PortalAuthState, string> = {
  loading: 'Checking portal session',
  authenticated: 'Standalone auth active',
  anonymous: 'Standalone sign-in required',
  'backend-unavailable': 'Session cached, backend unavailable',
  unauthorized: 'Signed in, access limited',
};

export function EmployeePortalHeader({
  currentUser,
  authState = 'anonymous',
  authError,
  onLogout,
  onRetrySession,
}: Props) {
  return (
    <header className="portal-header">
      <div>
        <p className="eyebrow">Northeast Car Care Centre</p>
        <h1>NCCC Employee Portal MVP</h1>
        <p>Separate HR/workforce management portal prepared for future landing-page entry only.</p>
        <div className="header-user-strip">
          <span className="header-user-badge">{authLabels[authState]}</span>
          <span className="header-user-copy">
            {currentUser ? `${currentUser.email} · ${currentUser.role}` : 'No portal user session detected.'}
          </span>
          {authState === 'authenticated' ? <button className="header-action-button" onClick={() => void onLogout?.()} type="button">Sign out</button> : null}
          {authError ? <button className="header-action-button secondary" onClick={() => void onRetrySession?.()} type="button">Retry session</button> : null}
        </div>
        {authError ? <p className="header-inline-alert">{authError}</p> : null}
      </div>
      <ul>{portalSafetyNotes.map((note) => <li key={note}>{note}</li>)}</ul>
    </header>
  );
}
