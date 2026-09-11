import { STATUS_PRIORITY } from './constants';

export const EMPTY_FILTERS = {
  search: '',
  deviceType: 'all',
  department: 'all',
  location: 'all',
  cleanedBy: 'all',
  status: 'all'
};

export const DEFAULT_SORT = { key: 'next_clean_due', direction: 'asc' };

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
    if (filters.deviceType !== 'all' && asset.device_type !== filters.deviceType) return false;
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
      const left = String(a[key] ?? '').toLowerCase();
      const right = String(b[key] ?? '').toLowerCase();
      return left.localeCompare(right, 'en-GB', { numeric: true, sensitivity: 'base' });
    }
  }
}

export function sortAssets(assets, sort) {
  const direction = sort.direction === 'desc' ? -1 : 1;
  return [...assets].sort((a, b) => {
    const result = compareValues(a, b, sort.key);
    if (result !== 0) return result * direction;
    // Stable tie-break so rows never jump around unpredictably.
    return String(a.asset_ref).localeCompare(String(b.asset_ref), 'en-GB', { numeric: true });
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
    return String(a.asset_ref).localeCompare(String(b.asset_ref), 'en-GB', { numeric: true });
  });
}

export function uniqueDepartments(assets) {
  return [...new Set(assets.map((asset) => asset.department).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'en-GB', { sensitivity: 'base' })
  );
}
