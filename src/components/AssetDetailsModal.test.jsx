import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetDetailsModal from './AssetDetailsModal';
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
  notes: null,
  updated_at: '2026-09-14T16:50:00Z',
  updated_by_email: 'josh.smitherman@adaro.net'
};

describe('AssetDetailsModal', () => {
  it('shows the full record, cleaning dates included', () => {
    render(<AssetDetailsModal asset={asset} onEdit={() => {}} onDelete={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Purchase cost')).toBeInTheDocument();
    expect(screen.getByText('Next clean due')).toBeInTheDocument();
    expect(screen.getByText('£1,249.00')).toBeInTheDocument();
  });

  it('says cleaning is not tracked for kit outside the rota', () => {
    render(
      <AssetDetailsModal
        asset={{ ...asset, device_type: 'Monitor' }}
        onEdit={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText('Next clean due')).not.toBeInTheDocument();
    expect(screen.getByText(/only laptops and desktops/i)).toBeInTheDocument();
  });

  it('leaves closing to the header control rather than repeating it below', () => {
    render(<AssetDetailsModal asset={asset} onEdit={() => {}} onDelete={() => {}} onClose={() => {}} />);
    const close = screen.getByRole('button', { name: /^close$/i });
    expect(close).toHaveClass('icon-button');
  });

  it('hands the asset to edit and delete', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<AssetDetailsModal asset={asset} onEdit={onEdit} onDelete={onDelete} onClose={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /edit details/i }));
    expect(onEdit).toHaveBeenCalledWith(asset);

    await userEvent.click(screen.getByRole('button', { name: /delete asset/i }));
    expect(onDelete).toHaveBeenCalledWith(asset);
  });
});
