import { describe, it, expect } from 'vitest';
import { REPORTS, ageInYears, reportById } from '../reports';
import { STATUS } from '../../lib/constants';

const assets = [
  { asset_ref: 'LAP-1', device_type: 'Laptop', department: 'IT', location: 'Office', purchase_cost: 1000, purchase_date: '2020-01-01', status: STATUS.OVERDUE, date_cleaned: '2026-01-01' },
  { asset_ref: 'LAP-2', device_type: 'Laptop', department: 'IT', location: null, purchase_cost: 500, purchase_date: '2026-01-01', status: STATUS.OK, date_cleaned: null },
  { asset_ref: 'MON-1', device_type: 'Monitor', department: 'Finance', location: 'Office', purchase_cost: null, purchase_date: null, status: STATUS.NOT_TRACKED, date_cleaned: null }
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

describe('reportById', () => {
  it('falls back to the first report for an unknown id', () => {
    expect(reportById('nonsense')).toBe(REPORTS[0]);
  });
});
