import { describe, it, expect, afterEach, vi } from 'vitest';
import { REPORTS, ageInYears, reportById } from '../reports';
import { STATUS } from '../../lib/constants';

/** Cleaning dates, kept separate so the register above stays readable. */
const dueAssets = [
  // Overdue from last month: still needs doing, so still on the list.
  { asset_ref: 'LAP-OLD', device_type: 'Laptop', owner_name: 'Ann', department: 'IT', next_clean_due: '2026-08-14', status: STATUS.OVERDUE },
  // Due inside the current month.
  { asset_ref: 'LAP-NOW', device_type: 'Laptop', owner_name: null, department: 'IT', next_clean_due: '2026-09-30', status: STATUS.DUE_SOON },
  // Due next month: not this month's problem.
  { asset_ref: 'LAP-NEXT', device_type: 'Laptop', owner_name: 'Bo', department: 'IT', next_clean_due: '2026-10-01', status: STATUS.OK },
  // Never cleaned, so it has no due date at all.
  { asset_ref: 'LAP-NEVER', device_type: 'Laptop', owner_name: 'Cy', department: 'IT', next_clean_due: null, status: STATUS.NEVER_CLEANED }
];

const assets = [
  { asset_ref: 'LAP-1', device_type: 'Laptop', owner_name: 'Ann', department: 'IT', location: 'Office', purchase_cost: 1000, purchase_date: '2020-01-01', status: STATUS.OVERDUE, date_cleaned: '2026-01-01' },
  { asset_ref: 'LAP-2', device_type: 'Laptop', owner_name: 'Bo', department: 'IT', location: null, purchase_cost: 500, purchase_date: '2026-01-01', status: STATUS.OK, date_cleaned: null },
  { asset_ref: 'MON-1', device_type: 'Monitor', owner_name: 'Cy', department: 'Finance', location: 'Office', purchase_cost: null, purchase_date: null, status: STATUS.NOT_TRACKED, date_cleaned: null }
];

const log = [
  { asset_ref: 'LAP-1', cleaned_on: '2026-09-02', cleaned_by: 'JS' },
  { asset_ref: 'LAP-2', cleaned_on: '2026-09-20', cleaned_by: 'JS' },
  { asset_ref: 'LAP-1', cleaned_on: '2026-08-11', cleaned_by: 'AL' }
];

const build = (id) => reportById(id).build({ assets, log });

describe('grouping reports', () => {
  it('counts and totals by department, biggest first', () => {
    const { rows } = build('department');
    expect(rows[0]).toMatchObject({ label: 'IT', count: 2, value: 1500, overdue: 1 });
    expect(rows[1]).toMatchObject({ label: 'Finance', count: 1, value: 0 });
  });

  it('calls a missing location what it is rather than dropping the asset', () => {
    const { rows } = build('location');
    const labels = rows.map((row) => row.label);
    expect(labels).toContain('Not recorded');
    expect(rows.reduce((total, row) => total + row.count, 0)).toBe(assets.length);
  });
});

describe('fleet age profile', () => {
  it('measures whole years from the purchase date', () => {
    expect(ageInYears(null)).toBeNull();
    expect(ageInYears('2020-01-01', new Date('2026-01-01T00:00:00Z'))).toBeCloseTo(6, 1);
  });

  it('bands the fleet and keeps assets with no purchase date separate', () => {
    const { rows } = build('age');
    const noDate = rows.find((row) => row.label === 'No purchase date');
    expect(noDate.count).toBe(1);
    expect(rows.reduce((total, row) => total + row.count, 0)).toBe(assets.length);
  });
});

describe('cleaning reports', () => {
  it('counts cleans by month, newest month first', () => {
    const { rows } = build('cleaning_month');
    expect(rows.map((row) => row.label)).toEqual(['2026-09', '2026-08']);
    expect(rows[0].count).toBe(2);
  });

  it('counts cleans by person with their most recent', () => {
    const { rows } = build('cleaning_person');
    expect(rows[0]).toMatchObject({ label: 'JS', count: 2, last: '2026-09-20' });
  });

  it('lists laptops and desktops with no clean at all', () => {
    const { rows } = build('never_cleaned');
    expect(rows.map((row) => row.asset_ref)).toEqual(['LAP-2']);
  });
});

describe('cleaning due this month', () => {
  afterEach(() => vi.useRealTimers());

  const dueRows = (today) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(today));
    return reportById('due_this_month').build({ assets: dueAssets, log }).rows;
  };

  it('lists what is due by the end of this month, soonest first', () => {
    expect(dueRows('2026-09-14T09:00:00').map((row) => row.asset_ref)).toEqual(['LAP-OLD', 'LAP-NOW']);
  });

  it('keeps carrying an overdue asset forward until it is cleaned', () => {
    // Two months later and still not done: still listed.
    expect(dueRows('2026-11-02T09:00:00').map((row) => row.asset_ref)).toContain('LAP-OLD');
  });

  it('leaves out anything never cleaned - that has its own report', () => {
    expect(dueRows('2026-09-14T09:00:00').map((row) => row.asset_ref)).not.toContain('LAP-NEVER');
  });

  it('names an unassigned asset rather than leaving the cell blank', () => {
    const columns = reportById('due_this_month').build({ assets: dueAssets, log }).columns;
    const user = columns.find((column) => column.key === 'owner_name');
    expect(user.format({ owner_name: null })).toBe('Unassigned');
  });
});

describe('full-list reports', () => {
  it('exports the whole register, by reference', () => {
    const { rows } = build('full_register');
    expect(rows.map((row) => row.asset_ref)).toEqual(['LAP-1', 'LAP-2', 'MON-1']);
  });

  it('exports only what nobody holds', () => {
    const withSpare = [...assets, { asset_ref: 'LAP-9', owner_name: null, device_type: 'Laptop', department: 'IT' }];
    const { rows } = reportById('unassigned').build({ assets: withSpare, log });
    expect(rows.map((row) => row.asset_ref)).toEqual(['LAP-9']);
  });

  it('exports the cleaning queue as laptops and desktops only', () => {
    const { rows } = build('cleaning_queue');
    expect(rows.map((row) => row.asset_ref)).toEqual(['LAP-1', 'LAP-2']);
  });

  it('exports every clean in the log', () => {
    const { rows } = build('cleaning_log');
    expect(rows).toHaveLength(log.length);
  });
});

describe('reportById', () => {
  it('falls back to the first report for an unknown id', () => {
    expect(reportById('nonsense')).toBe(REPORTS[0]);
  });
});
