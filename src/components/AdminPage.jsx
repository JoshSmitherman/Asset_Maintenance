import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import ModelNameTidy from './ModelNameTidy';
import { supabase } from '../lib/supabaseClient';
import { callFunction } from '../lib/edgeFunctions';
import { formatTimestamp } from '../lib/dates';
import { describeDatabaseError } from '../lib/errors';
import { useAuth } from '../context/AuthContext';
import {
  ACCESS_LEVELS,
  accessLabel,
  COMPANY_DOMAINS,
  defaultAccessFor,
  DEPARTMENTS,
  displayName,
  isCompanyEmail
} from '../lib/access';

const MIN_PASSWORD = 8;
// No 0/O, 1/l/I: these get read out over the phone.
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generatePassword(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join('');
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Who has access, and who is asking for it. */
function usePeople() {
  const [state, setState] = useState({ people: [], requests: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const [people, requests] = await Promise.all([
      supabase.rpc('member_directory'),
      supabase.from('access_requests').select('email, full_name, requested_at').order('requested_at')
    ]);
    const failure = people.error || requests.error;
    setState({
      people: people.data ?? [],
      requests: requests.data ?? [],
      loading: false,
      error: failure ? describeDatabaseError(failure) : null
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--ghost btn--small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      disabled={!text}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function AccessChoice({ id, value, onChange, disabled, lockedReason }) {
  const chosen = ACCESS_LEVELS.find((level) => level.value === value);
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>What they can do</label>
      <select
        id={id}
        className="select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || Boolean(lockedReason)}
        aria-describedby={`${id}_hint`}
      >
        {ACCESS_LEVELS.map((level) => (
          <option key={level.value} value={level.value}>{level.label}</option>
        ))}
      </select>
      <span className="field__hint" id={`${id}_hint`}>{lockedReason ?? chosen?.description}</span>
    </div>
  );
}

/** Adding someone, or changing what an existing person can do. */
function PersonModal({ person, prefill, existingEmails, isSelf, onClose, onSaved }) {
  const editing = Boolean(person);
  const [values, setValues] = useState(() => ({
    email: person?.email ?? prefill?.email ?? '',
    full_name: person?.full_name ?? prefill?.full_name ?? '',
    department: person?.department ?? '',
    access: person?.access ?? 'viewer',
    active: person?.active ?? true
  }));
  // Until someone picks a level by hand, it follows the department.
  const [accessTouched, setAccessTouched] = useState(editing);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field, value) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'department' && !accessTouched) next.access = defaultAccessFor(value);
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    const email = values.email.trim().toLowerCase();
    if (!editing) {
      if (!email) next.email = 'Enter their work email address.';
      else if (!EMAIL.test(email)) next.email = 'That is not an email address.';
      else if (!isCompanyEmail(email)) {
        next.email = `Only company addresses (${COMPANY_DOMAINS.map((d) => `@${d}`).join(', ')}) can be given access.`;
      } else if (existingEmails.includes(email)) next.email = 'This person already has access.';
    }
    if (values.full_name.trim().length > 80) next.full_name = 'Keep the name to 80 characters.';
    if (!DEPARTMENTS.includes(values.department)) next.department = 'Choose their department.';
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(`person_${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    const row = {
      full_name: values.full_name.trim() || null,
      department: values.department,
      access: values.access,
      active: values.active
    };
    const request = editing
      ? supabase.from('members').update(row).eq('email', person.email).select('email')
      : supabase.from('members').insert({ ...row, email: values.email.trim().toLowerCase() }).select('email');
    const { data, error } = await request;
    if (error || !data?.length) {
      setSubmitError(error ? describeDatabaseError(error) : 'Nothing was saved. Reload the page and try again.');
      setBusy(false);
      return;
    }
    onSaved(values);
  };

  return (
    <Modal
      title={editing ? `Edit ${displayName(person)}` : 'Give someone access'}
      description={
        editing
          ? person.email
          : 'They sign in with their Microsoft work account. Nothing is sent to them - let them know it is ready.'
      }
      onClose={busy ? () => {} : onClose}
      size="sm"
    >
      <form onSubmit={submit} noValidate>
        <div className="modal__body form-grid form-grid--single">
          {editing ? null : (
            <div className="field">
              <label className="field__label" htmlFor="person_email">Work email *</label>
              <input
                id="person_email"
                className={`input${errors.email ? ' input--error' : ''}`}
                type="email"
                autoComplete="off"
                placeholder={`name@${COMPANY_DOMAINS[0]}`}
                value={values.email}
                onChange={(event) => set('email', event.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'person_email_error' : undefined}
                disabled={busy}
                autoFocus
              />
              {errors.email ? <span className="field__error" id="person_email_error">{errors.email}</span> : null}
            </div>
          )}
          <div className="field">
            <label className="field__label" htmlFor="person_full_name">Name</label>
            <input
              id="person_full_name"
              className={`input${errors.full_name ? ' input--error' : ''}`}
              placeholder="Shown on cleans and repairs they record"
              value={values.full_name}
              onChange={(event) => set('full_name', event.target.value)}
              maxLength={80}
              disabled={busy}
            />
            {errors.full_name ? <span className="field__error">{errors.full_name}</span> : null}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="person_department">Department *</label>
            <select
              id="person_department"
              className={`select${errors.department ? ' input--error' : ''}`}
              value={values.department}
              onChange={(event) => set('department', event.target.value)}
              aria-invalid={errors.department ? true : undefined}
              disabled={busy}
            >
              <option value="">— Choose —</option>
              {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            {errors.department ? <span className="field__error">{errors.department}</span> : null}
          </div>
          <AccessChoice
            id="person_access"
            value={values.access}
            onChange={(access) => {
              setAccessTouched(true);
              set('access', access);
            }}
            disabled={busy}
            lockedReason={isSelf ? 'You cannot change your own access. Ask another admin.' : null}
          />
          {editing && !isSelf ? (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={values.active}
                onChange={(event) => set('active', event.target.checked)}
                disabled={busy}
              />
              <span>
                <strong>Access switched on</strong>
                <span className="field__hint"> Untick to stop them using Orbit straight away, without forgetting them.</span>
              </span>
            </label>
          ) : null}
          {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
        </div>
        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Give access'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

/** For the few who cannot use Microsoft sign-in: an Orbit password. */
function PasswordModal({ person, onClose, onDone }) {
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`The password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await callFunction('admin-users', { action: 'set_password', email: person.email, password });
      onDone(result?.created);
    } catch (caught) {
      setError(caught.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Password for ${displayName(person)}`}
      description="Only for someone who cannot sign in with Microsoft. Any old password stops working, and they are signed out everywhere."
      onClose={busy ? () => {} : onClose}
      size="sm"
    >
      <form onSubmit={submit} noValidate>
        <div className="modal__body form-grid form-grid--single">
          <div className="field">
            <label className="field__label" htmlFor="set_password">New password</label>
            <div className="password-field">
              <input
                id="set_password"
                className="input"
                type="text"
                autoComplete="new-password"
                spellCheck={false}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
              <CopyButton text={password} />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setPassword(generatePassword())}
                disabled={busy}
              >
                New
              </button>
            </div>
            <span className="field__hint">Copy it now and give it to them in person - it is not shown again.</span>
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
 * Admin only: who can use Orbit, their department, and what they can do.
 * People sign in with Microsoft; an admin decides whether they get in.
 */
export default function AdminPage({ onToast, specMemory = {}, onMergeModels }) {
  const { userEmail } = useAuth();
  const me = userEmail.toLowerCase();
  const { people, requests, loading, error, reload } = usePeople();
  const [editing, setEditing] = useState(null); // { person } | { prefill } | null
  const [passwordFor, setPasswordFor] = useState(null);
  const [removing, setRemoving] = useState(null);

  const dismissRequest = async (request) => {
    const { error: deleteError } = await supabase.from('access_requests').delete().eq('email', request.email);
    if (deleteError) onToast({ tone: 'error', message: describeDatabaseError(deleteError) });
    else onToast({ tone: 'success', message: `Request from ${request.email} dismissed.` });
    reload();
  };

  const counts = ACCESS_LEVELS.map((level) => ({
    ...level,
    count: people.filter((person) => person.active && person.access === level.value).length
  }));

  return (
    <>
      {requests.length > 0 ? (
        <section className="card card--attention" aria-labelledby="requests-title">
          <div className="card__header">
            <div>
              <h2 className="card__title" id="requests-title">
                Waiting for access <span className="pill pill--overdue">{requests.length}</span>
              </h2>
              <p className="card__subtitle">Signed in with a company account and asked to use Orbit.</p>
            </div>
          </div>
          <ul className="request-list">
            {requests.map((request) => (
              <li key={request.email} className="request-list__item">
                <div>
                  <strong>{request.full_name || displayName({ email: request.email })}</strong>
                  <span className="cell-muted"> {request.email} · asked {formatTimestamp(request.requested_at)}</span>
                </div>
                <div className="request-list__actions">
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => dismissRequest(request)}>
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => setEditing({ prefill: request })}
                  >
                    Let in…
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">People &amp; access</h2>
            <p className="card__subtitle">
              Only people listed here can use Orbit, and only with company accounts.{' '}
              {counts.map((level) => `${level.count} ${level.label.toLowerCase()}`).join(' · ')}
            </p>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => setEditing({})}>
            + Give someone access
          </button>
        </div>

        {error ? (
          <div className="alert alert--error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn--small" onClick={reload}>Retry</button>
          </div>
        ) : loading && people.length === 0 ? (
          <p className="empty-state" role="status">Loading people…</p>
        ) : (
          <div className="table-scroll">
            <table className="table table--people">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Department</th>
                  <th scope="col">Access</th>
                  <th scope="col" className="col-hide-sm">Last signed in</th>
                  <th scope="col" className="table__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => {
                  const isSelf = person.email === me;
                  return (
                    <tr key={person.email} className={person.active ? undefined : 'row--inactive'}>
                      <td>
                        <span className="cell-strong">{displayName(person)}</span>
                        {isSelf ? <span className="pill pill--inline">You</span> : null}
                        <span className="cell-sub">{person.email}</span>
                      </td>
                      <td>{person.department}</td>
                      <td>
                        {person.active ? (
                          <span className={`access-badge access-badge--${person.access}`}>{accessLabel(person.access)}</span>
                        ) : (
                          <span className="access-badge access-badge--off">Switched off</span>
                        )}
                      </td>
                      <td className="col-hide-sm">
                        {person.last_sign_in_at ? (
                          formatTimestamp(person.last_sign_in_at)
                        ) : (
                          <span className="cell-muted">Not yet</span>
                        )}
                      </td>
                      <td className="table__actions">
                        <div className="table__action-group">
                          <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing({ person })}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => setPasswordFor(person)}
                            title="Only for someone who cannot sign in with Microsoft"
                          >
                            Password…
                          </button>
                          <button
                            type="button"
                            className="btn btn--danger-ghost btn--small"
                            onClick={() => setRemoving(person)}
                            disabled={isSelf}
                            title={isSelf ? 'You cannot remove yourself' : undefined}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing ? (
        <PersonModal
          person={editing.person}
          prefill={editing.prefill}
          existingEmails={people.map((person) => person.email)}
          isSelf={editing.person?.email === me}
          onClose={() => setEditing(null)}
          onSaved={(values) => {
            const who = values.full_name.trim() || values.email || editing.person?.email;
            onToast({
              tone: 'success',
              message: editing.person
                ? `${who} updated.`
                : `${who} can now sign in with Microsoft (${accessLabel(values.access).toLowerCase()}).`
            });
            setEditing(null);
            reload();
          }}
        />
      ) : null}

      {passwordFor ? (
        <PasswordModal
          person={passwordFor}
          onClose={() => setPasswordFor(null)}
          onDone={(created) => {
            onToast({
              tone: 'success',
              message: created
                ? `Password sign-in created for ${displayName(passwordFor)}.`
                : `New password set for ${displayName(passwordFor)}. They have been signed out everywhere.`
            });
            setPasswordFor(null);
            reload();
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title={`Remove ${displayName(removing)}`}
          message={`${removing.email} will no longer be able to use Orbit, from now. Assets, cleans and repairs they recorded are kept. To stop them for a while instead, use Edit and switch their access off.`}
          confirmLabel="Remove access"
          onConfirm={async () => {
            // Their sign-in account goes first (the function only acts for
            // people still on the list). Best effort: once they are off the
            // list, a sign-in opens nothing anyway. What they recorded stays.
            await callFunction('admin-users', { action: 'remove_login', email: removing.email }).catch(() => {});
            const { error: deleteError } = await supabase.from('members').delete().eq('email', removing.email);
            if (deleteError) throw new Error(describeDatabaseError(deleteError));
            onToast({ tone: 'success', message: `${displayName(removing)} no longer has access.` });
            setRemoving(null);
            reload();
          }}
          onCancel={() => setRemoving(null)}
        />
      ) : null}

      {onMergeModels ? (
        <ModelNameTidy specMemory={specMemory} onMerge={onMergeModels} onToast={onToast} />
      ) : null}
    </>
  );
}
