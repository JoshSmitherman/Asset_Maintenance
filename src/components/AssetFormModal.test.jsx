import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetFormModal from './AssetFormModal';
import { todayIso, addMonthsIso } from '../lib/dates';

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
    // Laptop is the default device type, so cleaning fields are present.
    const dateInput = screen.getByLabelText(/date cleaned/i);
    await user.clear(dateInput);
    // type="date" inputs accept an ISO value directly
    await user.type(dateInput, future);
    await user.selectOptions(screen.getByLabelText(/cleaned by/i), 'AL');
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

  it('offers the specification tab only to computers and monitors', async () => {
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
    await user.selectOptions(screen.getByLabelText(/device type/i), 'Printer');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/asset ref/i)).toBeInTheDocument();
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
