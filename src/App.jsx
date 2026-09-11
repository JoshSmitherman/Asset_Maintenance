import { useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabaseClient';
import AppShell from './components/AppShell';
import LoginPage from './components/LoginPage';

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

export default function App() {
  const { session, initialising } = useAuth();

  if (!isSupabaseConfigured) return <ConfigurationNotice />;
  if (initialising) {
    return (
      <div className="login">
        <p className="empty-state">Checking your session…</p>
      </div>
    );
  }
  if (!session) return <LoginPage />;
  return <AppShell />;
}
