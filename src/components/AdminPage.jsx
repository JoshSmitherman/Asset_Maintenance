import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import ModelNameTidy from './ModelNameTidy';
import { callFunction } from '../lib/edgeFunctions';
import { formatTimestamp } from '../lib/dates';

const MIN_PASSWORD = 8;
// No 0/O, 1/l/I: these get read out over the phone.
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generatePassword(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join('');
}

const admin = (action, fields = {}) => callFunction('admin-users', { action, ...fields });

function PasswordField({ id, value, onChange, disabled }) {
  return (
    <div className="password-field">
      <input
        id={id}
        className="input"
        type="text"
        autoComplete="new-password"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn btn--ghost btn--small"
        onClick={() => onChange(generatePassword())}
        disabled={disabled}
      >
        Generate
      </button>
    </div>
  );
}

function AddAccountModal({ onClose, onCreated }) {
  const [values, setValues] = useState({ email: '', password: generatePassword(), role: 'user' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (value) => setValues((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!values.email.trim()) return setError('Enter their email address.');
    if (values.password.length < MIN_PASSWORD) {
      return setError(`The password must be at least ${MIN_PASSWORD} characters.`);
    }
    setBusy(true);
    setError(null);
    try {
      await admin('create', { email: values.email.trim(), password: values.password, role: values.role });
      onCreated(values);
    } catch (caught) {
      setError(caught.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add an account"
      description="They can sign in straight away, and change the password from the header."
      onClose={busy ? () => {} : onClose}
      size="sm"
    >
      <form onSubmit={submit} noValidate>
        <div className="modal__body form-grid form-grid--single">
          <div className="field">
            <label className="field__label" htmlFor="new_email">Email address</label>
            <input
              id="new_email"
              className="input"
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={(event) => set('email')(event.target.value)}
              disabled={busy}
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="new_password">Temporary password</label>
            <PasswordField id="new_password" value={values.password} onChange={set('password')} disabled={busy} />
            <span className="field__hint">Copy it now - you will not be able to see it again.</span>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="new_role">Role</label>
            <select
              id="new_role"
              className="select"
              value={values.role}
              onChange={(event) => set('role')(event.target.value)}
              disabled={busy}
            >
              <option value="user">User - works with assets</option>
              <option value="admin">Admin - can also manage accounts</option>
            </select>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ account, onClose, onDone }) {
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      return setError(`The password must be at least ${MIN_PASSWORD} characters.`);
    }
    setBusy(true);
    setError(null);
    try {
      await admin('reset_password', { user_id: account.id, password });
      onDone();
    } catch (caught) {
      setError(caught.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Reset password for ${account.email}`}
      description="Their old password stops working immediately."
      onClose={busy ? () => {} : onClose}
      size="sm"
    >
      <form onSubmit={submit} noValidate>
        <div className="modal__body form-grid form-grid--single">
          <div className="field">
            <label className="field__label" htmlFor="reset_password">New password</label>
            <PasswordField id="reset_password" value={password} onChange={setPassword} disabled={busy} />
            <span className="field__hint">Copy it now and pass it on - it is not shown again.</span>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Set password'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

/**
 * Admin only: who can sign in, and who can manage everyone else. Accounts
 * live in Supabase Auth; this page drives them through the admin-users Edge
 * Function, which re-checks that the caller is an admin every time.
 */
export default function AdminPage({ onToast, specMemory = {}, onMergeModels }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [savingRole, setSavingRole] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await admin('list');
      setAccounts(users ?? []);
      setError(null);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (account, role) => {
    setSavingRole(account.id);
    try {
      await admin('set_role', { user_id: account.id, role });
      setAccounts((current) => current.map((item) => (item.id === account.id ? { ...item, role } : item)));
      onToast({ tone: 'success', message: `${account.email} is now ${role === 'admin' ? 'an admin' : 'a user'}.` });
    } catch (caught) {
      onToast({ tone: 'error', message: caught.message });
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <>
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Accounts</h2>
          <p className="card__subtitle">
            Everyone who can sign in. Users work with assets; admins can also add and remove accounts.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
          + Add account
        </button>
      </div>

      {error ? (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn--small" onClick={load}>Retry</button>
        </div>
      ) : loading ? (
        <p className="empty-state">Loading accounts…</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col" className="col-hide-sm">Added</th>
                <th scope="col" className="col-hide-sm">Last signed in</th>
                <th scope="col" className="table__actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="cell-strong">
                    {account.email}
                    {account.is_you ? <span className="pill pill--inline">You</span> : null}
                  </td>
                  <td>
                    <label className="sr-only" htmlFor={`role-${account.id}`}>Role for {account.email}</label>
                    <select
                      id={`role-${account.id}`}
                      className="select select--compact"
                      value={account.role}
                      onChange={(event) => changeRole(account, event.target.value)}
                      disabled={savingRole === account.id}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="col-hide-sm">{formatTimestamp(account.created_at)}</td>
                  <td className="col-hide-sm">
                    {account.last_sign_in_at ? formatTimestamp(account.last_sign_in_at) : <span className="cell-muted">Never</span>}
                  </td>
                  <td className="table__actions">
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => setResetting(account)}>
                      Reset password
                    </button>{' '}
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--small"
                      onClick={() => setRemoving(account)}
                      disabled={account.is_you}
                      title={account.is_you ? 'You cannot remove your own account' : undefined}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding ? (
        <AddAccountModal
          onClose={() => setAdding(false)}
          onCreated={(values) => {
            setAdding(false);
            onToast({ tone: 'success', message: `Account created for ${values.email.trim()}.` });
            load();
          }}
        />
      ) : null}

      {resetting ? (
        <ResetPasswordModal
          account={resetting}
          onClose={() => setResetting(null)}
          onDone={() => {
            onToast({ tone: 'success', message: `New password set for ${resetting.email}.` });
            setResetting(null);
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="Remove account"
          message={`Remove ${removing.email}? They will no longer be able to sign in. Assets and history they recorded are kept.`}
          confirmLabel="Remove account"
          onConfirm={async () => {
            await admin('remove', { user_id: removing.id });
            onToast({ tone: 'success', message: `${removing.email} removed.` });
            setRemoving(null);
            load();
          }}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </section>

    {onMergeModels ? (
      <ModelNameTidy specMemory={specMemory} onMerge={onMergeModels} onToast={onToast} />
    ) : null}
    </>
  );
}
