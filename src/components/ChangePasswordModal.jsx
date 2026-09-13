import { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';

/** Supabase's own absolute floor. Its dashboard can require more; that
 *  stricter message, if any, comes back from the server and is shown as-is. */
const MIN_LENGTH = 6;

function validate(password, confirm) {
  if (!password || !confirm) {
    return 'Enter and confirm your new password.';
  }
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return 'Passwords do not match.';
  }
  return null;
}

/** Turns a Supabase Auth error into something a technician can act on. */
function describeAuthError(error) {
  const message = error?.message ?? '';
  if (message.toLowerCase().includes('session')) {
    return 'Your session has expired. Please sign out and back in, then try again.';
  }
  return message || 'Could not change your password. Please try again.';
}

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate(password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await changePassword(password);
      onSuccess();
    } catch (caught) {
      setError(describeAuthError(caught));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Change password"
      description="Choose a new password for your account. You'll stay signed in."
      onClose={busy ? () => {} : onClose}
      size="sm"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal__body field-stack">
          <div className="field">
            <label className="field__label" htmlFor="new_password">New password</label>
            <input
              id="new_password"
              className={`input${error ? ' input--error' : ''}`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              autoFocus
              disabled={busy}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="confirm_password">Confirm new password</label>
            <input
              id="confirm_password"
              className={`input${error ? ' input--error' : ''}`}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                setError(null);
              }}
              disabled={busy}
            />
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
