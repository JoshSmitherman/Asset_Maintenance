import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppShell from './AppShell';
import { STATUS } from '../lib/constants';

const asset = {
  id: 'a1',
  asset_ref: 'AST-0041',
  device_type: 'Laptop',
  owner_name: 'Bruce Baldomero',
  department: 'Engineering',
  location: 'Hybrid',
  purchase_date: '2023-05-22',
  purchase_cost: 1249,
  date_cleaned: '2026-02-14',
  cleaned_by: 'Josh Smitherman',
  cleaning_interval_months: 6,
  next_clean_due: '2026-08-14',
  daysUntilDue: -31,
  notes: null,
  status: STATUS.OVERDUE,
  version: 3,
  updated_at: '2026-09-14T16:50:00Z',
  updated_by_email: 'josh.smitherman@adaro.net'
};

const hook = {
  assets: [asset],
  loading: false,
  error: null,
  lastSyncedAt: null,
  refresh: vi.fn(),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
  recordClean: vi.fn(),
  deleteAsset: vi.fn(),
  assetRefExists: () => false
};

vi.mock('../hooks/useAssets', () => ({ useAssets: () => hook }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'josh.smitherman@adaro.net' }, signOut: vi.fn() })
}));

async function openDetails(user) {
  await user.click(screen.getByRole('button', { name: 'Assets' }));
  await user.click(screen.getByRole('button', { name: /view details for AST-0041/i }));
}

describe('AppShell details view', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hands the user back to the details when an edit is cancelled', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await openDetails(user);
    expect(screen.getByText('Purchase cost')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit details/i }));
    expect(screen.queryByText('Purchase cost')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByText('Purchase cost')).toBeInTheDocument();
  });

  it('hands the user back to the details when a delete is cancelled', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await openDetails(user);
    await user.click(screen.getByRole('button', { name: /delete asset/i }));
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
    expect(screen.getByText('Purchase cost')).toBeInTheDocument();
  });

  it('closes out completely when the details view itself is closed', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await openDetails(user);
    // The header's x and the footer's button share the name; take the footer.
    const closes = screen.getAllByRole('button', { name: /^close$/i });
    await user.click(closes[closes.length - 1]);
    expect(screen.queryByText('Purchase cost')).not.toBeInTheDocument();
  });

  it('leaves Add asset alone - it has no details view to go back to', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByRole('button', { name: 'Assets' }));
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Purchase cost')).not.toBeInTheDocument();
  });
});
