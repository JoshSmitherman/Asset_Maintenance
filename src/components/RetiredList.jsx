import { useState } from 'react';
import Pagination from './Pagination';
import { usePagination } from '../hooks/usePagination';
import { formatDate } from '../lib/dates';

/**
 * Kit that has been retired: out of every other list, but kept, so there is
 * always an answer to "what happened to LAP-0042?". Folded away by default -
 * it is looked up now and then, not worked from.
 */
export default function RetiredList({ assets, onViewDetails, pageSize, onPageSizeChange }) {
  const [open, setOpen] = useState(false);
  const sorted = [...assets].sort((a, b) => String(b.retired_on).localeCompare(String(a.retired_on)));
  const pager = usePagination(sorted, pageSize, onPageSizeChange);

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Retired</h2>
          <p className="card__subtitle">
            End-of-life kit, kept on record with why it went and whether its data was wiped.
          </p>
        </div>
        <div className="card__header-actions">
          <span className="pill">{assets.length}</span>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="retired-list"
          >
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {open ? (
        <div id="retired-list">
          {assets.length === 0 ? (
            <p className="empty-state">Nothing retired in this view.</p>
          ) : (
            <>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Asset Ref</th>
                      <th scope="col" className="col-hide-xs">Type</th>
                      <th scope="col" className="col-hide-sm">Last user</th>
                      <th scope="col">Retired</th>
                      <th scope="col" className="col-hide-xs">Reason</th>
                      <th scope="col" className="col-hide-sm">Data wiped</th>
                      <th scope="col" className="table__actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pager.pageItems.map((asset) => (
                      <tr key={asset.id}>
                        <td className="cell-strong">{asset.asset_ref}</td>
                        <td className="col-hide-xs">{asset.device_type}</td>
                        <td className="col-hide-sm">
                          {asset.owner_name ?? <span className="cell-muted">—</span>}
                        </td>
                        <td>{formatDate(asset.retired_on)}</td>
                        <td className="col-hide-xs">{asset.retired_reason}</td>
                        <td className="col-hide-sm">
                          {asset.data_wiped ? 'Yes' : <span className="cell-muted">Not recorded</span>}
                        </td>
                        <td className="table__actions">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination {...pager} label="the retired list" />
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
