import {
  DEFAULT_CLEANING_INTERVAL_MONTHS,
  DUE_SOON_WINDOW_DAYS,
  FIRST_CLEAN_AFTER_PURCHASE_MONTHS,
  isCleaningTracked,
  STATUS,
  STATUS_VALUES
} from './constants';
import { addMonthsIso, daysBetween, todayIso } from './dates';

/**
 * Next Clean Due is a STORED generated column in Postgres - this function is
 * only used to preview the value while someone is filling in the form, and to
 * keep a long-open browser tab accurate after midnight. The database remains
 * the source of truth for what is actually saved.
 */
export function previewNextCleanDue(
  dateCleaned,
  intervalMonths = DEFAULT_CLEANING_INTERVAL_MONTHS,
  purchaseDate = null
) {
  if (dateCleaned) {
    const months = Number(intervalMonths) || DEFAULT_CLEANING_INTERVAL_MONTHS;
    return addMonthsIso(dateCleaned, months);
  }
  // Never cleaned but we know when it was bought: new kit is first due a
  // fixed time after purchase, whatever its interval.
  if (purchaseDate) return addMonthsIso(purchaseDate, FIRST_CLEAN_AFTER_PURCHASE_MONTHS);
  return null;
}

/** Mirrors public.asset_status() in the migration. Only laptops and desktops
 *  carry a cleaning status; everything else is inventory-only.
 *
 *  A never-cleaned asset with a purchase date still has a due date (counted
 *  from purchase), so it is the due date, not the clean, that decides
 *  "Never Cleaned". dateCleaned is kept for callers but no longer decides. */
export function statusFor(deviceType, dateCleaned, nextCleanDue, today = todayIso()) {
  if (!isCleaningTracked(deviceType)) return STATUS.NOT_TRACKED;
  if (!nextCleanDue) return STATUS.NEVER_CLEANED;
  const days = daysBetween(today, nextCleanDue);
  if (days === null) return STATUS.NEVER_CLEANED;
  if (days < 0) return STATUS.OVERDUE;
  if (days <= DUE_SOON_WINDOW_DAYS) return STATUS.DUE_SOON;
  return STATUS.OK;
}

/**
 * Takes a row from the assets_with_status view and adds the two display fields
 * the UI uses. Status is recalculated from the stored next_clean_due date so it
 * stays correct even if the page has been open across a date change.
 */
export function isRetired(asset) {
  return Boolean(asset?.retired_on);
}

export function decorateAsset(row, today = todayIso()) {
  const nextCleanDue = row.next_clean_due ?? null;
  return {
    ...row,
    nextCleanDue,
    // Retired kit has left the cleaning rota, whatever its dates say.
    status: isRetired(row)
      ? STATUS.RETIRED
      : statusFor(row.device_type, row.date_cleaned, nextCleanDue, today),
    daysUntilDue: nextCleanDue ? daysBetween(today, nextCleanDue) : null
  };
}

export function summariseAssets(assets) {
  const summary = {
    total: assets.length,
    [STATUS.OVERDUE]: 0,
    [STATUS.NEVER_CLEANED]: 0,
    [STATUS.DUE_SOON]: 0,
    [STATUS.OK]: 0
  };
  for (const asset of assets) {
    if (STATUS_VALUES.includes(asset.status)) summary[asset.status] += 1;
  }
  return summary;
}
