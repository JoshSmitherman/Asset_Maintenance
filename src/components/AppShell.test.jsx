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

// Thirty with a user and one spare: more than one page of 25.
const many = Array.from({ length: 31 }, (_, index) => ({
  ...asset,
  id: `bulk-${index}`,
  asset_ref: `AST-1${String(index).padStart(2, '0')}`,
  owner_name: index === 30 ? null : `Person ${index}`
}));

const hook = {
  assets: [asset],
  retiredAssets: [],
  // Every row, retired kit included - what the real hook derives the other two from.
  get allAssets() {
    return [...this.assets, ...this.retiredAssets];
  },
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
  retireAssets: vi.fn().mockResolvedValue(1),
  restoreAsset: vi.fn().mockResolvedValue(1),
  assetRefExists: () => false
};

// Who is signed in. Most tests act as an admin; the role tests say otherwise.
const auth = { isAdmin: true, canEdit: true };

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
  useAuth: () => ({
    user: { id: 'u-josh', email: 'josh.smitherman@adaro.net' },
    isAdmin: auth.isAdmin,
    canEdit: auth.canEdit,
    access: auth.isAdmin ? 'admin' : auth.canEdit ? 'editor' : 'viewer',
    department: 'Technical Support',
    userEmail: 'josh.smitherman@adaro.net',
    hasPassword: true,
    signOut: vi.fn()
  })
}));

async function openDetails(user) {
  await user.click(screen.getByRole('button', { name: 'Assets' }));
  await user.click(screen.getByRole('button', { name: /view details for AST-0041/i }));
}

beforeEach(() => {
  hook.assets = [asset];
  hook.retiredAssets = [];
  auth.isAdmin = true;
  auth.canEdit = true;
});

describe('AppShell bulk actions and paging', () => {
  beforeEach(() => {
    hook.assets = many;
  });

  it('shows 25 rows at a time and pages through the rest', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    // Thirty assigned assets, 25 to a page.
    expect(screen.getByText('AST-100')).toBeInTheDocument();
    expect(screen.queryByText('AST-125')).not.toBeInTheDocument();
    expect(screen.getByText('1–25 of 30')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /next page of the asset register/i })[0]);
    expect(screen.getByText('AST-125')).toBeInTheDocument();
    expect(screen.queryByText('AST-100')).not.toBeInTheDocument();
  });

  it('keeps a selection while paging and unassigns the lot', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    await user.click(screen.getByRole('checkbox', { name: /select AST-100/i }));
    await user.click(screen.getAllByRole('button', { name: /next page of the asset register/i })[0]);
    await user.click(screen.getByRole('checkbox', { name: /select AST-125/i }));

    expect(screen.getByText('2')).toBeInTheDocument(); // the bulk bar's count
    await user.click(screen.getByRole('button', { name: /^unassign$/i }));
    // Asks first, naming what moves.
    expect(hook.bulkAssign).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('AST-100, AST-125');
    await user.click(screen.getByRole('button', { name: /^unassign 2$/i }));

    expect(hook.bulkAssign).toHaveBeenCalledWith(['bulk-0', 'bulk-25'], null);
  });

  it('confirms before deleting a batch, naming what goes', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    // The register and the unassigned list each have one; take the register's.
    await user.click(screen.getAllByRole('checkbox', { name: /select every asset on this page/i })[0]);
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByText(/cannot be undone/i)).toHaveTextContent('AST-100');
    await user.click(screen.getByRole('button', { name: /^delete 25$/i }));
    expect(hook.bulkDelete).toHaveBeenCalledTimes(1);
    expect(hook.bulkDelete.mock.calls[0][0]).toHaveLength(25);
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
    await user.click(within(menu).getByRole('button', { name: /^due this month/i }));

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

    await user.click(within(menu).getByRole('button', { name: /^cleaning activity/i }));
    await user.click(screen.getByRole('button', { name: 'By person' }));
    expect(within(screen.getByRole('main')).getByRole('cell', { name: 'JS' })).toBeInTheDocument();
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
  it('starts on today, cleaned by whoever records it, with the last clean shown', async () => {
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
    expect(within(dialog).getByLabelText(/cleaned by/i)).toHaveValue('Josh Smitherman');
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

describe('AppShell dashboard cards', () => {
  it('groups the cards, and a kit card opens the register filtered to it', async () => {
    const monitor = { ...asset, id: 'm1', asset_ref: 'MON-0001', device_type: 'Monitor', status: STATUS.NOT_TRACKED };
    hook.assets = [asset, monitor];
    const user = userEvent.setup();
    render(<AppShell />);

    const assetsGroup = screen.getByRole('region', { name: /^assets$/i });
    const cleaningGroup = screen.getByRole('region', { name: /^cleaning/i });
    expect(within(cleaningGroup).getByRole('button', { name: /overdue/i })).toHaveTextContent('1');

    await user.click(within(assetsGroup).getByRole('button', { name: /monitors/i }));
    expect(screen.getByLabelText(/device type/i)).toHaveValue('Monitor');
    expect(screen.getByText('MON-0001')).toBeInTheDocument();
    expect(screen.queryByText('AST-0041')).not.toBeInTheDocument();
  });
});

describe('AppShell retiring and deleting', () => {
  const retired = {
    ...asset,
    id: 'r-1',
    asset_ref: 'AST-0009',
    status: 'Retired',
    retired_on: '2026-09-30',
    retired_reason: 'Beyond repair',
    data_wiped: true,
    data_wiped_by_email: 'josh.smitherman@adaro.net'
  };

  it('offers a plain user Retire but never Delete', async () => {
    auth.isAdmin = false;
    const user = userEvent.setup();
    render(<AppShell />);
    await openDetails(user);

    expect(screen.getByRole('button', { name: /^retire$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete asset/i })).not.toBeInTheDocument();

    // The bulk bar is the same: Retire, no Delete.
    await user.click(screen.getByRole('button', { name: /^close$/i }));
    await user.click(screen.getByRole('checkbox', { name: /select AST-0041/i }));
    expect(screen.getByRole('button', { name: /^retire$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('retires an asset with a reason and who wiped it', async () => {
    auth.isAdmin = false;
    const user = userEvent.setup();
    render(<AppShell />);
    await openDetails(user);

    await user.click(screen.getByRole('button', { name: /^retire$/i }));
    // A reason is required.
    await user.click(screen.getByRole('button', { name: /retire asset/i }));
    expect(screen.getByText(/choose why it is being retired/i)).toBeInTheDocument();
    expect(hook.retireAssets).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText(/reason/i), 'Beyond repair');
    await user.click(screen.getByLabelText(/data has been wiped/i));
    await user.click(screen.getByRole('button', { name: /retire asset/i }));

    expect(hook.retireAssets).toHaveBeenCalledWith(
      ['a1'],
      expect.objectContaining({ retired_reason: 'Beyond repair', data_wiped: true, data_wiped_by: 'u-josh' })
    );
  });

  it('keeps retired kit off the register, under its own folded list', async () => {
    hook.retiredAssets = [retired];
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));

    expect(screen.getByRole('heading', { name: /^retired$/i })).toBeInTheDocument();
    expect(screen.queryByText('AST-0009')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^show$/i }));
    expect(screen.getByText('AST-0009')).toBeInTheDocument();
    expect(screen.getAllByText('Beyond repair').length).toBeGreaterThan(0);
  });

  it('lets an admin restore retired kit, and only an admin', async () => {
    hook.retiredAssets = [retired];
    const user = userEvent.setup();
    const { unmount } = render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));
    await user.click(screen.getByRole('button', { name: /^show$/i }));
    await user.click(screen.getByRole('button', { name: /view details for AST-0009/i }));

    expect(screen.getByText(/retired .* beyond repair/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^restore$/i }));
    expect(hook.restoreAsset).toHaveBeenCalledWith('r-1');
    unmount();

    auth.isAdmin = false;
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));
    await user.click(screen.getByRole('button', { name: /^show$/i }));
    await user.click(screen.getByRole('button', { name: /view details for AST-0009/i }));
    expect(screen.queryByRole('button', { name: /^restore$/i })).not.toBeInTheDocument();
  });
});

describe('AppShell reports by person', () => {
  it('shows everyone, then one person\'s kit when picked', async () => {
    hook.assets = many;
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Reports' }));
    // The side menu and the phone dropdown both offer it; take the menu.
    await user.click(screen.getAllByRole('button', { name: /^by person/i })[0]);

    expect(screen.getByRole('heading', { name: /^by person$/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Person 0' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Person 3' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^person$/i), 'Person 3');
    expect(screen.getByRole('cell', { name: 'AST-103' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'AST-100' })).not.toBeInTheDocument();
  });
});

describe('AppShell for someone with view-only access', () => {
  beforeEach(() => {
    auth.isAdmin = false;
    auth.canEdit = false;
  });

  it('shows the register but nothing that changes it', async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));
    expect(screen.queryByRole('button', { name: /add asset/i })).not.toBeInTheDocument();
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view details for AST-0041/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: /edit details/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /retire/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /record clean/i })).not.toBeInTheDocument();
  });
});

describe('AppShell asset register without cleaning', () => {
  it('shows what each device is, and nothing about cleaning', async () => {
    hook.assets = [{ ...asset, spec_brand: 'Dell', spec_model: '14 Pro Plus', device_name: 'Dell 14 Pro Plus', device_label: 'Dell 14 Pro Plus' }];
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole('button', { name: 'Assets' }));
    const main = screen.getByRole('main');
    expect(within(main).getByText('Dell 14 Pro Plus')).toBeInTheDocument();
    expect(within(main).queryByRole('columnheader', { name: /status/i })).not.toBeInTheDocument();
    expect(within(main).queryByLabelText(/cleaned by/i)).not.toBeInTheDocument();
    expect(within(main).queryByLabelText(/^status$/i)).not.toBeInTheDocument();

    // Selecting kit offers no cleaning either.
    await user.click(within(main).getAllByRole('checkbox')[1]);
    expect(within(main).queryByRole('button', { name: /record clean/i })).not.toBeInTheDocument();
  });
});
