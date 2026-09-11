import { formatCurrency, STATUS } from '../lib/constants';

const CARDS = [
  { key: 'total', label: 'Total assets', tone: 'neutral', filterValue: 'all' },
  { key: STATUS.OVERDUE, label: 'Overdue', tone: 'overdue', filterValue: STATUS.OVERDUE },
  { key: STATUS.DUE_SOON, label: 'Due soon (30 days)', tone: 'due-soon', filterValue: STATUS.DUE_SOON },
  { key: STATUS.NEVER_CLEANED, label: 'Never cleaned', tone: 'never', filterValue: STATUS.NEVER_CLEANED },
  { key: STATUS.OK, label: 'OK', tone: 'ok', filterValue: STATUS.OK }
];

export default function StatsGrid({ summary, activeStatus, onSelectStatus, totalValue }) {
  return (
    <section className="stat-grid" aria-label="Fleet summary">
      {CARDS.map((card) => {
        const isActive = activeStatus === card.filterValue;
        return (
          <button
            key={card.key}
            type="button"
            className={`stat stat--${card.tone}${isActive ? ' stat--active' : ''}`}
            onClick={() => onSelectStatus(card.filterValue)}
            aria-pressed={isActive}
          >
            <span className="stat__value">{summary[card.key] ?? 0}</span>
            <span className="stat__label">{card.label}</span>
          </button>
        );
      })}

      {totalValue === undefined ? null : (
        <div className="stat stat--value">
          <span className="stat__value stat__value--currency">
            {formatCurrency(totalValue) ?? '£0.00'}
          </span>
          <span className="stat__label">Total value</span>
        </div>
      )}
    </section>
  );
}
