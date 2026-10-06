import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetFormModal from './AssetFormModal';
import { todayIso, addMonthsIso } from '../lib/dates';

vi.mock('../hooks/useTeam', () => ({
  useTeam: () => [
    { id: 'u1', email: 'al.lee@adaro.net', full_name: 'Al Lee' },
    { id: 'u2', email: 'bea.bond@adaro.net', full_name: null }
  ]
}));

function setup(overrides = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const assetRefExists = overrides.assetRefExists ?? (() => false);
  render(
    <AssetFormModal
      onSubmit={onSubmit}
      onClose={onClose}
      assetRefExists={assetRefExists}
      {...overrides}
    />
  );
  return { onSubmit, onClose };
}

/**
 * Department and User are dropdowns of names already on the register. A test
 * register is empty, so every value in here arrives through "Add new".
 */
async function addNew(user, label, text) {
  await user.selectOptions(screen.getByLabelText(label), '__add_new__');
  await user.type(screen.getByLabelText(label), text);
}

describe('AssetFormModal validation', () => {
  it('shows required-field errors and does not submit when empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.getByText('Asset Ref is required.')).toBeInTheDocument();
    expect(screen.getByText('Department is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts a blank User - that is how an asset is marked unassigned', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-900');
    await addNew(user, /department/i, 'IT');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.queryByText(/user is required/i)).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].owner_name).toBe('');
  });

  it('rejects a duplicate Asset Ref via assetRefExists', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({ assetRefExists: () => true });
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-001');
    await addNew(user, /^user$/i, 'Alice');
    await addNew(user, /department/i, 'IT');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.getByText(/already uses this asset ref/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a future Date Cleaned (mirrors the DB trigger)', async () => {
    const user = userEvent.setup();
    const future = addMonthsIso(todayIso(), 1);
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-777');
    await addNew(user, /^user$/i, 'Bob');
    await addNew(user, /department/i, 'Finance');
    // Laptop is the default device type; its last clean is one click away.
    await user.click(screen.getByRole('button', { name: /record its last clean/i }));
    const dateInput = screen.getByLabelText(/date cleaned/i);
    await user.clear(dateInput);
    // type="date" inputs accept an ISO value directly
    await user.type(dateInput, future);
    await user.selectOptions(screen.getByLabelText(/cleaned by/i), 'Al Lee');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.getByText(/date cleaned cannot be in the future/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid inventory asset (untracked type hides cleaning fields)', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText(/asset ref/i), 'MON-042');
    await user.selectOptions(screen.getByLabelText(/device type/i), 'Monitor');
    // Cleaning fields disappear for non-laptop/desktop
    expect(screen.queryByLabelText(/cleaned by/i)).not.toBeInTheDocument();
    await addNew(user, /^user$/i, 'Shared Desk');
    await addNew(user, /department/i, 'Ops');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ asset_ref: 'MON-042', device_type: 'Monitor' });
  });

  it('records a specification from the second tab', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({ specOptions: { spec_ram: ['8 GB', '16 GB'] } });

    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-123');
    await addNew(user, /department/i, 'IT');

    await user.click(screen.getByRole('tab', { name: /specification/i }));
    await user.selectOptions(screen.getByLabelText(/^ram$/i), '16 GB');
    await addNew(user, /model/i, 'Latitude 5540');

    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      asset_ref: 'LAP-123',
      spec_ram: '16 GB',
      spec_model: 'Latitude 5540'
    });
  });

  it('shows the specs that suit each device type', async () => {
    const user = userEvent.setup();
    setup();
    // Laptop is the default.
    expect(screen.getByRole('tab', { name: /specification/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/device type/i), 'Monitor');
    await user.click(screen.getByRole('tab', { name: /specification/i }));
    expect(screen.getByLabelText(/hdmi ports/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/battery type/i)).not.toBeInTheDocument();

    // Device Type lives on the details tab, so go back before changing it.
    await user.click(screen.getByRole('tab', { name: /details/i }));
    await user.selectOptions(screen.getByLabelText(/device type/i), 'Camera');
    await user.click(screen.getByRole('tab', { name: /specification/i }));
    expect(screen.getByLabelText(/brand/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/hdmi ports/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/processor/i)).not.toBeInTheDocument();
  });

  it('offers the usual device types first, then lets any other be added', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    const options = [...screen.getByLabelText(/device type/i).querySelectorAll('option')].map((o) => o.textContent);
    expect(options.slice(0, 5)).toEqual(['Laptop', 'Desktop', 'Monitor', 'Phone', 'Camera']);
    expect(options.at(-1)).toMatch(/add another type/i);

    await user.selectOptions(screen.getByLabelText(/device type/i), '+ Add another type…');
    await user.type(screen.getByLabelText(/device type/i), 'Projector');
    await user.type(screen.getByLabelText(/asset ref/i), 'AST-0500');
    await addNew(user, /department/i, 'Finance');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ device_type: 'Projector' });
  });

  it('keeps a type nobody else uses on an asset that has it', () => {
    setup({ asset: { id: 'd1', asset_ref: 'PRJ-1', device_type: 'Projector', department: 'IT', version: 1 } });
    expect(screen.getByLabelText(/device type/i)).toHaveValue('Projector');
  });

  it('opens the tab an error is hiding on', async () => {
    const user = userEvent.setup();
    // The Brand box caps typing at 60, so an over-long value can only arrive
    // from outside the form - which is exactly the case worth covering.
    const { onSubmit } = setup({ prefill: { spec_brand: 'D'.repeat(61) } });
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-500');
    await addNew(user, /department/i, 'IT');
    // Still on the details tab, so the error would otherwise be out of sight.
    await user.click(screen.getByRole('button', { name: /add asset/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: /specification/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/brand must be 60 characters or fewer/i)).toBeInTheDocument();
  });

  it('adds several identical assets, one reference each', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText(/asset ref \*/i), 'LAP-010');
    await addNew(user, /department/i, 'IT');
    await user.click(screen.getByRole('button', { name: /one more/i }));
    await user.click(screen.getByRole('button', { name: /one more/i }));

    await user.type(screen.getByLabelText(/asset ref 2/i), 'LAP-011');
    await user.type(screen.getByLabelText(/asset ref 3/i), 'LAP-012');

    await user.click(screen.getByRole('button', { name: /add 3 assets/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      asset_ref: 'LAP-010',
      extra_refs: ['LAP-011', 'LAP-012']
    });
  });

  it('will not let a batch repeat a reference', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText(/asset ref \*/i), 'LAP-010');
    await addNew(user, /department/i, 'IT');
    await user.click(screen.getByRole('button', { name: /one more/i }));
    await user.type(screen.getByLabelText(/asset ref 2/i), 'LAP-010');

    await user.click(screen.getByRole('button', { name: /add 2 assets/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    // Both boxes are flagged: either one of them is the duplicate.
    expect(screen.getAllByText(/repeated in this batch/i)).toHaveLength(2);
  });

  it('offers no quantity when editing - an edit is always one asset', () => {
    setup({ asset: { id: 'a1', asset_ref: 'LAP-1', device_type: 'Laptop', department: 'IT', version: 1 } });
    expect(screen.queryByRole('button', { name: /one more/i })).not.toBeInTheDocument();
  });

  it('surfaces a server error thrown by onSubmit without closing', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Asset Ref "LAP-9" already exists.'));
    render(<AssetFormModal onSubmit={onSubmit} onClose={vi.fn()} assetRefExists={() => false} />);
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-9');
    await addNew(user, /^user$/i, 'Carol');
    await addNew(user, /department/i, 'IT');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});

describe('AssetFormModal cleaning defaults', () => {
  it('starts a laptop on 12 months, and drops cleaning for kit that is not cleaned', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByLabelText(/cleaning interval/i)).toHaveValue(12);
    await user.selectOptions(screen.getByLabelText(/device type/i), 'Phone');
    expect(screen.queryByLabelText(/cleaning interval/i)).not.toBeInTheDocument();
  });

  it('keeps an interval someone typed when the type changes', async () => {
    const user = userEvent.setup();
    setup();
    const interval = screen.getByLabelText(/cleaning interval/i);
    await user.clear(interval);
    await user.type(interval, '3');
    await user.selectOptions(screen.getByLabelText(/device type/i), 'Phone');
    await user.selectOptions(screen.getByLabelText(/device type/i), 'Laptop');
    expect(screen.getByLabelText(/cleaning interval/i)).toHaveValue(3);
  });

  it('shows a just-purchased asset as due a year later', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText(/purchase date/i), todayIso());
    expect(screen.getByText(/first clean is due a year after purchase/i)).toBeInTheDocument();
    expect(screen.queryByText('No clean recorded')).not.toBeInTheDocument();
  });
});

describe('AssetFormModal cleaners', () => {
  it('offers the team by name, plus older initials already on the record', () => {
    setup({ asset: { id: 'a9', asset_ref: 'LAP-9', device_type: 'Laptop', department: 'IT', version: 1,
      date_cleaned: '2026-01-02', cleaned_by: 'TM', cleaning_interval_months: 12 } });
    const options = [...screen.getByLabelText(/cleaned by/i).querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['— Not recorded —', 'TM', 'Al Lee', 'Bea Bond']);
    expect(screen.getByLabelText(/cleaned by/i)).toHaveValue('TM');
  });
});

describe('AssetFormModal next step', () => {
  it('checks the details, then moves on to the Specification tab', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: /next: specification/i }));
    expect(screen.getByText('Asset Ref is required.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /details/i })).toHaveAttribute('aria-selected', 'true');

    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-901');
    await addNew(user, /department/i, 'IT');
    await user.click(screen.getByRole('button', { name: /next: specification/i }));
    expect(screen.getByRole('tab', { name: /specification/i })).toHaveAttribute('aria-selected', 'true');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^add asset$/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('AssetFormModal spec memory', () => {
  const latitude = {
    key: 'dell latitude 5540',
    brand: 'Dell',
    model: 'Latitude 5540',
    label: 'Dell Latitude 5540',
    count: 3,
    refs: ['LAP-003', 'LAP-002', 'LAP-001'],
    specs: { spec_brand: 'Dell', spec_model: 'Latitude 5540', spec_ram: '16 GB', spec_storage: '512 GB SSD' }
  };
  const elitebook = {
    key: 'hp elitebook 840',
    brand: 'HP',
    model: 'EliteBook 840',
    label: 'HP EliteBook 840',
    count: 1,
    refs: ['LAP-009'],
    specs: { spec_brand: 'HP', spec_model: 'EliteBook 840', spec_ram: '8 GB' }
  };
  const specMemory = { Laptop: [latitude, elitebook] };
  const openSpecs = async (user, overrides = {}) => {
    setup({ specMemory, ...overrides });
    await user.click(screen.getByRole('tab', { name: /specification/i }));
  };

  it('switches between models as often as needed, and Undo goes back one step', async () => {
    const user = userEvent.setup();
    await openSpecs(user);
    const picker = screen.getByLabelText(/copy specs from a model/i);

    await user.selectOptions(picker, 'dell latitude 5540');
    expect(screen.getByLabelText('RAM')).toHaveValue('16 GB');
    expect(screen.getByLabelText('Hard drive')).toHaveValue('512 GB SSD');

    // Still there, still usable: pick a different model and it takes over.
    await user.selectOptions(screen.getByLabelText(/copy specs from a model/i), 'hp elitebook 840');
    expect(screen.getByLabelText('Brand')).toHaveValue('HP');
    expect(screen.getByLabelText('RAM')).toHaveValue('8 GB');
    // Nothing left over from the Dell.
    expect(screen.getByLabelText('Hard drive')).toHaveValue('');
    expect(screen.getByLabelText(/copy specs from a model/i)).toHaveValue('hp elitebook 840');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Brand')).toHaveValue('Dell');
    expect(screen.getByLabelText('Hard drive')).toHaveValue('512 GB SSD');
  });

  it('clears every spec box', async () => {
    const user = userEvent.setup();
    await openSpecs(user);
    await user.selectOptions(screen.getByLabelText(/copy specs from a model/i), 'dell latitude 5540');
    await user.click(screen.getByRole('button', { name: /clear specs/i }));
    expect(screen.getByLabelText('RAM')).toHaveValue('');
    expect(screen.getByLabelText(/copy specs from a model/i)).toHaveValue('');
  });

  it('offers to fill only the empty boxes when the typed model is already known', async () => {
    const user = userEvent.setup();
    await openSpecs(user, { prefill: { spec_brand: 'dell', spec_model: 'latitude 5540', spec_ram: '32 GB' } });
    await user.click(screen.getByRole('button', { name: /fill the empty boxes/i }));
    expect(screen.getByLabelText('Hard drive')).toHaveValue('512 GB SSD');
    // What was typed stays as typed.
    expect(screen.getByLabelText('RAM')).toHaveValue('32 GB');
    expect(screen.getByLabelText('Model')).toHaveValue('latitude 5540');
  });

  it('asks "did you mean" for a near miss, and switches to the known spelling', async () => {
    const user = userEvent.setup();
    await openSpecs(user, { prefill: { spec_brand: 'Dell', spec_model: 'Lattitude 5540' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/did you mean dell latitude 5540/i);
    await user.click(screen.getByRole('button', { name: /use that spelling/i }));
    expect(screen.getByLabelText('Model')).toHaveValue('Latitude 5540');
    // Now an exact match, so the fill offer replaces the warning.
    expect(screen.getByRole('button', { name: /fill the empty boxes/i })).toBeInTheDocument();
  });
});
