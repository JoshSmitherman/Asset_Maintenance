import { describe, it, expect } from 'vitest';
import {
  toIsoDate, parseIsoDate, isValidIsoDate, addMonthsIso, daysBetween,
  formatDate, describeDayOffset,
  monthBoundsIso
} from '../dates';

describe('addMonthsIso — month-end clamping (mirrors Postgres)', () => {
  it('clamps 31 Jan + 1 month to end of Feb', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
  });
  it('handles leap February', () => {
    expect(addMonthsIso('2024-01-31', 1)).toBe('2024-02-29');
  });
  it('adds the default 6-month cleaning interval', () => {
    expect(addMonthsIso('2026-03-15', 6)).toBe('2026-09-15');
  });
  it('crosses a year boundary', () => {
    expect(addMonthsIso('2025-11-30', 3)).toBe('2026-02-28');
  });
  it('returns null for invalid input', () => {
    expect(addMonthsIso('not-a-date', 6)).toBeNull();
  });
});

describe('daysBetween', () => {
  it('is negative when the target is in the past (overdue)', () => {
    expect(daysBetween('2026-09-13', '2026-09-01')).toBe(-12);
  });
  it('is positive for a future date', () => {
    expect(daysBetween('2026-09-13', '2026-09-21')).toBe(8);
  });
  it('is zero for the same day', () => {
    expect(daysBetween('2026-09-13', '2026-09-13')).toBe(0);
  });
  it('does not drift across a DST boundary (BST->GMT)', () => {
    // 25 Oct 2026 is the UK clock change; a naive UTC diff would give 91 or 89.
    expect(daysBetween('2026-09-13', '2026-12-13')).toBe(91);
  });
  it('returns null for bad input', () => {
    expect(daysBetween('2026-09-13', '')).toBeNull();
  });
});

describe('parseIsoDate / isValidIsoDate', () => {
  it('accepts a valid ISO date', () => {
    expect(isValidIsoDate('2026-09-13')).toBe(true);
  });
  it('rejects an empty string', () => {
    expect(isValidIsoDate('')).toBe(false);
  });
  it('tolerates a full timestamp by taking the date part', () => {
    expect(toIsoDate(parseIsoDate('2026-09-13T10:30:00Z'))).toBe('2026-09-13');
  });
});

describe('describeDayOffset', () => {
  it('reads naturally around today', () => {
    expect(describeDayOffset(0)).toBe('today');
    expect(describeDayOffset(1)).toBe('tomorrow');
    expect(describeDayOffset(-1)).toBe('yesterday');
    expect(describeDayOffset(8)).toBe('in 8 days');
    expect(describeDayOffset(-12)).toBe('12 days ago');
  });
});

describe('formatDate', () => {
  it('formats to en-GB and dashes on invalid', () => {
    expect(formatDate('2026-09-13')).toMatch(/^13 Sept? 2026$/);
    expect(formatDate(null)).toBe('—');
  });
});

describe('monthBoundsIso', () => {
  it('gives the first and last day of the month a date falls in', () => {
    expect(monthBoundsIso('2026-09-14')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(monthBoundsIso('2026-12-31')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('knows February', () => {
    expect(monthBoundsIso('2026-02-14').end).toBe('2026-02-28');
    expect(monthBoundsIso('2024-02-01').end).toBe('2024-02-29');
  });

  it('returns null for a date it cannot read', () => {
    expect(monthBoundsIso('')).toBeNull();
    expect(monthBoundsIso('not-a-date')).toBeNull();
  });
});
