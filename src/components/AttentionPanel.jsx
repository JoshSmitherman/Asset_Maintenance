import { ATTENTION_STATUSES, STATUS } from '../lib/constants';
import { describeDayOffset, formatDate } from '../lib/dates';
import { sortByUrgency } from '../lib/assetQueries';
import StatusBadge from './StatusBadge';

export default function AttentionPanel({ assets, onRecordClean }) {
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
        <span className={`pill${pillTone ? ` ${pillTone}` : ''}`}>{needsAttention.length}</span>
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
                <th scope="col">Type</th>
                <th scope="col">User</th>
                <th scope="col" className="col-hide-md">Department</th>
                <th scope="col">Next Clean Due</th>
                <th scope="col">Status</th>
                <th scope="col" className="table__actions-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {needsAttention.map((asset) => (
                <tr key={asset.id}>
                  <td className="cell-strong">{asset.asset_ref}</td>
                  <td>{asset.device_type}</td>
                  <td>{asset.owner_name}</td>
                  <td className="col-hide-md">{asset.department}</td>
                  <td>
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
