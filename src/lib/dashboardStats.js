import { isCleaningTracked, MAIN_KIT_TYPES, STATUS_VALUES } from './constants';
import { parseIsoDate, toIsoDate } from './dates';

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

/**
 * How many of each main kit type there are and what they are worth, with
 * everything else gathered as "other": { Laptop: { count, value }, ...,
 * other: { count, value } }.
 */
export function kitSummary(assets) {
  const summary = Object.fromEntries(
    [...MAIN_KIT_TYPES, 'other'].map((key) => [key, { count: 0, value: 0 }])
  );
  for (const asset of assets) {
    const key = MAIN_KIT_TYPES.includes(asset.device_type) ? asset.device_type : 'other';
    summary[key].count += 1;
    summary[key].value += Number(asset.purchase_cost) || 0;
  }
  return summary;
}

/** What "Peripherals & other" is made of, biggest first: "3 Phone, 2 Camera". */
export function otherKitBreakdown(assets) {
  const counts = new Map();
  for (const asset of assets) {
    if (MAIN_KIT_TYPES.includes(asset.device_type)) continue;
    counts.set(asset.device_type, (counts.get(asset.device_type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
}

/**
 * What was bought in each of the last `months` calendar months, oldest
 * first and ending with the current month, empty months included so the
 * chart's spacing is true to time: [{ month: '2026-10', count, value }].
 */
export function purchasesByMonth(assets, months = 12, today = new Date()) {
  const result = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - back, 1);
    result.push({ month: toIsoDate(date).slice(0, 7), count: 0, value: 0 });
  }
  const index = new Map(result.map((row, position) => [row.month, position]));
  for (const asset of assets) {
    if (!parseIsoDate(asset.purchase_date)) continue;
    const position = index.get(String(asset.purchase_date).slice(0, 7));
    if (position === undefined) continue;
    result[position].count += 1;
    result[position].value += Number(asset.purchase_cost) || 0;
  }
  return result;
}
