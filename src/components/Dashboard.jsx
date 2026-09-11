import { STATUS } from '../lib/constants';
import { countBy, statusBreakdown } from '../lib/dashboardStats';

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

export default function Dashboard({ assets }) {
  const status = statusBreakdown(assets);
  const byType = countBy(assets, (asset) => asset.device_type);
  const byLocation = countBy(assets, (asset) => asset.location);
  const trackedTotal = status.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="dashboard" aria-label="Dashboard">
      <div className="card chart-card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Cleaning status</h2>
            <p className="card__subtitle">
              {trackedTotal} {trackedTotal === 1 ? 'computer' : 'computers'} in the cleaning rota.
              Monitors and peripherals are excluded.
            </p>
          </div>
        </div>
        <StatusComposition data={status} />
      </div>

      <div className="card chart-card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Assets by type</h2>
            <p className="card__subtitle">Every device in the register.</p>
          </div>
        </div>
        <BarList data={byType} colour="var(--chart-navy)" emptyMessage="No assets yet." />
      </div>

      <div className="card chart-card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Assets by location</h2>
            <p className="card__subtitle">Where the hardware lives.</p>
          </div>
        </div>
        <BarList data={byLocation} colour="var(--chart-purple)" emptyMessage="No assets yet." />
      </div>

    </section>
  );
}
