import { describe, it, expect } from 'vitest';
import { filterAssets, sortAssets, sortByUrgency, uniqueDepartments, EMPTY_FILTERS } from '../assetQueries';
import { STATUS } from '../constants';

const rows = [
  { asset_ref: 'LAP-002', device_type: 'Laptop', owner_name: 'Bob', department: 'Finance', location: 'Office', cleaned_by: 'AL', notes: null, status: STATUS.OVERDUE, next_clean_due: '2026-01-01', daysUntilDue: -20 },
  { asset_ref: 'LAP-001', device_type: 'Laptop', owner_name: 'Alice', department: 'IT', location: null, cleaned_by: null, notes: 'spare unit', status: STATUS.NEVER_CLEANED, next_clean_due: null, daysUntilDue: null },
  { asset_ref: 'DSK-001', device_type: 'Desktop', owner_name: 'Carol', department: 'IT', location: 'Remote', cleaned_by: 'BB', notes: null, status: STATUS.OK, next_clean_due: '2027-05-01', daysUntilDue: 200 }
];

describe('filterAssets', () => {
  it('search matches across ref/owner/dept/notes case-insensitively', () => {
    expect(filterAssets(rows, { ...EMPTY_FILTERS, search: 'spare' }).map(r => r.asset_ref)).toEqual(['LAP-001']);
    expect(filterAssets(rows, { ...EMPTY_FILTERS, search: 'it' }).length).toBe(2); // department IT
  });
  it('filters by device type', () => {
    expect(filterAssets(rows, { ...EMPTY_FILTERS, deviceType: 'Desktop' }).map(r => r.asset_ref)).toEqual(['DSK-001']);
  });
  it('"unassigned" location matches rows with no location', () => {
    expect(filterAssets(rows, { ...EMPTY_FILTERS, location: 'unassigned' }).map(r => r.asset_ref)).toEqual(['LAP-001']);
  });
  it('filters by status', () => {
    expect(filterAssets(rows, { ...EMPTY_FILTERS, status: STATUS.OVERDUE }).map(r => r.asset_ref)).toEqual(['LAP-002']);
  });
});

describe('sorting', () => {
  it('sorts blank due-dates first ascending (highest attention)', () => {
    const sorted = sortAssets(rows, { key: 'next_clean_due', direction: 'asc' });
    expect(sorted[0].asset_ref).toBe('LAP-001'); // null date sorts first
  });
  it('urgency puts overdue before never-cleaned before ok', () => {
    const sorted = sortByUrgency(rows);
    expect(sorted.map(r => r.status)).toEqual([STATUS.OVERDUE, STATUS.NEVER_CLEANED, STATUS.OK]);
  });
  it('unique departments are de-duped and sorted', () => {
    expect(uniqueDepartments(rows)).toEqual(['Finance', 'IT']);
  });
});
