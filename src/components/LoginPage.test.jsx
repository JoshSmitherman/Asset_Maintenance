import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage, { describeSignInError } from './LoginPage';

const signIn = vi.fn();
const signInWithMicrosoft = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ signIn, signInWithMicrosoft })
}));
let methods = null;
vi.mock('../lib/supabaseClient', () => ({ fetchSignInMethods: async () => methods }));

beforeEach(() => {
  methods = null;
  signIn.mockReset();
  signInWithMicrosoft.mockReset();
  window.history.replaceState(null, '', '/');
});

const openPasswordForm = async (user) => {
  await user.click(await screen.findByRole('button', { name: /email and password instead/i }));
};

describe('LoginPage', () => {
  it('leads with Microsoft sign-in', async () => {
    signInWithMicrosoft.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /sign in with microsoft/i }));
    expect(signInWithMicrosoft).toHaveBeenCalled();
  });

  it('explains when Microsoft sign-in is not switched on yet', async () => {
    signInWithMicrosoft.mockRejectedValue(new Error('Unsupported provider: provider is not enabled'));
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(await screen.findByRole('button', { name: /sign in with microsoft/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not been switched on yet/i);
  });

  it('turns away a non-company account coming back from Microsoft', () => {
    window.history.replaceState(null, '', '/?error=server_error&error_description=Database+error+saving+new+user');
    render(<LoginPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/only for adaro accounts/i);
    // Cleared, so a reload does not show it again.
    expect(window.location.search).toBe('');
  });

  it('does not attempt sign-in with empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await openPasswordForm(user);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your email address and password/i);
  });

  it('calls signIn with the email and the raw password', async () => {
    signIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    await openPasswordForm(user);
    await user.type(screen.getByLabelText(/email address/i), 'tech@adaro.net');
    await user.type(screen.getByLabelText(/^password$/i), 'sup3rsecret');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(signIn).toHaveBeenCalledWith('tech@adaro.net', 'sup3rsecret');
  });

  it('maps an invalid-login error to a friendly message', async () => {
    signIn.mockRejectedValue(new Error('Invalid login credentials'));
    const user = userEvent.setup();
    render(<LoginPage />);
    await openPasswordForm(user);
    await user.type(screen.getByLabelText(/email address/i), 'tech@adaro.net');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i);
  });

  it('never shows internal error text', () => {
    expect(describeSignInError('fetch failed: ETIMEDOUT 10.0.0.1:5432')).not.toMatch(/10\.0\.0\.1|ETIMEDOUT/);
    expect(describeSignInError('something odd')).toMatch(/could not sign you in/i);
  });

  it('can show the password while typing it', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await openPasswordForm(user);
    const field = screen.getByLabelText(/^password$/i);
    expect(field).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show/i }));
    expect(field).toHaveAttribute('type', 'text');
  });

  it('opens straight on the password form while Microsoft is not switched on', async () => {
    methods = { microsoft: false, password: true };
    render(<LoginPage />);
    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in with microsoft/i })).not.toBeInTheDocument();
  });

  it('leads with Microsoft once it is switched on', async () => {
    methods = { microsoft: true, password: true };
    render(<LoginPage />);
    expect(await screen.findByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });
});
