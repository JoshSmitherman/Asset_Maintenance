import { describe, it, expect } from 'vitest';
import { statusFor, previewNextCleanDue, decorateAsset, summariseAssets } from '../assetStatus';
import { STATUS, defaultIntervalFor } from '../constants';

const TODAY = '2026-09-13';

describe('statusFor — mirrors public.asset_status()', () => {
  it('untracked device types are Not Tracked', () => {
    expect(statusFor('Monitor', '2026-01-01', '2026-07-01', TODAY)).toBe(STATUS.NOT_TRACKED);
  });
  it('a laptop with no clean record is Never Cleaned', () => {
    expect(statusFor('Laptop', null, null, TODAY)).toBe(STATUS.NEVER_CLEANED);
  });
  it('past due date is Overdue', () => {
    expect(statusFor('Laptop', '2026-01-01', '2026-09-12', TODAY)).toBe(STATUS.OVERDUE);
  });
  it('due exactly today is Due Soon (0 days, boundary)', () => {
    expect(statusFor('Desktop', '2026-03-13', '2026-09-13', TODAY)).toBe(STATUS.DUE_SOON);
  });
  it('due in exactly 30 days is Due Soon (inclusive boundary)', () => {
    expect(statusFor('Laptop', '2026-03-13', '2026-10-13', TODAY)).toBe(STATUS.DUE_SOON);
  });
  it('due in 31 days is OK (just outside the window)', () => {
    expect(statusFor('Laptop', '2026-03-14', '2026-10-14', TODAY)).toBe(STATUS.OK);
  });
});

describe('previewNextCleanDue', () => {
  it('adds the default interval', () => {
    expect(previewNextCleanDue('2026-03-15')).toBe('2026-09-15');
  });
  it('honours a per-asset override', () => {
    expect(previewNextCleanDue('2026-03-15', 3)).toBe('2026-06-15');
  });
  it('falls back to default for a non-numeric interval', () => {
    expect(previewNextCleanDue('2026-03-15', 'oops')).toBe('2026-09-15');
  });
  it('returns null with no clean date', () => {
    expect(previewNextCleanDue(null)).toBeNull();
  });
  it('counts a never-cleaned asset from its purchase date, a year on', () => {
    expect(previewNextCleanDue(null, 6, '2026-10-05')).toBe('2027-10-05');
  });
  it('a recorded clean wins over the purchase date', () => {
    expect(previewNextCleanDue('2026-03-15', 6, '2025-01-01')).toBe('2026-09-15');
  });
});

describe('purchase-date baseline', () => {
  it('a just-bought laptop is OK rather than Never Cleaned', () => {
    const due = previewNextCleanDue(null, 12, TODAY);
    expect(statusFor('Laptop', null, due, TODAY)).toBe(STATUS.OK);
  });
  it('kit bought over a year ago and never cleaned is Overdue', () => {
    const due = previewNextCleanDue(null, 6, '2025-01-01');
    expect(statusFor('Desktop', null, due, TODAY)).toBe(STATUS.OVERDUE);
  });
});

describe('defaultIntervalFor', () => {
  it('is 12 months for a laptop and 6 for everything else', () => {
    expect(defaultIntervalFor('Laptop')).toBe(12);
    expect(defaultIntervalFor('Desktop')).toBe(6);
  });
});

describe('decorateAsset & summariseAssets', () => {
  it('recomputes status and days from the stored due date', () => {
    const row = { device_type: 'Laptop', date_cleaned: '2026-01-01', next_clean_due: '2026-09-12' };
    const d = decorateAsset(row, TODAY);
    expect(d.status).toBe(STATUS.OVERDUE);
    expect(d.daysUntilDue).toBe(-1);
  });
  it('counts each cleaning status, ignoring untracked', () => {
    const assets = [
      { status: STATUS.OVERDUE }, { status: STATUS.OVERDUE },
      { status: STATUS.OK }, { status: STATUS.NOT_TRACKED }
    ];
    const s = summariseAssets(assets);
    expect(s.total).toBe(4);
    expect(s[STATUS.OVERDUE]).toBe(2);
    expect(s[STATUS.OK]).toBe(1);
  });
});
