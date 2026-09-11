import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setBusy(true);
    try {
      await signIn(email, password);
    } catch (caught) {
      const message = caught?.message ?? '';
      setError(
        message.toLowerCase().includes('invalid login')
          ? 'Incorrect email or password.'
          : message || 'Could not sign in. Please try again.'
      );
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__brand">
          <span className="login__mark" aria-hidden="true">IT</span>
          <div>
            <h1 className="login__title">Hardware Maintenance Tracker</h1>
            <p className="login__subtitle">Internal IT support team</p>
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="email">Email address</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            required
          />
        </div>

        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login__hint">
          Accounts are created by an administrator in the Supabase dashboard
          (Authentication → Users). There is no self-service sign-up.
        </p>
      </form>
    </div>
  );
}
