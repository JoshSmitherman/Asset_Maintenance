import { isCleaningTracked, STATUS_VALUES } from './constants';

const NOT_RECORDED = 'Not recorded';

/** Counts assets by a field, biggest group first. */
export function countBy(assets, pick) {
  const counts = new Map();
  for (const asset of assets) {
    const key = pick(asset) || NOT_RECORDED;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'en-GB'));
}

/**
 * Cleaning status counts across laptops and desktops only - inventory-only
 * assets have no cleaning status and must not dilute the proportions.
 * Returned in STATUS_VALUES order (most urgent first).
 */
export function statusBreakdown(assets) {
  const tracked = assets.filter((asset) => isCleaningTracked(asset.device_type));
  return STATUS_VALUES.map((status) => ({
    label: status,
    value: tracked.filter((asset) => asset.status === status).length
  }));
}

export function totalPurchaseValue(assets) {
  return assets.reduce((total, asset) => total + (Number(asset.purchase_cost) || 0), 0);
}

export function countWithoutCost(assets) {
  return assets.filter((asset) => asset.purchase_cost == null).length;
}
