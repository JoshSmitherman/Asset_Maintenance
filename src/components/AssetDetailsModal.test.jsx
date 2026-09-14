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

describe('AssetDetailsModal specification tab', () => {
  it('shows the laptop specification on its own tab', async () => {
    const user = userEvent.setup();
    render(
      <AssetDetailsModal
        asset={{ ...asset, spec_brand: 'Dell', spec_ram: '16 GB', spec_charger_type: 'USB-C 65W' }}
        onEdit={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    );

    // Details first; the specs are a click away.
    expect(screen.queryByText('16 GB')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /specification/i }));

    expect(screen.getByText('Dell')).toBeInTheDocument();
    expect(screen.getByText('16 GB')).toBeInTheDocument();
    expect(screen.getByText('USB-C 65W')).toBeInTheDocument();
    expect(screen.queryByText('Purchase cost')).not.toBeInTheDocument();
  });

  it('gives a monitor only its own four specs', async () => {
    const user = userEvent.setup();
    render(
      <AssetDetailsModal
        asset={{ ...asset, device_type: 'Monitor', spec_screen_size: '27"', spec_hdmi_ports: 2, spec_dp_ports: 0 }}
        onEdit={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    );
    await user.click(screen.getByRole('tab', { name: /specification/i }));

    expect(screen.getByText('Screen size')).toBeInTheDocument();
    expect(screen.getByText('Resolution')).toBeInTheDocument();
    expect(screen.getByText('HDMI ports')).toBeInTheDocument();
    expect(screen.getByText('DisplayPort ports')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('Battery type')).not.toBeInTheDocument();
    expect(screen.queryByText('Brand')).not.toBeInTheDocument();
  });

  it('has no specification tab for kit that has no specs', () => {
    render(
      <AssetDetailsModal
        asset={{ ...asset, device_type: 'Printer' }}
        onEdit={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Purchase cost')).toBeInTheDocument();
  });
});

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
