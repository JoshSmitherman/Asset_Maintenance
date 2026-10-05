import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPage, { generatePassword } from './AdminPage';

const calls = [];
let accounts;

vi.mock('../lib/edgeFunctions', () => ({
  callFunction: vi.fn(async (name, body) => {
    calls.push(body);
    if (body.action === 'list') return { users: accounts };
    if (body.action === 'set_role' && body.role === 'user') {
      throw new Error('There must always be at least one admin.');
    }
    return { ok: true };
  })
}));

beforeEach(() => {
  calls.length = 0;
  accounts = [
    { id: 'a', email: 'boss@example.com', role: 'admin', created_at: '2026-01-01T00:00:00Z', is_you: true },
    { id: 'b', email: 'tech@example.com', role: 'user', created_at: '2026-02-01T00:00:00Z', is_you: false }
  ];
});

describe('AdminPage', () => {
  it('lists accounts, marks yours, and will not let you remove yourself', async () => {
    render(<AdminPage onToast={() => {}} />);
    const mine = (await screen.findByText('boss@example.com')).closest('tr');
    expect(within(mine).getByText('You')).toBeInTheDocument();
    expect(within(mine).getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('creates an account with a generated temporary password', async () => {
    const user = userEvent.setup();
    const onToast = vi.fn();
    render(<AdminPage onToast={onToast} />);
    await screen.findByText('tech@example.com');
    await user.click(screen.getByRole('button', { name: /add account/i }));
    await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
    await user.selectOptions(screen.getByLabelText(/^role$/i), 'admin');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    const create = calls.find((call) => call.action === 'create');
    expect(create).toMatchObject({ email: 'new@example.com', role: 'admin' });
    expect(create.password).toHaveLength(12);
    expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'success' }));
  });

  it('shows the reason when a role change is refused', async () => {
    const user = userEvent.setup();
    const onToast = vi.fn();
    render(<AdminPage onToast={onToast} />);
    await screen.findByText('boss@example.com');
    await user.selectOptions(screen.getByLabelText(/role for boss@example.com/i), 'user');
    expect(onToast).toHaveBeenCalledWith({ tone: 'error', message: 'There must always be at least one admin.' });
    expect(screen.getByLabelText(/role for boss@example.com/i)).toHaveValue('admin');
  });
});

describe('generatePassword', () => {
  it('avoids characters that are easy to misread', () => {
    const password = generatePassword(200);
    expect(password).toHaveLength(200);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});
