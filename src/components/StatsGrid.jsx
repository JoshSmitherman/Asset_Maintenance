import { formatCurrency, OTHER_KIT_FILTER, STATUS } from '../lib/constants';

const money = (value) => formatCurrency(value) ?? '£0.00';

const KIT_CARDS = [
  { key: 'Laptop', label: 'Laptops', filter: 'Laptop' },
  { key: 'Desktop', label: 'Desktops', filter: 'Desktop' },
  { key: 'Monitor', label: 'Monitors', filter: 'Monitor' },
  {
    key: 'other',
    label: 'Peripherals & other',
    filter: OTHER_KIT_FILTER,
    hint: 'Phones, cameras, docks, printers and anything else'
  }
];

const CLEANING_CARDS = [
  { key: STATUS.OVERDUE, label: 'Overdue', tone: 'overdue' },
  { key: STATUS.DUE_SOON, label: 'Due soon (30 days)', tone: 'due-soon' },
  { key: STATUS.NEVER_CLEANED, label: 'Never cleaned', tone: 'never' },
  { key: STATUS.OK, label: 'OK', tone: 'ok' }
];

/**
 * The dashboard's headline numbers, in two labelled rows: what we own, and
 * where the cleaning stands. Every card but the total value is a shortcut to
 * the matching list.
 */
export default function StatsGrid({ summary, kit, totalValue, otherBreakdown = '', onSelectType, onSelectStatus }) {
  const trackedTotal = CLEANING_CARDS.reduce((sum, card) => sum + (summary[card.key] ?? 0), 0);

  return (
    <div className="stat-groups">
      <section className="stat-group" aria-labelledby="stat-group-assets">
        <h2 className="stat-group__title" id="stat-group-assets">Assets</h2>
        <div className="stat-grid stat-grid--assets">
          <div className="stat stat--value">
            <span className="stat__value stat__value--currency">{money(totalValue)}</span>
            <span className="stat__label">Total value</span>
          </div>
          <button type="button" className="stat stat--neutral" onClick={() => onSelectType('all')}>
            <span className="stat__value">{summary.total ?? 0}</span>
            <span className="stat__label">Total assets</span>
          </button>
          {KIT_CARDS.map((card) => (
            <button
              key={card.key}
              type="button"
              className="stat stat--kit"
              onClick={() => onSelectType(card.filter)}
              // Hover the "other" card to see what is in it.
              title={card.key === 'other' && otherBreakdown ? otherBreakdown : card.hint}
            >
              <span className="stat__value">{kit[card.key]?.count ?? 0}</span>
              <span className="stat__label">{card.label}</span>
              <span className="stat__meta">{money(kit[card.key]?.value)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="stat-group" aria-labelledby="stat-group-cleaning">
        <h2 className="stat-group__title" id="stat-group-cleaning">
          Cleaning <span className="stat-group__note">{trackedTotal} laptops and desktops</span>
        </h2>
        <div className="stat-grid stat-grid--cleaning">
          {CLEANING_CARDS.map((card) => {
            const count = summary[card.key] ?? 0;
            return (
              <button
                key={card.key}
                type="button"
                className={`stat stat--${card.tone}`}
                onClick={() => onSelectStatus(card.key)}
              >
                <span className="stat__value">{count}</span>
                <span className="stat__label">{card.label}</span>
                <span className="stat__meta">
                  {trackedTotal ? `${Math.round((count / trackedTotal) * 100)}% of the rota` : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
