import { ATTENTION_STATUSES, STATUS } from '../lib/constants';
import { describeDayOffset, formatDate } from '../lib/dates';
import { sortByUrgency } from '../lib/assetQueries';
import StatusBadge from './StatusBadge';

export default function AttentionPanel({ assets, onRecordClean, onOpenQueue }) {
  const needsAttention = sortByUrgency(assets.filter((asset) => ATTENTION_STATUSES.includes(asset.status)));

  // Worst case first: red once anything is overdue or was never cleaned,
  // amber if the rest is only due soon - a plain grey count was easy to miss.
  const hasUrgent = needsAttention.some(
    (asset) => asset.status === STATUS.OVERDUE || asset.status === STATUS.NEVER_CLEANED
  );
  const pillTone = needsAttention.length === 0 ? '' : hasUrgent ? 'pill--overdue' : 'pill--due-soon';

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Needs attention</h2>
          <p className="card__subtitle">Overdue first, then never cleaned, then due within 30 days.</p>
        </div>
        <div className="card__header-actions">
          {onOpenQueue && needsAttention.length > 0 ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={onOpenQueue}>
              Open cleaning queue
            </button>
          ) : null}
          <span className={`pill${pillTone ? ` ${pillTone}` : ''}`}>{needsAttention.length}</span>
        </div>
      </div>

      {needsAttention.length === 0 ? (
        <p className="empty-state empty-state--positive">
          Nothing needs attention — every asset has been cleaned within the last cycle.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="table table--attention">
            <thead>
              <tr>
                <th scope="col">Asset Ref</th>
                <th scope="col" className="col-hide-sm">Type</th>
                <th scope="col" className="col-hide-xs">User</th>
                <th scope="col" className="col-hide-md">Department</th>
                <th scope="col" className="col-hide-xs">Next Clean Due</th>
                <th scope="col">Status</th>
                <th scope="col" className="table__actions-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {needsAttention.map((asset) => (
                <tr key={asset.id}>
                  <td className="cell-strong">{asset.asset_ref}</td>
                  <td className="col-hide-sm">{asset.device_type}</td>
                  <td className="col-hide-xs">
                    {asset.owner_name ?? <span className="cell-unassigned">Unassigned</span>}
                  </td>
                  <td className="col-hide-md">{asset.department}</td>
                  <td className="col-hide-xs">
                    {asset.status === STATUS.NEVER_CLEANED ? (
                      <span className="cell-muted">No clean recorded</span>
                    ) : (
                      <>
                        {formatDate(asset.next_clean_due)}{' '}
                        <span className="cell-muted">({describeDayOffset(asset.daysUntilDue)})</span>
                      </>
                    )}
                  </td>
                  <td><StatusBadge status={asset.status} /></td>
                  <td className="table__actions">
                    <button type="button" className="btn btn--small btn--brand-light" onClick={() => onRecordClean(asset)}>
                      Record clean
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
