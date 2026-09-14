import { useMemo, useState } from 'react';
import Pagination from './Pagination';
import { usePagination } from '../hooks/usePagination';
import { formatDate } from '../lib/dates';

/**
 * Every clean ever recorded, newest first.
 *
 * The register only holds each asset's most recent clean; this is the log
 * behind it, so "what did we do last month" is answerable. Exporting it is
 * the Reports page's job, as it is for everything else.
 */
export default function CleaningHistory({ entries, loading, error, pageSize, onPageSizeChange }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        String(entry.asset_ref).toLowerCase().includes(needle) ||
        String(entry.cleaned_by).toLowerCase().includes(needle)
    );
  }, [entries, search]);

  const pager = usePagination(filtered, pageSize, onPageSizeChange);

  if (error) {
    return (
      <div className="alert alert--error" role="alert">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__row">
          <div className="toolbar__search">
            <label className="sr-only" htmlFor="history-search">Search the cleaning history</label>
            <input
              id="history-search"
              className="input"
              type="search"
              placeholder="Search by asset ref or who cleaned it…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading the cleaning history…</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {entries.length === 0
            ? 'No cleans recorded yet. Every clean from now on is logged here.'
            : 'No cleans match that search.'}
        </p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Asset Ref</th>
                  <th scope="col">Date of clean</th>
                  <th scope="col">Cleaned by</th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((entry) => (
                  <tr key={entry.id}>
                    <td className="cell-strong">{entry.asset_ref}</td>
                    <td>{formatDate(entry.cleaned_on)}</td>
                    <td>{entry.cleaned_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pager} label="the cleaning history" />
        </>
      )}
    </>
  );
}
