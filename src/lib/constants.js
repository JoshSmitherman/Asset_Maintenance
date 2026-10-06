// Reference data shared by the UI. These lists mirror the CHECK constraints in
// supabase/setup.sql - change both together.

/**
 * The usual kinds of kit, offered first in the Device Type list. They are
 * suggestions, not a limit: any other type can be typed in ("+ Add another
 * type"), and types already on the register are offered too.
 */
export const DEVICE_TYPES = [
  'Laptop',
  'Desktop',
  'Monitor',
  'Phone',
  'Camera',
  'Docking Station',
  'Tablet',
  'Printer',
  'Peripheral',
  'Other'
];

/** The usual types first, then any others the register already uses. */
export function deviceTypeOptions(assets = []) {
  const extra = [...new Set(assets.map((asset) => asset.device_type).filter(Boolean))]
    .filter((type) => !DEVICE_TYPES.includes(type))
    .sort((a, b) => a.localeCompare(b, 'en-GB', { sensitivity: 'base' }));
  return [...DEVICE_TYPES, ...extra];
}

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

/** The kit the dashboard counts on its own; everything else is grouped as
 *  "Peripherals & other". */
export const MAIN_KIT_TYPES = ['Laptop', 'Desktop', 'Monitor'];

/** Device-type filter value for everything outside MAIN_KIT_TYPES. */
export const OTHER_KIT_FILTER = '__other';

export const DEFAULT_CLEANING_INTERVAL_MONTHS = 6;

/** Per-type defaults that differ from the 6-month rule. Laptops are on a
 *  yearly cycle. */
const CLEANING_INTERVAL_BY_TYPE = { Laptop: 12 };

/** The interval a new asset of this type starts with. */
export function defaultIntervalFor(deviceType) {
  return CLEANING_INTERVAL_BY_TYPE[deviceType] ?? DEFAULT_CLEANING_INTERVAL_MONTHS;
}

/** Never cleaned but purchased: first clean is due this long after purchase.
 *  Mirrors next_clean_due in supabase/setup.sql. */
export const FIRST_CLEAN_AFTER_PURCHASE_MONTHS = 12;

/** An asset becomes "Due Soon" once it is inside this many days of its due date. */
export const DUE_SOON_WINDOW_DAYS = 30;

export const STATUS = {
  OVERDUE: 'Overdue',
  NEVER_CLEANED: 'Never Cleaned',
  DUE_SOON: 'Due Soon',
  OK: 'OK',
  /** Not a laptop or desktop: inventory-only, never in the cleaning rota. */
  NOT_TRACKED: 'Not Tracked',
  /** At end of life: out of every list and the cleaning rota, record kept. */
  RETIRED: 'Retired'
};

/** Why kit was retired. Mirrors assets_retirement_complete in setup.sql. */
export const RETIRE_REASONS = ['End of life', 'Beyond repair', 'Replaced', 'Lost', 'Stolen', 'Other'];

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
