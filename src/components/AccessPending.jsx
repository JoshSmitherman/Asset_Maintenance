import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import { describeDatabaseError } from '../lib/errors';

/**
 * Signed in with a company account, but not (or no longer) on the members
 * list: nothing in Orbit is visible yet. One click asks the admins, who see
 * the request on their Admin page.
 */
export default function AccessPending() {
  const { userEmail, userName, membership, requestAccess, refreshMembership, signOut } = useAuth();
  const [name, setName] = useState(userName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const requested = membership.requested;

  const ask = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestAccess(name.trim());
    } catch (caught) {
      setError(describeDatabaseError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <BrandLogo className="login__logo" />
          <div>
            <h1 className="login__title">
              {membership.inactive ? 'Your access has been switched off' : requested ? 'Access requested' : 'You need access to Orbit'}
            </h1>
            <p className="login__subtitle">Signed in as {userEmail}</p>
          </div>
        </div>

        {membership.inactive ? (
          <p>An admin has switched off your access. If you need it back, speak to Technical Support.</p>
        ) : requested ? (
          <>
            <p>
              Thanks - the admins have your request. Once one of them lets you in, this page will open
              Orbit. You can close it and come back later.
            </p>
            <button type="button" className="btn btn--primary btn--block" onClick={refreshMembership}>
              Check again
            </button>
          </>
        ) : (
          <form className="field-stack" onSubmit={ask} noValidate>
            <p>
              Orbit is Adaro&apos;s IT asset register. Ask for access and an admin will choose your
              department and what you can do.
            </p>
            <div className="field">
              <label className="field__label" htmlFor="request_name">Your name</label>
              <input
                id="request_name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                disabled={busy}
              />
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Sending…' : 'Ask for access'}
            </button>
          </form>
        )}

        <button type="button" className="link-button login__alt" onClick={() => signOut().catch(() => {})}>
          Sign out, or use a different account
        </button>
      </div>
    </div>
  );
}
