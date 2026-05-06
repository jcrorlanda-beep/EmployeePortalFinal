import { EmployeePortalAuthScreen } from './components/EmployeePortalAuthScreen';
import { EmployeePortalShell } from './components/EmployeePortalShell';
import { employeePortalRoutes } from './employeePortalRoutes';
import { useEmployeePortal } from './hooks/useEmployeePortal';
import { EmployeePortalSessionProvider } from './hooks/useEmployeePortalSession';

export function EmployeePortalPage() {
  const portal = useEmployeePortal();
  const {
    activeModule,
    authError,
    authState,
    availableModules,
    currentUser,
    dismissAuthError,
    login,
    logout,
    refreshSession,
    setActiveModule,
  } = portal;

  const ActivePage = employeePortalRoutes[activeModule];

  if (authState === 'loading') {
    return <EmployeePortalSessionProvider value={portal}><EmployeePortalAuthScreen mode="loading" /></EmployeePortalSessionProvider>;
  }

  if (authState === 'backend-unavailable' && !currentUser) {
    return (
      <EmployeePortalSessionProvider value={portal}>
        <EmployeePortalAuthScreen
          message={authError}
          mode="backend-unavailable"
          onRetry={async () => {
            await refreshSession();
          }}
        />
      </EmployeePortalSessionProvider>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <EmployeePortalSessionProvider value={portal}>
        <EmployeePortalAuthScreen
          currentUser={currentUser}
          message={authError ?? 'Ask an administrator to assign at least one Employee Portal permission group to this account.'}
          mode="unauthorized"
          onLogout={logout}
        />
      </EmployeePortalSessionProvider>
    );
  }

  if (authState !== 'authenticated') {
    return (
      <EmployeePortalSessionProvider value={portal}>
        <EmployeePortalAuthScreen
          message={authError}
          mode="login"
          onLogin={async (credentials) => {
            dismissAuthError();
            await login(credentials);
          }}
          onRetry={async () => {
            dismissAuthError();
            await refreshSession();
          }}
        />
      </EmployeePortalSessionProvider>
    );
  }

  return (
    <EmployeePortalSessionProvider value={portal}>
      <EmployeePortalShell
        activeModule={activeModule}
        authError={authError}
        authState={authState}
        availableModules={availableModules}
        currentUser={currentUser}
        onLogout={logout}
        onNavigate={setActiveModule}
        onRetrySession={async () => {
          await refreshSession();
        }}
      >
        <ActivePage />
      </EmployeePortalShell>
    </EmployeePortalSessionProvider>
  );
}
