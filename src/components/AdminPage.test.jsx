import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPage, { generatePassword } from './AdminPage';

const writes = [];
const functionCalls = [];
let people;
let requests;
let nextError = null;

// A small stand-in for the Supabase client: just the calls the page makes.
function query(table) {
  const state = { table, action: 'select', filters: {} };
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: (column, value) => {
      state.filters[column] = value;
      return builder;
    },
    insert: (row) => Object.assign(state, { action: 'insert', row }) && builder,
    update: (row) => Object.assign(state, { action: 'update', row }) && builder,
    delete: () => Object.assign(state, { action: 'delete' }) && builder,
    then: (resolve) => {
      if (state.action !== 'select') writes.push({ ...state });
      if (nextError) {
        const error = nextError;
        nextError = null;
        return resolve({ data: null, error });
      }
      if (table === 'access_requests' && state.action === 'select') return resolve({ data: requests, error: null });
      return resolve({ data: [{ email: state.row?.email ?? state.filters.email }], error: null });
    }
  };
  return builder;
}

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: people, error: null })),
    from: (table) => query(table)
  }
}));

vi.mock('../lib/edgeFunctions', () => ({
  callFunction: vi.fn(async (name, body) => {
    functionCalls.push(body);
    return { created: true };
  })
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userEmail: 'boss@adaro.net' })
}));

beforeEach(() => {
  writes.length = 0;
  functionCalls.length = 0;
  nextError = null;
  requests = [];
  people = [
    { email: 'boss@adaro.net', full_name: 'Big Boss', department: 'Exec', access: 'admin', active: true },
    { email: 'tech@adaro.net', full_name: null, department: 'Technical Support', access: 'editor', active: true },
    { email: 'cs@adaro.net', full_name: 'Casey', department: 'Customer Service', access: 'viewer', active: false }
  ];
});

describe('AdminPage', () => {
  it('lists people with their department and access, and will not let you remove yourself', async () => {
    render(<AdminPage onToast={() => {}} />);
    const mine = (await screen.findByText('Big Boss')).closest('tr');
    expect(within(mine).getByText('You')).toBeInTheDocument();
    expect(within(mine).getByRole('button', { name: 'Remove' })).toBeDisabled();
    expect(within(mine).getByText('Admin')).toBeInTheDocument();

    const tech = screen.getByText('tech@adaro.net').closest('tr');
    // No name recorded: one is worked out from the email.
    expect(within(tech).getByText('Tech')).toBeInTheDocument();
    expect(within(tech).getByText('Can edit')).toBeInTheDocument();

    expect(within(screen.getByText('Casey').closest('tr')).getByText('Switched off')).toBeInTheDocument();
  });

  it('gives a company address access, with the level suggested by department', async () => {
    const user = userEvent.setup();
    const onToast = vi.fn();
    render(<AdminPage onToast={onToast} />);
    await screen.findByText('Big Boss');
    await user.click(screen.getByRole('button', { name: /give someone access/i }));
    await user.type(screen.getByLabelText(/work email/i), 'New.Tech@adaro.net');
    await user.selectOptions(screen.getByLabelText(/department/i), 'Technical Support');
    expect(screen.getByLabelText(/what they can do/i)).toHaveValue('editor');
    await user.click(screen.getByRole('button', { name: /^give access$/i }));

    expect(writes).toContainEqual(
      expect.objectContaining({
        table: 'members',
        action: 'insert',
        row: expect.objectContaining({ email: 'new.tech@adaro.net', department: 'Technical Support', access: 'editor' })
      })
    );
    expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'success' }));
  });

  it('refuses addresses outside the company, and people already listed', async () => {
    const user = userEvent.setup();
    render(<AdminPage onToast={() => {}} />);
    await screen.findByText('Big Boss');
    await user.click(screen.getByRole('button', { name: /give someone access/i }));
    await user.type(screen.getByLabelText(/work email/i), 'someone@gmail.com');
    await user.selectOptions(screen.getByLabelText(/department/i), 'Finance');
    await user.click(screen.getByRole('button', { name: /^give access$/i }));
    expect(screen.getByText(/only company addresses/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/work email/i));
    await user.type(screen.getByLabelText(/work email/i), 'tech@adaro.net');
    await user.click(screen.getByRole('button', { name: /^give access$/i }));
    expect(screen.getByText(/already has access/i)).toBeInTheDocument();
    expect(writes).toEqual([]);
  });

  it('will not let you change your own access', async () => {
    const user = userEvent.setup();
    render(<AdminPage onToast={() => {}} />);
    const mine = (await screen.findByText('Big Boss')).closest('tr');
    await user.click(within(mine).getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText(/what they can do/i)).toBeDisabled();
    expect(screen.getByText(/cannot change your own access/i)).toBeInTheDocument();
  });

  it('shows the database reason when a change is refused', async () => {
    const user = userEvent.setup();
    render(<AdminPage onToast={() => {}} />);
    const tech = (await screen.findByText('tech@adaro.net')).closest('tr');
    await user.click(within(tech).getByRole('button', { name: 'Edit' }));
    nextError = { code: 'P0001', message: 'Orbit must always have at least one admin. Make someone else an admin first.' };
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least one admin/i);
  });

  it('lets an admin in someone who asked', async () => {
    requests = [{ email: 'new.starter@adaro.net', full_name: 'New Starter', requested_at: '2026-10-06T09:00:00Z' }];
    const user = userEvent.setup();
    render(<AdminPage onToast={() => {}} />);
    await screen.findByText(/waiting for access/i);
    await user.click(screen.getByRole('button', { name: /let in/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('new.starter@adaro.net');
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('New Starter');
  });

  it('sets a password through the admin function, with a Copy button', async () => {
    const user = userEvent.setup();
    render(<AdminPage onToast={() => {}} />);
    const tech = (await screen.findByText('tech@adaro.net')).closest('tr');
    await user.click(within(tech).getByRole('button', { name: /password/i }));
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(functionCalls[0]).toMatchObject({ action: 'set_password', email: 'tech@adaro.net' });
    expect(functionCalls[0].password).toHaveLength(12);
  });
});

describe('generatePassword', () => {
  it('avoids characters that are easy to misread', () => {
    const password = generatePassword(200);
    expect(password).toHaveLength(200);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});
