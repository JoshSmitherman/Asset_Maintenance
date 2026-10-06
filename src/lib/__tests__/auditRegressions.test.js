// Regression tests for the bugs found in the October 2026 audit. Each one
// failed before its fix; keep them so none comes back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chunk, fetchAll } from '../fetchAll';
import { csvFilename, toCsv } from '../csv';
import { isValidIsoDate } from '../dates';
import { parseCost } from '../repairs';
import { ageInYears, reportById } from '../reports';
import { sortAssets } from '../assetQueries';
import { buildTimeline } from '../assetHistory';
import { nextAssetRef } from '../assetLinks';
import { describeDatabaseError } from '../errors';
import { STATUS } from '../constants';

/** A pretend Supabase query that serves `total` rows a page at a time. */
function pagedSource(total, { failOnPage = null } = {}) {
  const calls = [];
  const build = () => ({
    range(from, to) {
      calls.push([from, to]);
      if (failOnPage !== null && calls.length - 1 === failOnPage) {
        return Promise.resolve({ data: null, error: { message: 'boom' } });
      }
      const rows = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({ id: from + i }));
      return Promise.resolve({ data: rows, error: null });
    }
  });
  return { build, calls };
}

describe('reading more than Supabase sends in one go', () => {
  it('reads every row, a page at a time', async () => {
    const { build, calls } = pagedSource(2500);
    const rows = await fetchAll(build);
    expect(rows).toHaveLength(2500);
    expect(rows[2499].id).toBe(2499);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('stops after one request when everything fits', async () => {
    const { build, calls } = pagedSource(12);
    expect(await fetchAll(build)).toHaveLength(12);
    expect(calls).toHaveLength(1);
  });

  it('fails loudly rather than returning part of the register', async () => {
    const { build } = pagedSource(2500, { failOnPage: 1 });
    await expect(fetchAll(build)).rejects.toEqual({ message: 'boom' });
  });

  it('splits long lists for writes', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 200)).toEqual([]);
  });
});

describe('CSV export', () => {
  const columns = [{ key: 'label', label: 'Label' }, { key: 'days', label: 'Days' }];

  it('keeps real numbers as numbers, negative ones included', () => {
    expect(toCsv(columns, [{ label: 'x', days: -12 }])).toBe('Label,Days\r\nx,-12');
  });

  it('still defuses text that a spreadsheet would run as a formula', () => {
    expect(toCsv(columns, [{ label: '-2+3', days: 1 }])).toBe("Label,Days\r\n'-2+3,1");
    expect(toCsv(columns, [{ label: '=HYPERLINK("x")', days: 1 }])).toContain(`"'=HYPERLINK(""x"")"`);
  });

  describe('file name date', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('uses the local date, not UTC, just after midnight', () => {
      // 00:30 on 7 Oct in a UTC+ timezone is still 6 Oct in UTC; the local
      // date is the one people expect. Built from local parts so the test
      // holds in any timezone.
      vi.setSystemTime(new Date(2026, 9, 7, 0, 30));
      expect(csvFilename('register')).toBe('register-2026-10-07.csv');
    });
  });
});

describe('dates and money as typed', () => {
  it('refuses dates that do not exist', () => {
    expect(isValidIsoDate('2026-02-31')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-1-5')).toBe(false);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-10-06')).toBe(true);
  });

  it('reads costs the way people type them, and refuses ambiguous ones', () => {
    expect(parseCost('45')).toBe(45);
    expect(parseCost('£45.50')).toBe(45.5);
    expect(parseCost('1,250.00')).toBe(1250);
    expect(parseCost('1,5')).toBeNull();
    expect(parseCost('0x10')).toBeNull();
    expect(parseCost('1e3')).toBeNull();
    expect(parseCost('12.345')).toBeNull();
    expect(parseCost('-5')).toBe(-5); // so the form can say "cannot be negative"
  });

  it('counts kit as two years old on its second anniversary', () => {
    expect(ageInYears('2024-10-06', new Date(2026, 9, 6))).toBe(2);
    expect(ageInYears('2024-10-07', new Date(2026, 9, 6))).toBeLessThan(2);
    expect(ageInYears('2024-02-29', new Date(2026, 1, 28))).toBeLessThan(2);
  });
});

describe('sorting', () => {
  const rows = [
    { asset_ref: 'A', purchase_cost: 10, next_clean_due: '2026-01-01' },
    { asset_ref: 'B', purchase_cost: null, next_clean_due: null },
    { asset_ref: 'C', purchase_cost: 99, next_clean_due: '2026-06-01' }
  ];

  it('keeps blank costs last whichever way the column is sorted', () => {
    expect(sortAssets(rows, { key: 'purchase_cost', direction: 'asc' }).map((r) => r.asset_ref)).toEqual(['A', 'C', 'B']);
    expect(sortAssets(rows, { key: 'purchase_cost', direction: 'desc' }).map((r) => r.asset_ref)).toEqual(['C', 'A', 'B']);
  });

  it('still puts never-cleaned first when sorting by due date', () => {
    expect(sortAssets(rows, { key: 'next_clean_due', direction: 'asc' })[0].asset_ref).toBe('B');
  });
});

describe('reports', () => {
  it('"Cleaning due this month" leaves out kit that is never cleaned', () => {
    const report = reportById('due_this_month');
    const assets = [
      { id: '1', asset_ref: 'LAP-1', device_type: 'Laptop', next_clean_due: '2000-01-01', status: STATUS.OVERDUE },
      { id: '2', asset_ref: 'MON-1', device_type: 'Monitor', next_clean_due: '2000-01-01', status: STATUS.NOT_TRACKED },
      { id: '3', asset_ref: 'PH-1', device_type: 'Phone', next_clean_due: '2000-01-01', status: STATUS.NOT_TRACKED }
    ];
    const built = report.build({ assets, retiredAssets: [], repairs: [], log: [] });
    expect(built.rows.map((row) => row.asset_ref)).toEqual(['LAP-1']);
  });
});

describe('history', () => {
  it('describes retirements, restores, edits and repairs in plain words', () => {
    const timeline = buildTimeline({ asset_ref: 'LAP-1' }, [
      { id: 1, event_type: 'retired', details: { reason: 'Beyond repair', data_wiped: true, data_wiped_by: 'al@adaro.net' }, happened_at: '2026-01-01T10:00:00Z' },
      { id: 2, event_type: 'restored', happened_at: '2026-01-02T10:00:00Z' },
      { id: 3, event_type: 'edited', details: { fields: { purchase_cost: { from: 1, to: 2 }, spec_ram: { from: null, to: '16GB' } } }, happened_at: '2026-01-03T10:00:00Z' },
      { id: 4, event_type: 'repair_added', details: { fault: 'Battery', total_cost: 45, repaired_on: '2026-01-04', fixed_by: 'al@adaro.net' }, happened_at: '2026-01-04T10:00:00Z' }
    ]);
    const titles = timeline.map((entry) => entry.title);
    expect(titles).toContain('Retired: Beyond repair');
    expect(titles).toContain('Brought back into use');
    expect(titles).toContain('Details edited');
    expect(titles).toContain('Repair logged: Battery');
    expect(timeline.find((entry) => entry.title === 'Details edited').detail).toBe('Changed: purchase cost, ram');
    expect(timeline.find((entry) => entry.title.startsWith('Retired')).detail).toMatch(/data wiped by al@adaro.net/i);
  });
});

describe('the next free asset reference', () => {
  it('follows the main series, keeping its padding', () => {
    expect(nextAssetRef([{ asset_ref: 'AST-0221' }, { asset_ref: 'AST-0222' }, { asset_ref: 'LAP-9' }])).toBe('AST-0223');
  });
  it('skips a number already used', () => {
    expect(nextAssetRef([{ asset_ref: 'AST-0009' }, { asset_ref: 'AST-0010' }, { asset_ref: 'ast-0011' }])).toBe('AST-0012');
  });
  it('has nothing to suggest for an empty register', () => {
    expect(nextAssetRef([])).toBeNull();
  });
});

describe('database errors people can act on', () => {
  it('names the right problem for each kind of failure', () => {
    expect(describeDatabaseError({ code: '23505', message: 'duplicate key value violates unique constraint "assets_asset_ref_unique_idx"' }, { assetRef: 'AST-1' }))
      .toMatch(/AST-1.*already on the register/);
    expect(describeDatabaseError({ code: '23505', message: 'duplicate key value violates unique constraint "attachments_path_unique"' }))
      .not.toMatch(/asset ref/i);
    expect(describeDatabaseError({ code: '22003', message: 'numeric field overflow' })).toMatch(/too large/i);
    expect(describeDatabaseError({ message: 'new row violates check constraint "assets_device_type_valid"' }))
      .toBe('Choose a Device Type from the list.');
    expect(describeDatabaseError({ code: 'P0001', message: 'The repair date cannot be in the future (2026-10-07).' }))
      .toBe('The repair date cannot be in the future.');
    expect(describeDatabaseError({ message: 'TypeError: Failed to fetch' })).toMatch(/internet connection/i);
    expect(describeDatabaseError({ code: 'XX000', message: 'internal_error { detail }' })).toMatch(/having trouble/i);
  });
});
