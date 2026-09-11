// Reference data shared by the UI. These lists mirror the CHECK constraints in
// supabase/schema.sql and supabase/migration-001-asset-management.sql - change
// both together.

export const DEVICE_TYPES = [
  'Laptop',
  'Desktop',
  'Monitor',
  'Docking Station',
  'Phone',
  'Tablet',
  'Printer',
  'Peripheral',
  'Other'
];

/**
 * Cleaning is derived from device type rather than a per-asset switch: add a
 * laptop or desktop and it appears in the cleaning rota automatically, change
 * its type and it leaves. Mirrors asset_status() in the migration.
 */
export const CLEANING_DEVICE_TYPES = ['Laptop', 'Desktop'];

export function isCleaningTracked(deviceType) {
  return CLEANING_DEVICE_TYPES.includes(deviceType);
}

export const LOCATIONS = ['Remote', 'Hybrid', 'Office', 'Warehouse'];

export const CLEANERS = ['AL', 'BB', 'JS', 'RC', 'TM'];

export const DEFAULT_CLEANING_INTERVAL_MONTHS = 6;

/** An asset becomes "Due Soon" once it is inside this many days of its due date. */
export const DUE_SOON_WINDOW_DAYS = 30;

export const STATUS = {
  OVERDUE: 'Overdue',
  NEVER_CLEANED: 'Never Cleaned',
  DUE_SOON: 'Due Soon',
  OK: 'OK',
  /** Not a laptop or desktop: inventory-only, never in the cleaning rota. */
  NOT_TRACKED: 'Not Tracked'
};

/** The cleaning statuses. Deliberately excludes NOT_TRACKED so that
 *  inventory-only assets are not counted on the cleaning dashboard. */
export const STATUS_VALUES = [STATUS.OVERDUE, STATUS.NEVER_CLEANED, STATUS.DUE_SOON, STATUS.OK];

/** Everything selectable in the Status filter, including inventory-only rows. */
export const STATUS_FILTER_VALUES = [...STATUS_VALUES, STATUS.NOT_TRACKED];

/** Sort weight: the things needing attention first. */
export const STATUS_PRIORITY = {
  [STATUS.OVERDUE]: 0,
  [STATUS.NEVER_CLEANED]: 1,
  [STATUS.DUE_SOON]: 2,
  [STATUS.OK]: 3,
  [STATUS.NOT_TRACKED]: 4
};

export const ATTENTION_STATUSES = [STATUS.OVERDUE, STATUS.NEVER_CLEANED, STATUS.DUE_SOON];

/** Table name the app reads from (view) and writes to (base table). */
export const ASSETS_VIEW = 'assets_with_status';
export const ASSETS_TABLE = 'assets';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
});

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : null;
}
