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

/** A real calendar date in YYYY-MM-DD form: 2026-02-31 and 2026-13-01 are not. */
export function isValidIsoDate(iso) {
  const text = String(iso ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = parseIsoDate(text);
  // JS rolls 31 Feb over to 3 Mar rather than failing; a round trip catches it.
  return date !== null && toIsoDate(date) === text;
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

/**
 * First and last day of the month containing `iso`, as plain date strings.
 * Both ends are inclusive, so "due by the end of this month" is a simple
 * string comparison against `end`.
 */
export function monthBoundsIso(iso) {
  const date = parseIsoDate(iso);
  if (!date) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  // Day 0 of the next month is the last day of this one, leap years included.
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toIsoDate(start), end: toIsoDate(end) };
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

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

/** "2026-09" as "September 2026", for the cleaning reports. */
export function formatMonth(yearMonth) {
  const date = parseIsoDate(`${yearMonth}-01`);
  return date ? monthFormatter.format(date) : '—';
}

const longDateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** "2026-09-17" as "17 September 2026", for release notes. */
export function formatLongDate(iso) {
  const date = parseIsoDate(iso);
  return date ? longDateFormatter.format(date) : '—';
}
