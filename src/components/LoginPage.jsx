import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

/**
 * Why a Microsoft sign-in bounced back, from the error Supabase puts in the
 * address. Read once, then cleared so a reload does not show it again.
 */
function takeRedirectError() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const description = url.searchParams.get('error_description') || hash.get('error_description');
  const code = url.searchParams.get('error') || hash.get('error');
  if (!description && !code) return null;

  for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  return describeSignInError(description || code);
}

export function describeSignInError(message) {
  const text = String(message ?? '').toLowerCase();
  if (text.includes('company accounts') || text.includes('database error saving new user')) {
    return 'Orbit is only for Adaro accounts. Sign in with your work Microsoft account (you@adaro.net).';
  }
  if (text.includes('provider is not enabled') || text.includes('unsupported provider')) {
    return 'Microsoft sign-in has not been switched on yet. Use your email and password for now, or ask IT.';
  }
  if (text.includes('access_denied') || text.includes('cancel')) {
    return 'Microsoft sign-in was cancelled. Try again when you are ready.';
  }
  if (text.includes('invalid login') || text.includes('invalid credentials')) {
    return 'That email and password do not match. Check them, or sign in with Microsoft.';
  }
  if (text.includes('email not confirmed')) {
    return 'This sign-in has not been confirmed. Ask an admin to set your password again.';
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'Cannot reach the sign-in service. Check your internet connection.';
  }
  return 'Could not sign you in. Please try again, and tell IT if it keeps happening.';
}

export default function LoginPage() {
  const { signIn, signInWithMicrosoft } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => takeRedirectError());
  const [busy, setBusy] = useState(null); // 'microsoft' | 'password' | null
  // Most people sign in with Microsoft; email and password is the fallback.
  const [showPassword, setShowPassword] = useState(false);
  const [revealPassword, setRevealPassword] = useState(false);

  const handleMicrosoft = async () => {
    setError(null);
    setBusy('microsoft');
    try {
      await signInWithMicrosoft();
      // The browser is now leaving for Microsoft; nothing more to do here.
    } catch (caught) {
      setError(describeSignInError(caught?.message));
      setBusy(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter a full email address, like you@adaro.net.');
      return;
    }

    setBusy('password');
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(describeSignInError(caught?.message));
      setBusy(null);
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <BrandLogo className="login__logo" />
          <div>
            <h1 className="login__title">Orbit</h1>
            <p className="login__subtitle">Adaro IT asset management</p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn--microsoft btn--block"
          onClick={handleMicrosoft}
          disabled={Boolean(busy)}
        >
          <svg className="btn__icon" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          {busy === 'microsoft' ? 'Opening Microsoft…' : 'Sign in with Microsoft'}
        </button>
        <p className="login__hint">Use your Adaro work account.</p>

        {error ? <p className="form-error" role="alert">{error}</p> : null}

        {showPassword ? (
          <form className="login__password" onSubmit={handleSubmit} noValidate>
            <div className="login__divider" role="separator"><span>or with a password</span></div>
            <div className="field">
              <label className="field__label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={Boolean(busy)}
                autoFocus
                required
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  className="input"
                  type={revealPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={Boolean(busy)}
                  required
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => setRevealPassword((shown) => !shown)}
                  aria-pressed={revealPassword}
                  aria-controls="password"
                >
                  {revealPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={Boolean(busy)}>
              {busy === 'password' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <button type="button" className="link-button login__alt" onClick={() => setShowPassword(true)}>
            Sign in with an email and password instead
          </button>
        )}

        <p className="login__hint">
          New to Orbit? Sign in with Microsoft and ask for access - an admin will let you in.
        </p>
      </div>
    </div>
  );
}
