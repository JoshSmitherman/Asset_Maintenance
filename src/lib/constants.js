// Reference data shared by the UI. These lists mirror the CHECK constraints in
// supabase/schema.sql - change both together.

export const DEVICE_TYPES = ['Laptop', 'Desktop'];

export const CLEANERS = ['AL', 'BB', 'JS', 'RC', 'TM'];

export const DEFAULT_CLEANING_INTERVAL_MONTHS = 6;

/** An asset becomes "Due Soon" once it is inside this many days of its due date. */
export const DUE_SOON_WINDOW_DAYS = 30;

export const STATUS = {
  OVERDUE: 'Overdue',
  NEVER_CLEANED: 'Never Cleaned',
  DUE_SOON: 'Due Soon',
  OK: 'OK'
};

export const STATUS_VALUES = [STATUS.OVERDUE, STATUS.NEVER_CLEANED, STATUS.DUE_SOON, STATUS.OK];

/** Sort weight: the things needing attention first. */
export const STATUS_PRIORITY = {
  [STATUS.OVERDUE]: 0,
  [STATUS.NEVER_CLEANED]: 1,
  [STATUS.DUE_SOON]: 2,
  [STATUS.OK]: 3
};

export const ATTENTION_STATUSES = [STATUS.OVERDUE, STATUS.NEVER_CLEANED, STATUS.DUE_SOON];

/** Table name the app reads from (view) and writes to (base table). */
export const ASSETS_VIEW = 'assets_with_status';
export const ASSETS_TABLE = 'assets';
