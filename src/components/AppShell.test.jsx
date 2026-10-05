import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

const many = Array.from({ length: 7 }, (_, index) => ({
  ...asset,
  id: `bulk-${index}`,
  asset_ref: `AST-10${index}`,
  owner_name: index === 6 ? null : `Person ${index}`
}));

const hook = {
  assets: [asset],
  loading: false,
  error: null,
  lastSyncedAt: null,
  refresh: vi.fn(),
  createAsset: vi.fn(),
  createAssets: vi.fn(),
  updateAsset: vi.fn(),
  recordClean: vi.fn(),
  bulkAssign: vi.fn().mockResolvedValue(2),
  bulkRecordClean: vi.fn().mockResolvedValue(2),
  bulkDelete: vi.fn().mockResolvedValue(2),
  deleteAsset: vi.fn(),
  assetRefExists: () => false
};

vi.mock('../hooks/useAssets', () => ({ useAssets: () => hook }));
vi.mock('../hooks/useCleaningLog', () => ({
  useCleaningLog: () => ({
    entries: [
      { id: 'c1', asset_ref: 'AST-0041', cleaned_on: '2026-09-02', cleaned_by: 'JS' },
      { id: 'c2', asset_ref: 'AST-0041', cleaned_on: '2026-03-02', cleaned_by: 'AL' }
    ],
    loading: false,
    error: null,
    refresh: vi.fn()
  })
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'josh.smitherman@adaro.net' }, signOut: vi.fn() })
}));

async function openDetails(user) {
  await user.click(screen.getByRole('button', { name: 'Assets' }));
  await user.click(screen.getByRole('button', { name: /view details for AST-0041/i }));
}

beforeEach(() => {
  hook.assets = [asset];
});

describe('AppShell bulk actions and paging', () => {
  beforeEach(() => {
    hook.assets = many;
  });

  it('shows five rows at a time and pages through the rest', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    // Six assigned assets, five to a page.
    expect(screen.getByText('AST-100')).toBeInTheDocument();
    expect(screen.queryByText('AST-105')).not.toBeInTheDocument();
    expect(screen.getByText('1–5 of 6')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /next page of the asset register/i })[0]);
    expect(screen.getByText('AST-105')).toBeInTheDocument();
    expect(screen.queryByText('AST-100')).not.toBeInTheDocument();
  });

  it('keeps a selection while paging and unassigns the lot', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    await user.click(screen.getByRole('checkbox', { name: /select AST-100/i }));
    await user.click(screen.getAllByRole('button', { name: /next page of the asset register/i })[0]);
    await user.click(screen.getByRole('checkbox', { name: /select AST-105/i }));

    expect(screen.getByText('2')).toBeInTheDocument(); // the bulk bar's count
    await user.click(screen.getByRole('button', { name: /^unassign$/i }));

    expect(hook.bulkAssign).toHaveBeenCalledWith(['bulk-0', 'bulk-5'], null);
  });

  it('confirms before deleting a batch, naming what goes', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    // The register and the unassigned list each have one; take the register's.
    await user.click(screen.getAllByRole('checkbox', { name: /select every asset on this page/i })[0]);
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByText(/cannot be undone/i)).toHaveTextContent('AST-100');
    await user.click(screen.getByRole('button', { name: /^delete 5$/i }));
    expect(hook.bulkDelete).toHaveBeenCalledTimes(1);
    expect(hook.bulkDelete.mock.calls[0][0]).toHaveLength(5);
  });
});

describe('AppShell cleaning history', () => {
  it('lists past cleans behind the History tab', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    // The nav tab carries an attention count, so its name is not just "Cleaning".
    await user.click(screen.getByRole('button', { name: /^cleaning/i }));

    expect(screen.queryByText('02 Mar 2026')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /history/i }));

    expect(screen.getByRole('heading', { name: /cleaning history/i })).toBeInTheDocument();
    expect(screen.getByText('02 Sept 2026')).toBeInTheDocument();
    expect(screen.getByText('02 Mar 2026')).toBeInTheDocument();
  });
});

describe('AppShell reports', () => {
  it('is the only place anything is exported from', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByRole('button', { name: 'Assets' }));
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cleaning/i }));
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /history/i }));
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reports' }));
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('lists what is due for cleaning this month', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Reports' }));
    const menu = screen.getByRole('navigation', { name: 'Reports' });
    await user.click(within(menu).getByRole('button', { name: /due this month/i }));

    // The mock asset is overdue, so it is due by the end of any month.
    expect(screen.getByText('AST-0041')).toBeInTheDocument();
    expect(screen.getByText(/1 row/)).toBeInTheDocument();
  });

  it('groups the reports and switches between views of one', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Reports' }));

    const menu = screen.getByRole('navigation', { name: 'Reports' });
    for (const group of ['Assets', 'Cleaning', 'Full exports']) {
      expect(within(menu).getByRole('heading', { name: group })).toBeInTheDocument();
    }
    // Assets by group opens on departments, and switches to device types.
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Device type' }));
    expect(screen.getByRole('button', { name: 'Device type' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(menu).getByRole('button', { name: /cleaning activity/i }));
    await user.click(screen.getByRole('button', { name: 'By person' }));
    expect(screen.getByText('JS')).toBeInTheDocument();
  });
});

describe('AppShell asset register', () => {
  it('keeps the unassigned list on the page when nothing is spare', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    // The only asset in the mock register belongs to someone.
    expect(screen.getByRole('heading', { name: /unassigned assets/i })).toBeInTheDocument();
    expect(screen.getByText(/every asset in this view has a user/i)).toBeInTheDocument();
  });

  it('puts Add asset with the register heading, not in the toolbar', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    const addAsset = screen.getByRole('button', { name: /add asset/i });
    expect(addAsset.closest('.card__header')).not.toBeNull();
    expect(addAsset.closest('.toolbar')).toBeNull();
  });
});

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
    await user.click(screen.getByRole('button', { name: /^close$/i }));
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

describe('AppShell cleaning queue', () => {
  const fine = { ...asset, id: 'ok-1', asset_ref: 'AST-0099', status: STATUS.OK, daysUntilDue: 120, next_clean_due: '2027-01-30' };

  it('opens on what needs doing, and All lists every laptop and desktop', async () => {
    hook.assets = [asset, fine];
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: /^cleaning/i }));

    expect(screen.getByRole('button', { name: /needs attention \(1\)/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('AST-0041')).toBeInTheDocument();
    expect(screen.queryByText('AST-0099')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /all laptops and desktops \(2\)/i }));
    expect(screen.getByText('AST-0099')).toBeInTheDocument();
  });
});

describe('AppShell record clean', () => {
  it('starts on today, with the cleaner to choose and the last clean shown', async () => {
    hook.assets = [asset];
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));
    await user.click(screen.getByRole('button', { name: /view details for AST-0041/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /record clean/i }));

    const dialog = screen.getByRole('dialog');
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(within(dialog).getByLabelText(/date cleaned/i)).toHaveValue(iso);
    expect(within(dialog).getByLabelText(/cleaned by/i)).toHaveValue('');
    expect(within(dialog).getByText(/last cleaned 14 feb 2026 by josh smitherman/i)).toBeInTheDocument();

    // Cancelling hands back to the details it came from.
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('AST-0041');
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
  });
});

describe('AppShell asset links', () => {
  it('opens the asset named in the address, then clears it from the address', () => {
    window.history.replaceState(null, '', '/?asset=ast-0041');
    render(<AppShell />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('AST-0041');
    expect(within(dialog).getByText(/\?asset=AST-0041/)).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('says so when the linked asset is not on the register', () => {
    window.history.replaceState(null, '', '/?asset=NOPE-1');
    render(<AppShell />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/no asset NOPE-1 on the register/i)).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });
});
