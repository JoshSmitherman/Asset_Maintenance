// All asset dates are plain calendar dates ("YYYY-MM-DD") with no timezone,
// which is how Postgres `date` columns arrive over PostgREST. Everything here
// works on that string form to avoid UTC/BST off-by-one-day bugs.

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function parseIsoDate(iso) {
  if (!iso) return null;
  const [year, month, day] = String(iso).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidIsoDate(iso) {
  return parseIsoDate(iso) !== null;
}

/**
 * Add whole months, clamping to the end of the target month exactly the way
 * Postgres does (2026-01-31 + 1 month => 2026-02-28).
 */
export function addMonthsIso(iso, months) {
  const date = parseIsoDate(iso);
  if (!date) return null;
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDayOfTargetMonth));
  return toIsoDate(target);
}

/** Whole days from `fromIso` to `toIso` (negative when toIso is in the past). */
export function daysBetween(fromIso, toIso) {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

export function formatDate(iso) {
  const date = parseIsoDate(iso);
  return date ? dateFormatter.format(date) : '—';
}

export function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

/** "12 days ago" / "in 8 days" style helper for the attention list. */
export function describeDayOffset(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}
