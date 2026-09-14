import { formatCurrency, isCleaningTracked, STATUS } from '../lib/constants';
import { describeDayOffset, formatDate, formatTimestamp } from '../lib/dates';
import StatusBadge from './StatusBadge';

const LABELS = {
  asset_ref: 'Asset Ref',
  device_type: 'Type',
  owner_name: 'User',
  department: 'Department',
  location: 'Location',
  purchase_date: 'Purchased',
  purchase_cost: 'Cost',
  date_cleaned: 'Date Cleaned',
  cleaned_by: 'Cleaned By',
  next_clean_due: 'Next Clean Due',
  status: 'Status',
  updated_at: 'Last updated'
};

/**
 * Each view lists the columns it shows, in order, with the width at which a
 * column drops off so neither table ever needs sideways scrolling. The
 * cleaning queue carries more columns than the register, so it sheds them
 * sooner.
 */
function column(key, className) {
  return { key, label: LABELS[key], className };
}

/** The register. Cleaning dates live on the Cleaning page, not here. */
const FULL_COLUMNS = [
  column('asset_ref'),
  column('device_type', 'col-hide-xs'),
  column('owner_name'),
  column('department', 'col-hide-md'),
  column('location', 'col-hide-sm'),
  column('purchase_date', 'col-hide-md'),
  column('purchase_cost', 'col-hide-sm'),
  column('status'),
  column('updated_at', 'col-hide-lg')
];

/**
 * The cleaning view: purchase details are irrelevant to a cleaning round, and
 * who last touched the record matters less than when it was last cleaned.
 */
const CLEANING_COLUMNS = [
  column('asset_ref'),
  column('device_type', 'col-hide-xs'),
  column('owner_name'),
  column('department', 'col-hide-lg'),
  column('location', 'col-hide-md'),
  column('date_cleaned', 'col-hide-sm'),
  column('cleaned_by', 'col-hide-md'),
  column('next_clean_due', 'col-hide-xs'),
  column('status')
];

function SortIndicator({ active, direction }) {
  if (!active) return <span className="sort-indicator" aria-hidden="true">↕</span>;
  return <span className="sort-indicator sort-indicator--active" aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export default function AssetTable({
  assets,
  sort,
  onSortChange,
  onViewDetails,
  onRecordClean,
  variant = 'full',
  emptyMessage = 'No assets match the current search and filters.'
}) {
  const columns = variant === 'cleaning' ? CLEANING_COLUMNS : FULL_COLUMNS;
  const shown = new Map(columns.map((item) => [item.key, item]));
  const classOf = (key) => shown.get(key)?.className;
  const handleSort = (key) => {
    if (sort.key === key) {
      onSortChange({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, direction: 'asc' });
    }
  };

  if (assets.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="table-scroll">
      <table className={`table table--${variant}`}>
        <thead>
          <tr>
            {columns.map((col) => {
              const isActive = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={col.className}
                  aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className="table__sort" onClick={() => handleSort(col.key)}>
                    {col.label}
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
              <td className={classOf('device_type')}>{asset.device_type}</td>
              <td>
                {asset.owner_name ?? <span className="cell-unassigned">Unassigned</span>}
              </td>
              <td className={classOf('department')}>{asset.department}</td>
              <td className={classOf('location')}>{asset.location ?? <span className="cell-muted">—</span>}</td>
              {shown.has('purchase_date') ? (
                <td className={classOf('purchase_date')}>
                  {asset.purchase_date ? formatDate(asset.purchase_date) : <span className="cell-muted">—</span>}
                </td>
              ) : null}
              {shown.has('purchase_cost') ? (
                <td className={classOf('purchase_cost')}>{formatCurrency(asset.purchase_cost) ?? <span className="cell-muted">—</span>}</td>
              ) : null}
              {shown.has('date_cleaned') ? (
                <td className={classOf('date_cleaned')}>
                  {!isCleaningTracked(asset.device_type) ? (
                    <span className="cell-muted">—</span>
                  ) : asset.date_cleaned ? (
                    formatDate(asset.date_cleaned)
                  ) : (
                    <span className="cell-flag">Never cleaned</span>
                  )}
                </td>
              ) : null}
              {shown.has('cleaned_by') ? (
                <td className={classOf('cleaned_by')}>{asset.cleaned_by ?? <span className="cell-muted">—</span>}</td>
              ) : null}
              {shown.has('next_clean_due') ? (
                <td className={classOf('next_clean_due')}>
                  {asset.next_clean_due ? (
                    <>
                      {formatDate(asset.next_clean_due)}
                      <span className="cell-muted cell-block">{describeDayOffset(asset.daysUntilDue)}</span>
                    </>
                  ) : (
                    <span className="cell-muted">—</span>
                  )}
                </td>
              ) : null}
              <td>
                <StatusBadge
                  status={asset.status}
                  title={asset.cleaning_interval_months !== 6 ? `${asset.cleaning_interval_months}-month cycle` : undefined}
                />
              </td>
              {shown.has('updated_at') ? (
                <td className={classOf('updated_at')}>
                  <span className="cell-block">{formatTimestamp(asset.updated_at)}</span>
                  <span className="cell-muted cell-block">{asset.updated_by_email || 'unknown user'}</span>
                </td>
              ) : null}
              <td className="table__actions">
                {variant === 'cleaning' ? (
                  <button
                    type="button"
                    className="btn btn--small btn--brand-light"
                    onClick={() => onRecordClean(asset)}
                  >
                    Record clean
                  </button>
                ) : (
                  <button
                    type="button"
                    className="icon-action"
                    onClick={() => onViewDetails(asset)}
                    title={`View ${asset.asset_ref}`}
                    aria-label={`View details for ${asset.asset_ref}`}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
                      <path
                        d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z"
                        fill="none" stroke="currentColor" strokeWidth="1.7"
                        strokeLinecap="round" strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
