import { MAIN_KIT_TYPES, OTHER_KIT_FILTER, STATUS_PRIORITY } from './constants';

export const EMPTY_FILTERS = {
  search: '',
  deviceType: 'all',
  department: 'all',
  location: 'all',
  cleanedBy: 'all',
  status: 'all'
};

export const DEFAULT_SORT = { key: 'asset_ref', direction: 'asc' };

function matchesSearch(asset, term) {
  if (!term) return true;
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [asset.asset_ref, asset.owner_name, asset.department, asset.location, asset.notes, asset.cleaned_by]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(needle));
}

export function filterAssets(assets, filters) {
  return assets.filter((asset) => {
    if (!matchesSearch(asset, filters.search)) return false;
    if (filters.deviceType === OTHER_KIT_FILTER) {
      if (MAIN_KIT_TYPES.includes(asset.device_type)) return false;
    } else if (filters.deviceType !== 'all' && asset.device_type !== filters.deviceType) {
      return false;
    }
    if (filters.department !== 'all' && asset.department !== filters.department) return false;
    if (filters.location !== 'all') {
      if (filters.location === 'unassigned' ? asset.location : asset.location !== filters.location) {
        return false;
      }
    }
    if (filters.cleanedBy !== 'all') {
      if (filters.cleanedBy === 'unassigned' ? asset.cleaned_by : asset.cleaned_by !== filters.cleanedBy) {
        return false;
      }
    }
    if (filters.status !== 'all' && asset.status !== filters.status) return false;
    return true;
  });
}

const TEXT_ORDER = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

function compareValues(a, b, key) {
  switch (key) {
    case 'status':
      return (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
    case 'next_clean_due':
    case 'date_cleaned': {
      // Blank dates are the highest-attention rows, so they sort first ascending.
      const left = a[key];
      const right = b[key];
      if (!left && !right) return 0;
      if (!left) return -1;
      if (!right) return 1;
      return left < right ? -1 : left > right ? 1 : 0;
    }
    case 'purchase_cost': {
      // Numeric, and blank costs sort last so priced assets lead the list.
      const left = a[key];
      const right = b[key];
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      return Number(left) - Number(right);
    }
    case 'created_at':
    case 'updated_at': {
      return new Date(a[key] || 0).getTime() - new Date(b[key] || 0).getTime();
    }
    default: {
      return TEXT_ORDER.compare(String(a[key] ?? ''), String(b[key] ?? ''));
    }
  }
}

// One collator, built once: localeCompare with options builds a new one on
// every call, which made sorting a few thousand rows take seconds.
const REF_ORDER = new Intl.Collator('en-GB', { numeric: true });
const isBlank = (value) => value === null || value === undefined || value === '';

export function sortAssets(assets, sort) {
  const direction = sort.direction === 'desc' ? -1 : 1;
  return [...assets].sort((a, b) => {
    // Blanks (no cost, never cleaned, unassigned) go to the bottom whichever
    // way the column is sorted - they are never the "biggest" or "newest".
    // The exception is the due date: no due date means never cleaned, the
    // most urgent of all, so it keeps its place at the top.
    const blanksLast = sort.key !== 'next_clean_due';
    const leftBlank = blanksLast && isBlank(a[sort.key]);
    const rightBlank = blanksLast && isBlank(b[sort.key]);
    if (leftBlank !== rightBlank) return leftBlank ? 1 : -1;
    const result = leftBlank ? 0 : compareValues(a, b, sort.key);
    if (result !== 0) return result * direction;
    // Stable tie-break so rows never jump around unpredictably.
    return REF_ORDER.compare(String(a.asset_ref), String(b.asset_ref));
  });
}

/** Overdue first, then never cleaned, then due soon - most urgent at the top. */
export function sortByUrgency(assets) {
  return [...assets].sort((a, b) => {
    const priority = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
    if (priority !== 0) return priority;
    const left = a.daysUntilDue ?? 0;
    const right = b.daysUntilDue ?? 0;
    if (left !== right) return left - right;
    return REF_ORDER.compare(String(a.asset_ref), String(b.asset_ref));
  });
}

export function uniqueDepartments(assets) {
  return uniqueValues(assets, (asset) => asset.department);
}

/** Names already in use, so the form can suggest them and keep spelling consistent. */
export function uniqueUsers(assets) {
  return uniqueValues(assets, (asset) => asset.owner_name);
}

function uniqueValues(assets, pick) {
  return [...new Set(assets.map(pick).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'en-GB', { sensitivity: 'base' })
  );
}
