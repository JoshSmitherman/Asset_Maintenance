import { deviceTypeLabel, STATUS } from '../lib/constants';
import { countBy, purchasesByMonth, statusBreakdown } from '../lib/dashboardStats';
import { formatCurrency } from '../lib/constants';
import { formatMonth } from '../lib/dates';

// Validated for colour-vision separation and contrast before use - the
// "Never Cleaned" purple is the ADARO brand purple.
const STATUS_COLOUR = {
  [STATUS.OVERDUE]: 'var(--chart-overdue)',
  [STATUS.NEVER_CLEANED]: 'var(--chart-never)',
  [STATUS.DUE_SOON]: 'var(--chart-due-soon)',
  [STATUS.OK]: 'var(--chart-ok)'
};

function StatusComposition({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="chart__empty">No laptops or desktops in the register yet.</p>;
  }

  const summaryText = data
    .filter((item) => item.value > 0)
    .map((item) => `${item.label}: ${item.value}`)
    .join(', ');

  return (
    <>
      <div className="stackbar" role="img" aria-label={`Cleaning status of ${total} computers. ${summaryText}.`}>
        {data
          .filter((item) => item.value > 0)
          .map((item) => (
            <div
              key={item.label}
              className="stackbar__segment"
              style={{ width: `${(item.value / total) * 100}%`, background: STATUS_COLOUR[item.label] }}
              title={`${item.label}: ${item.value}`}
            />
          ))}
      </div>

      <ul className="chart-legend">
        {data.map((item) => (
          <li key={item.label} className="chart-legend__item">
            <span className="chart-legend__swatch" style={{ background: STATUS_COLOUR[item.label] }} aria-hidden="true" />
            <span className="chart-legend__label">{item.label}</span>
            <span className="chart-legend__value">{item.value}</span>
            <span className="chart-legend__percent">
              {total ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function BarList({ data, colour, emptyMessage }) {
  if (data.length === 0) return <p className="chart__empty">{emptyMessage}</p>;

  const max = Math.max(...data.map((item) => item.value));

  return (
    <ul className="barlist">
      {data.map((item) => (
        <li key={item.label} className="barlist__row">
          <span className="barlist__label" title={item.label}>{item.label}</span>
          <span className="barlist__track">
            <span
              className="barlist__bar"
              style={{ width: `${max ? Math.max((item.value / max) * 100, 2) : 0}%`, background: colour }}
            />
          </span>
          <span className="barlist__value">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

const shortMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' });

/**
 * What was bought in each of the last twelve months: one bar per month, one
 * colour, as tall as the number of assets bought. Hover or focus a month for
 * its count and spend; the Bought by month report has the full table.
 */
function PurchasesChart({ data }) {
  const totalCount = data.reduce((sum, row) => sum + row.count, 0);
  const totalValue = data.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(1, ...data.map((row) => row.count));

  if (totalCount === 0) {
    return <p className="chart__empty">Nothing with a purchase date in the last 12 months.</p>;
  }

  return (
    <>
      <p className="purchases__summary">
        <strong>{totalCount}</strong> {totalCount === 1 ? 'asset' : 'assets'} bought, costing{' '}
        <strong>{formatCurrency(totalValue) ?? '£0.00'}</strong>
      </p>
      <ol className="purchases" aria-label="Assets bought per month, last 12 months">
        {data.map((row) => {
          const label = `${formatMonth(row.month)}: ${row.count} ${row.count === 1 ? 'asset' : 'assets'}, ${formatCurrency(row.value) ?? '£0.00'}`;
          return (
            <li key={row.month} className="purchases__month" tabIndex={0} aria-label={label}>
              <span className="purchases__tip" aria-hidden="true">
                <strong>{formatMonth(row.month)}</strong>
                <span>{row.count} bought · {formatCurrency(row.value) ?? '£0.00'}</span>
              </span>
              <span className="purchases__count" aria-hidden="true">{row.count > 0 ? row.count : ''}</span>
              <span className="purchases__track" aria-hidden="true">
                {row.count > 0 ? (
                  <span className="purchases__bar" style={{ height: `${(row.count / max) * 100}%` }} />
                ) : null}
              </span>
              <span className="purchases__label" aria-hidden="true">
                {shortMonth.format(new Date(`${row.month}-01T12:00:00`))}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default function Dashboard({ assets }) {
  const status = statusBreakdown(assets);
  const byType = countBy(assets, (asset) => deviceTypeLabel(asset.device_type));
  const byLocation = countBy(assets, (asset) => asset.location);
  const trackedTotal = status.reduce((sum, item) => sum + item.value, 0);
  const purchases = purchasesByMonth(assets);

  return (
    <section className="dashboard" aria-label="Dashboard">
      <div className="card chart-card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Cleaning status</h2>
            <p className="card__subtitle">
              {trackedTotal} {trackedTotal === 1 ? 'machine' : 'machines'} on the cleaning rota - laptops
              (and desktops recorded before). Phones, monitors and cameras are not cleaned on a rota.
            </p>
          </div>
        </div>
        <div className="chart-card__body">
          <StatusComposition data={status} />
        </div>
      </div>

      <div className="card chart-card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Assets by type</h2>
            <p className="card__subtitle">Every device in the register.</p>
          </div>
        </div>
        <div className="chart-card__body">
          <BarList data={byType} colour="var(--chart-navy)" emptyMessage="No assets yet." />
        </div>
      </div>

      <div className="card chart-card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Assets by location</h2>
            <p className="card__subtitle">Where the hardware lives.</p>
          </div>
        </div>
        <div className="chart-card__body">
          <BarList data={byLocation} colour="var(--chart-purple)" emptyMessage="No assets yet." />
        </div>
      </div>

      <div className="card chart-card dashboard__wide">
        <div className="card__header">
          <div>
            <h2 className="card__title">Bought in the last 12 months</h2>
            <p className="card__subtitle">Assets by purchase month. The full history is under Reports, Spend.</p>
          </div>
        </div>
        <div className="chart-card__body">
          <PurchasesChart data={purchases} />
        </div>
      </div>

    </section>
  );
}
