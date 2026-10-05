import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccountMenu from './AccountMenu';
import BrandLogo from './BrandLogo';
import ChangePasswordModal from './ChangePasswordModal';
import Toast from './Toast';
import { formatTimestamp } from '../lib/dates';
import { CURRENT_VERSION } from '../lib/releaseNotes';

export default function Header({ lastSyncedAt, onOpenReleaseNotes, hasUnseenRelease = false }) {
  const { userEmail, isAdmin, signOut } = useAuth();
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
            <div className="app-header__title-row">
              <h1 className="app-header__title">Orbit</h1>
              {/* The version, as on Ascend: click it for what changed. */}
              <button
                type="button"
                className="app-header__version"
                onClick={onOpenReleaseNotes}
                title="Release notes"
                aria-label={`Version ${CURRENT_VERSION}: release notes${hasUnseenRelease ? ' (new)' : ''}`}
              >
                {CURRENT_VERSION}
                {hasUnseenRelease ? <span className="app-header__version-new">New</span> : null}
              </button>
            </div>
            <p className="app-header__subtitle">
              {lastSyncedAt ? `Last synced ${formatTimestamp(lastSyncedAt)}` : 'Connecting…'}
            </p>
          </div>
        </div>

        <AccountMenu
          email={userEmail}
          isAdmin={isAdmin}
          onChangePassword={() => setChangingPassword(true)}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
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
