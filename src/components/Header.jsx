import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import ChangePasswordModal from './ChangePasswordModal';
import Toast from './Toast';
import { formatTimestamp } from '../lib/dates';

export default function Header({ onRefresh, refreshing, lastSyncedAt }) {
  const { userEmail, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const handlePasswordChanged = () => {
    setChangingPassword(false);
    setToast({ tone: 'success', message: 'Password changed.' });
  };

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <BrandLogo className="app-header__logo" />
          <div>
            <h1 className="app-header__title">Hardware Maintenance Tracker</h1>
            <p className="app-header__subtitle">
              {lastSyncedAt ? `Last synced ${formatTimestamp(lastSyncedAt)}` : 'Connecting…'}
            </p>
          </div>
        </div>

        <div className="app-header__actions">
          <button type="button" className="btn btn--ghost" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <span className="app-header__user" title={userEmail}>{userEmail}</span>
          <button type="button" className="btn btn--ghost" onClick={() => setChangingPassword(true)}>
            Change password
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      {changingPassword ? (
        <ChangePasswordModal
          onClose={() => setChangingPassword(false)}
          onSuccess={handlePasswordChanged}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </header>
  );
}
