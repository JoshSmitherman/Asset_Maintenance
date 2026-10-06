import { useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabaseClient';
import AppShell from './components/AppShell';
import LoginPage from './components/LoginPage';
import AccessPending from './components/AccessPending';
import { describeDatabaseError } from './lib/errors';

function ConfigurationNotice() {
  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">Configuration required</h1>
        <p className="login__subtitle">
          This build has no Supabase credentials, so it cannot connect to the database.
        </p>
        <ul className="config-list">
          <li>Local development: copy <code>.env.example</code> to <code>.env.local</code> and fill in the two values.</li>
          <li>GitHub Pages: add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> as repository secrets, then re-run the deploy workflow.</li>
        </ul>
      </div>
    </div>
  );
}

function Waiting({ children }) {
  return (
    <div className="login">
      <p className="empty-state login__waiting" role="status">{children}</p>
    </div>
  );
}

function AccessCheckFailed({ error, onRetry, onSignOut }) {
  return (
    <div className="login">
      <div className="login__card" role="alert">
        <h1 className="login__title">Could not check your access</h1>
        <p>{describeDatabaseError(error)}</p>
        <button type="button" className="btn btn--primary btn--block" onClick={onRetry}>Try again</button>
        <button type="button" className="link-button login__alt" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

export default function App() {
  const { session, initialising, membership, refreshMembership, signOut } = useAuth();

  if (!isSupabaseConfigured) return <ConfigurationNotice />;
  if (initialising) return <Waiting>Checking your session…</Waiting>;
  if (!session) return <LoginPage />;
  if (membership.status === 'loading') return <Waiting>Checking your access…</Waiting>;
  if (membership.status === 'error') {
    return (
      <AccessCheckFailed
        error={membership.error}
        onRetry={refreshMembership}
        onSignOut={() => signOut().catch(() => {})}
      />
    );
  }
  if (membership.status === 'none') return <AccessPending />;
  return <AppShell />;
}
