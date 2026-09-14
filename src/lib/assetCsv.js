import { formatCurrency } from './constants';

/**
 * How an asset appears in an exported file. Dates stay ISO and money stays a
 * plain number, because a spreadsheet can format those itself but cannot
 * un-format "£1,249.00" back into something it can add up.
 */
const SHARED = [
  { key: 'asset_ref', label: 'Asset Ref' },
  { key: 'device_type', label: 'Device type' },
  { key: 'owner_name', label: 'User', format: (row) => row.owner_name ?? '' },
  { key: 'department', label: 'Department' },
  { key: 'location', label: 'Location', format: (row) => row.location ?? '' },
  { key: 'status', label: 'Status' }
];

export const REGISTER_CSV_COLUMNS = [
  ...SHARED,
  { key: 'purchase_date', label: 'Purchase date', format: (row) => row.purchase_date ?? '' },
  { key: 'purchase_cost', label: 'Purchase cost', format: (row) => row.purchase_cost ?? '' },
  { key: 'purchase_cost_formatted', label: 'Purchase cost (formatted)', format: (row) => formatCurrency(row.purchase_cost) ?? '' },
  { key: 'notes', label: 'Notes', format: (row) => row.notes ?? '' },
  { key: 'updated_at', label: 'Last updated' },
  { key: 'updated_by_email', label: 'Last updated by', format: (row) => row.updated_by_email ?? '' }
];

export const CLEANING_CSV_COLUMNS = [
  ...SHARED,
  { key: 'date_cleaned', label: 'Date cleaned', format: (row) => row.date_cleaned ?? '' },
  { key: 'cleaned_by', label: 'Cleaned by', format: (row) => row.cleaned_by ?? '' },
  { key: 'cleaning_interval_months', label: 'Interval (months)' },
  { key: 'next_clean_due', label: 'Next clean due', format: (row) => row.next_clean_due ?? '' },
  { key: 'daysUntilDue', label: 'Days until due', format: (row) => row.daysUntilDue ?? '' }
];
