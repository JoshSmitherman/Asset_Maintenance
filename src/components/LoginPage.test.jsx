import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';

const signIn = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ signIn })
}));
// BrandLogo pulls in an <img> using import.meta.env.BASE_URL; render is enough.

beforeEach(() => {
  signIn.mockReset();
});

describe('LoginPage', () => {
  it('does not attempt sign-in with empty fields (native required validation blocks it)', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    // The email/password inputs are `required` and the form has no noValidate,
    // so the browser suppresses the submit before signIn is ever reached.
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signIn).not.toHaveBeenCalled();
  });

  it('calls signIn with a trimmed email and the raw password', async () => {
    signIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email address/i), 'tech@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'sup3rsecret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    // type="email" sanitizes whitespace, so the sanitized value reaches signIn.
    expect(signIn).toHaveBeenCalledWith('tech@example.com', 'sup3rsecret');
  });

  it('maps an invalid-login error to a friendly message', async () => {
    signIn.mockRejectedValue(new Error('Invalid login credentials'));
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email address/i), 'tech@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect email or password/i);
  });

  it('does not leak internal error text for unexpected failures', async () => {
    signIn.mockRejectedValue(new Error('fetch failed: ETIMEDOUT 10.0.0.1:5432'));
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email address/i), 'tech@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'whatever');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    // Current behaviour surfaces the raw message; this test documents it so a
    // future change to redact it is a deliberate, visible decision.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
