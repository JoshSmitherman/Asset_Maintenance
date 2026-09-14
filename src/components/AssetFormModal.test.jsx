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
    await user.type(screen.getByLabelText(/department/i), 'IT');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.queryByText(/user is required/i)).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].owner_name).toBe('');
  });

  it('rejects a duplicate Asset Ref via assetRefExists', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({ assetRefExists: () => true });
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-001');
    await user.type(screen.getByLabelText(/^user$/i), 'Alice');
    await user.type(screen.getByLabelText(/department/i), 'IT');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.getByText(/already uses this asset ref/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a future Date Cleaned (mirrors the DB trigger)', async () => {
    const user = userEvent.setup();
    const future = addMonthsIso(todayIso(), 1);
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-777');
    await user.type(screen.getByLabelText(/^user$/i), 'Bob');
    await user.type(screen.getByLabelText(/department/i), 'Finance');
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
    await user.type(screen.getByLabelText(/^user$/i), 'Shared Desk');
    await user.type(screen.getByLabelText(/department/i), 'Ops');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ asset_ref: 'MON-042', device_type: 'Monitor' });
  });

  it('surfaces a server error thrown by onSubmit without closing', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Asset Ref "LAP-9" already exists.'));
    render(<AssetFormModal onSubmit={onSubmit} onClose={vi.fn()} assetRefExists={() => false} />);
    await user.type(screen.getByLabelText(/asset ref/i), 'LAP-9');
    await user.type(screen.getByLabelText(/^user$/i), 'Carol');
    await user.type(screen.getByLabelText(/department/i), 'IT');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
