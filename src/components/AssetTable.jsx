import { STATUS } from '../lib/constants';
import { describeDayOffset, formatDate, formatTimestamp } from '../lib/dates';
import StatusBadge from './StatusBadge';

const COLUMNS = [
  { key: 'asset_ref', label: 'Asset Ref', sortable: true },
  { key: 'device_type', label: 'Type', sortable: true },
  { key: 'owner_name', label: 'Owner', sortable: true },
  { key: 'department', label: 'Department', sortable: true, className: 'col-hide-md' },
  { key: 'date_cleaned', label: 'Date Cleaned', sortable: true },
  { key: 'cleaned_by', label: 'Cleaned By', sortable: true, className: 'col-hide-sm' },
  { key: 'next_clean_due', label: 'Next Clean Due', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'updated_at', label: 'Last updated', sortable: true, className: 'col-hide-lg' }
];

function SortIndicator({ active, direction }) {
  if (!active) return <span className="sort-indicator" aria-hidden="true">↕</span>;
  return <span className="sort-indicator sort-indicator--active" aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export default function AssetTable({ assets, sort, onSortChange, onEdit, onDelete }) {
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
      <table className="table">
        <thead>
          <tr>
            {COLUMNS.map((column) => {
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
              <td className="col-hide-md">{asset.department}</td>
              <td>
                {asset.date_cleaned ? (
                  formatDate(asset.date_cleaned)
                ) : (
                  <span className="cell-flag">Never cleaned</span>
                )}
              </td>
              <td className="col-hide-sm">{asset.cleaned_by ?? <span className="cell-muted">—</span>}</td>
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
