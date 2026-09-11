import { formatCurrency, isCleaningTracked, STATUS } from '../lib/constants';
import { describeDayOffset, formatDate, formatTimestamp } from '../lib/dates';
import StatusBadge from './StatusBadge';

const ALL_COLUMNS = {
  asset_ref:      { key: 'asset_ref', label: 'Asset Ref' },
  device_type:    { key: 'device_type', label: 'Type' },
  owner_name:     { key: 'owner_name', label: 'Owner' },
  department:     { key: 'department', label: 'Department', className: 'col-hide-sm' },
  location:       { key: 'location', label: 'Location' },
  purchase_date:  { key: 'purchase_date', label: 'Purchased' },
  purchase_cost:  { key: 'purchase_cost', label: 'Cost' },
  date_cleaned:   { key: 'date_cleaned', label: 'Date Cleaned' },
  cleaned_by:     { key: 'cleaned_by', label: 'Cleaned By' },
  next_clean_due: { key: 'next_clean_due', label: 'Next Clean Due' },
  status:         { key: 'status', label: 'Status' },
  updated_at:     { key: 'updated_at', label: 'Last updated', className: 'col-hide-lg' }
};

/** The full inventory view. */
const FULL_KEYS = [
  'asset_ref', 'device_type', 'owner_name', 'department', 'location',
  'purchase_date', 'purchase_cost', 'date_cleaned', 'next_clean_due', 'status', 'updated_at'
];

/** The cleaning view: purchase details are irrelevant to a cleaning round. */
const CLEANING_KEYS = [
  'asset_ref', 'device_type', 'owner_name', 'department', 'location',
  'date_cleaned', 'cleaned_by', 'next_clean_due', 'status', 'updated_at'
];

function SortIndicator({ active, direction }) {
  if (!active) return <span className="sort-indicator" aria-hidden="true">↕</span>;
  return <span className="sort-indicator sort-indicator--active" aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export default function AssetTable({ assets, sort, onSortChange, onEdit, onDelete, variant = 'full' }) {
  const columns = (variant === 'cleaning' ? CLEANING_KEYS : FULL_KEYS).map((key) => ALL_COLUMNS[key]);
  const shownKeys = new Set(columns.map((column) => column.key));
  const handleSort = (key) => {
    if (sort.key === key) {
      onSortChange({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, direction: 'asc' });
    }
  };

  if (assets.length === 0) {
    return <p className="empty-state">No assets match the current search and filters.</p>;
  }

  return (
    <div className="table-scroll">
      <table className={`table table--${variant}`}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isActive = sort.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.className}
                  aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className="table__sort" onClick={() => handleSort(column.key)}>
                    {column.label}
                    <SortIndicator active={isActive} direction={sort.direction} />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="table__actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className={asset.status === STATUS.OVERDUE ? 'row--overdue' : undefined}>
              <td className="cell-strong">
                {asset.asset_ref}
                {asset.notes ? (
                  <span className="note-flag" title={asset.notes} aria-label="Has notes">note</span>
                ) : null}
              </td>
              <td>{asset.device_type}</td>
              <td>{asset.owner_name}</td>
              <td className="col-hide-sm">{asset.department}</td>
              <td>{asset.location ?? <span className="cell-muted">—</span>}</td>
              {shownKeys.has('purchase_date') ? (
                <td>
                  {asset.purchase_date ? formatDate(asset.purchase_date) : <span className="cell-muted">—</span>}
                </td>
              ) : null}
              {shownKeys.has('purchase_cost') ? (
                <td>{formatCurrency(asset.purchase_cost) ?? <span className="cell-muted">—</span>}</td>
              ) : null}
              <td>
                {!isCleaningTracked(asset.device_type) ? (
                  <span className="cell-muted">—</span>
                ) : asset.date_cleaned ? (
                  formatDate(asset.date_cleaned)
                ) : (
                  <span className="cell-flag">Never cleaned</span>
                )}
              </td>
              {shownKeys.has('cleaned_by') ? (
                <td>{asset.cleaned_by ?? <span className="cell-muted">—</span>}</td>
              ) : null}
              <td>
                {asset.next_clean_due ? (
                  <>
                    {formatDate(asset.next_clean_due)}
                    <span className="cell-muted cell-block">{describeDayOffset(asset.daysUntilDue)}</span>
                  </>
                ) : (
                  <span className="cell-muted">—</span>
                )}
              </td>
              <td>
                <StatusBadge
                  status={asset.status}
                  title={asset.cleaning_interval_months !== 6 ? `${asset.cleaning_interval_months}-month cycle` : undefined}
                />
              </td>
              <td className="col-hide-lg">
                <span className="cell-block">{formatTimestamp(asset.updated_at)}</span>
                <span className="cell-muted cell-block">{asset.updated_by_email || 'unknown user'}</span>
              </td>
              <td className="table__actions">
                <button type="button" className="btn btn--small" onClick={() => onEdit(asset)}>Edit</button>
                <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => onDelete(asset)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
