import { useMemo, useState } from 'react';
import { REPORTS, reportById } from '../lib/reports';
import { exportCsv } from '../lib/csv';

/**
 * Summaries of what the register already holds. Every report is a table, and
 * every table exports to CSV, so anything here can be handed on as it is.
 */
export default function ReportsPage({ assets, log, logLoading, logError }) {
  const [reportId, setReportId] = useState(REPORTS[0].id);
  const report = reportById(reportId);
  const { columns, rows } = useMemo(
    () => report.build({ assets, log }),
    [report, assets, log]
  );

  const waitingForLog = report.needsLog && logLoading;

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Reports</h2>
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
          <div className="field field--inline field--wide">
            <label className="field__label" htmlFor="report-type">Report</label>
            <select
              id="report-type"
              className="select"
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
            >
              {REPORTS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
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
  );
}
