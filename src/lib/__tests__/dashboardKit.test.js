import { describe, it, expect } from 'vitest';
import { kitSummary, purchasesByMonth } from '../dashboardStats';
import { filterAssets, EMPTY_FILTERS } from '../assetQueries';
import { OTHER_KIT_FILTER } from '../constants';

const assets = [
  { device_type: 'Laptop', purchase_cost: 900, purchase_date: '2026-10-02' },
  { device_type: 'Laptop', purchase_cost: 800, purchase_date: '2026-09-15' },
  { device_type: 'Monitor', purchase_cost: 200, purchase_date: '2026-09-20' },
  { device_type: 'Docking Station', purchase_cost: 150, purchase_date: '2025-10-31' },
  { device_type: 'Phone', purchase_cost: null, purchase_date: '2024-01-01' },
  { device_type: 'Desktop', purchase_cost: 650, purchase_date: null }
];

describe('kitSummary', () => {
  it('counts and values laptops, phones, monitors and cameras, and gathers the rest', () => {
    const kit = kitSummary(assets);
    expect(kit.Laptop).toEqual({ count: 2, value: 1700 });
    expect(kit.Phone).toEqual({ count: 1, value: 0 });
    expect(kit.Monitor).toEqual({ count: 1, value: 200 });
    expect(kit.Camera).toEqual({ count: 0, value: 0 });
    // A dock and a desktop: older types, counted with other devices.
    expect(kit.other).toEqual({ count: 2, value: 800 });
  });
});

describe('purchasesByMonth', () => {
  it('gives twelve months ending this one, empty months included', () => {
    const months = purchasesByMonth(assets, 12, new Date(2026, 9, 5));
    expect(months).toHaveLength(12);
    expect(months[0].month).toBe('2025-11');
    expect(months[11]).toEqual({ month: '2026-10', count: 1, value: 900 });
    expect(months.find((row) => row.month === '2026-09')).toEqual({ month: '2026-09', count: 2, value: 1000 });
    // October 2025 is thirteen months back, so it is left out.
    expect(months.reduce((sum, row) => sum + row.count, 0)).toBe(3);
  });
});

describe('the Other devices filter', () => {
  it('keeps everything that is not a laptop, phone, monitor or camera', () => {
    const shown = filterAssets(assets, { ...EMPTY_FILTERS, deviceType: OTHER_KIT_FILTER });
    expect(shown.map((asset) => asset.device_type)).toEqual(['Docking Station', 'Desktop']);
  });
});
