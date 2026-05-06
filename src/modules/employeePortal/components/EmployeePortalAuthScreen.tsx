import { useState } from 'react';
import type { FormEvent } from 'react';
import type { PortalCurrentUser, PortalLoginCredentials } from '../types/authTypes';

interface Props {
  mode: 'loading' | 'login' | 'backend-unavailable' | 'unauthorized';
  message?: string | null;
  currentUser?: PortalCurrentUser | null;
  onLogin?: (credentials: PortalLoginCredentials) => Promise<void>;
  onRetry?: () => Promise<void> | void;
  onLogout?: () => Promise<void> | void;
}

export function EmployeePortalAuthScreen({
  mode,
  message,
  currentUser,
  onLogin,
  onRetry,
  onLogout,
}: Props) {
  const [credentials, setCredentials] = useState<PortalLoginCredentials>({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onLogin) return;

    setSubmitting(true);
    setLocalError(null);
    try {
      await onLogin(credentials);
      setCredentials({ email: '', password: '' });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (mode === 'loading') {
      return (
        <>
          <span className="header-user-badge">Checking standalone portal session</span>
          <h1>NCCC Employee Portal</h1>
          <p className="lead">We’re confirming your standalone NCCC session before loading the portal.</p>
        </>
      );
    }

    if (mode === 'backend-unavailable') {
      return (
        <>
          <span className="header-user-badge">Backend unavailable</span>
          <h1>NCCC Employee Portal</h1>
          <p className="lead">{message ?? 'The standalone Employee Portal backend is unavailable right now.'}</p>
          <div className="button-row">
            <button className="primary" onClick={() => void onRetry?.()} type="button">Retry connection</button>
          </div>
        </>
      );
    }

    if (mode === 'unauthorized') {
      return (
        <>
          <span className="header-user-badge">Access limited</span>
          <h1>NCCC Employee Portal</h1>
          <p className="lead">
            {currentUser
              ? `${currentUser.email} is signed in, but this account does not currently have access to any Employee Portal modules.`
              : 'This account does not currently have access to the Employee Portal.'}
          </p>
          {message ? <p className="form-error">{message}</p> : null}
          <div className="button-row">
            <button className="secondary" onClick={() => void onLogout?.()} type="button">Sign out</button>
          </div>
        </>
      );
    }

    return (
      <>
        <span className="header-user-badge">Standalone portal sign-in</span>
        <h1>NCCC Employee Portal</h1>
        <p className="lead">Sign in with your standalone NCCC portal account to continue. This login does not use TalyerOS.</p>
        {message ? <div className="inline-feedback-row"><p className="service-note">{message}</p><button className="secondary" onClick={() => void onRetry?.()} type="button">Retry backend</button></div> : null}
        {localError ? <p className="form-error">{localError}</p> : null}
        <form className="form-grid auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="username"
              name="email"
              onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
              placeholder="hr.manager@nccc.local"
              type="email"
              value={credentials.email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
              type="password"
              value={credentials.password}
            />
          </label>
          <div className="button-row">
            <button className="primary" disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
            <button className="secondary" onClick={() => void onRetry?.()} type="button">Retry backend</button>
          </div>
        </form>
      </>
    );
  };

  return (
    <div className="portal-auth-layout">
      <section className="portal-auth-card">
        {renderContent()}
      </section>
    </div>
  );
}
