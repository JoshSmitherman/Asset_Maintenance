import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetTable from './AssetTable';
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
  next_clean_due: '2026-08-14',
  cleaning_interval_months: 6,
  daysUntilDue: -31,
  status: STATUS.OVERDUE,
  updated_at: '2026-09-14T16:50:00Z',
  updated_by_email: 'josh.smitherman@adaro.net'
};

const noop = () => {};

function renderTable(props) {
  return render(
    <AssetTable assets={[asset]} sort={{ key: 'asset_ref', direction: 'asc' }} onSortChange={noop} {...props} />
  );
}

describe('AssetTable', () => {
  it('leaves the cleaning dates off the register - they belong to the cleaning page', () => {
    renderTable({ variant: 'full', onViewDetails: noop });
    expect(screen.queryByRole('button', { name: /date cleaned/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next clean due/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cost/i })).toBeInTheDocument();
  });

  it('keeps purchase details off the cleaning queue', () => {
    renderTable({ variant: 'cleaning', onRecordClean: noop });
    expect(screen.getByRole('button', { name: /date cleaned/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cost/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /last updated/i })).not.toBeInTheDocument();
  });

  it('opens the details view from the register row', async () => {
    const onViewDetails = vi.fn();
    renderTable({ variant: 'full', onViewDetails });
    await userEvent.click(screen.getByRole('button', { name: /view details for AST-0041/i }));
    expect(onViewDetails).toHaveBeenCalledWith(asset);
  });

  it('offers Record clean instead of a details button on the cleaning queue', async () => {
    const onRecordClean = vi.fn();
    renderTable({ variant: 'cleaning', onRecordClean });
    expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /record clean/i }));
    expect(onRecordClean).toHaveBeenCalledWith(asset);
  });
});
