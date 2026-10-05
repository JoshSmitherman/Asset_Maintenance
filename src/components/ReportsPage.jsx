import { useMemo, useState } from 'react';
import { REPORT_MENU, REPORT_MENU_ITEMS, reportById } from '../lib/reports';
import { exportCsv } from '../lib/csv';

/**
 * Summaries of what the register already holds, in three groups - assets,
 * cleaning, and full exports - picked from a menu down the side (a grouped
 * dropdown on a phone). Reports that are one table cut different ways share
 * a single menu item with a switch between views. Every report is a table,
 * and every table exports to CSV.
 */
export default function ReportsPage({ assets, log, logLoading, logError }) {
  const [itemId, setItemId] = useState(REPORT_MENU_ITEMS[0].id);
  // The view chosen for each item, so switching away and back keeps it.
  const [viewByItem, setViewByItem] = useState({});

  const item = REPORT_MENU_ITEMS.find((entry) => entry.id === itemId) ?? REPORT_MENU_ITEMS[0];
  const viewId = viewByItem[item.id] ?? item.views[0].reportId;
  const report = reportById(viewId);
  const { columns, rows } = useMemo(() => report.build({ assets, log }), [report, assets, log]);

  const waitingForLog = report.needsLog && logLoading;

  return (
    <div className="reports">
      <nav className="reports__menu" aria-label="Reports">
        {REPORT_MENU.map((group) => (
          <div key={group.category} className="reports__group">
            <h2 className="reports__group-title">{group.category}</h2>
            <p className="reports__group-blurb">{group.blurb}</p>
            <ul className="reports__items">
              {group.items.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`reports__item${entry.id === item.id ? ' reports__item--active' : ''}`}
                    aria-current={entry.id === item.id ? 'page' : undefined}
                    onClick={() => setItemId(entry.id)}
                  >
                    <span className="reports__item-label">{entry.label}</span>
                    <span className="reports__item-summary">{entry.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <section className="card reports__body">
        <div className="card__header">
          <div>
            <p className="reports__eyebrow">{item.category}</p>
            <h2 className="card__title">{item.label}</h2>
            <p className="card__subtitle">{report.description}</p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => exportCsv(`report-${report.id}`, columns, rows)}
            disabled={rows.length === 0}
          >
            Export CSV
          </button>
        </div>

        <div className="toolbar">
          <div className="toolbar__row">
            {/* On a phone the side menu is hidden and this takes its place. */}
            <div className="field field--inline reports__picker">
              <label className="field__label" htmlFor="report-type">Report</label>
              <select
                id="report-type"
                className="select"
                value={item.id}
                onChange={(event) => setItemId(event.target.value)}
              >
                {REPORT_MENU.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.items.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {item.views.length > 1 ? (
              <div className="reports__views" role="group" aria-label={item.viewLabel}>
                <span className="field__label">{item.viewLabel}</span>
                <div className="segmented">
                  {item.views.map((view) => (
                    <button
                      key={view.reportId}
                      type="button"
                      className={`segmented__option${view.reportId === viewId ? ' segmented__option--active' : ''}`}
                      aria-pressed={view.reportId === viewId}
                      onClick={() => setViewByItem((current) => ({ ...current, [item.id]: view.reportId }))}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <span className="toolbar__meta cell-muted">
              {rows.length} row{rows.length === 1 ? '' : 's'} · {assets.length} assets in the register
            </span>
          </div>
        </div>

        {report.needsLog && logError ? (
          <div className="alert alert--error" role="alert"><span>{logError}</span></div>
        ) : waitingForLog ? (
          <p className="empty-state">Loading the cleaning history…</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">Nothing to report on yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  {columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? row.label ?? index}>
                    {columns.map((column, cell) => (
                      <td key={column.key} className={cell === 0 ? 'cell-strong' : undefined}>
                        {column.format ? column.format(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
