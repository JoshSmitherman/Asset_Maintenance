import { formatCurrency, isCleaningTracked, STATUS } from './constants';
import { formatMonth } from './dates';

const NOT_RECORDED = 'Not recorded';

function money(value) {
  return formatCurrency(value) ?? '£0.00';
}

/** Count, total value and cleaning state for one grouping of the register. */
function groupBy(assets, pick) {
  const groups = new Map();

  for (const asset of assets) {
    const key = pick(asset) || NOT_RECORDED;
    const group = groups.get(key) ?? { label: key, count: 0, value: 0, overdue: 0 };
    group.count += 1;
    group.value += Number(asset.purchase_cost) || 0;
    if (asset.status === STATUS.OVERDUE) group.overdue += 1;
    groups.set(key, group);
  }

  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'en-GB')
  );
}

const GROUP_COLUMNS = (label) => [
  { key: 'label', label },
  { key: 'count', label: 'Assets' },
  { key: 'value', label: 'Total value', format: (row) => money(row.value) },
  { key: 'overdue', label: 'Overdue cleans' }
];

/** Whole years between a purchase date and today. */
export function ageInYears(purchaseDate, today = new Date()) {
  if (!purchaseDate) return null;
  const bought = new Date(`${purchaseDate}T00:00:00Z`);
  if (Number.isNaN(bought.getTime())) return null;
  const days = (today.getTime() - bought.getTime()) / 86400000;
  return days / 365.25;
}

const AGE_BANDS = [
  { label: 'Under 1 year', test: (years) => years < 1 },
  { label: '1 to 2 years', test: (years) => years < 2 },
  { label: '2 to 3 years', test: (years) => years < 3 },
  { label: '3 to 4 years', test: (years) => years < 4 },
  { label: '4 to 5 years', test: (years) => years < 5 },
  { label: '5 years or older', test: () => true }
];

export const REPORTS = [
  {
    id: 'department',
    label: 'Assets by department',
    description: 'Who holds what, and what it is worth. The usual starting point for a recharge or a budget conversation.',
    build: ({ assets }) => ({
      columns: GROUP_COLUMNS('Department'),
      rows: groupBy(assets, (asset) => asset.department)
    })
  },
  {
    id: 'device_type',
    label: 'Assets by device type',
    description: 'The shape of the fleet: how many laptops, desktops, monitors and everything else.',
    build: ({ assets }) => ({
      columns: GROUP_COLUMNS('Device type'),
      rows: groupBy(assets, (asset) => asset.device_type)
    })
  },
  {
    id: 'location',
    label: 'Assets by location',
    description: 'Where the kit lives — remote, hybrid, office or warehouse.',
    build: ({ assets }) => ({
      columns: GROUP_COLUMNS('Location'),
      rows: groupBy(assets, (asset) => asset.location)
    })
  },
  {
    id: 'age',
    label: 'Fleet age profile',
    description: 'How old the fleet is, from purchase dates. What is over four years old is next year’s replacement budget.',
    build: ({ assets }) => {
      const bands = AGE_BANDS.map((band) => ({ label: band.label, count: 0, value: 0 }));
      const unknown = { label: 'No purchase date', count: 0, value: 0 };

      for (const asset of assets) {
        const years = ageInYears(asset.purchase_date);
        const target = years === null ? unknown : bands[AGE_BANDS.findIndex((band) => band.test(years))];
        target.count += 1;
        target.value += Number(asset.purchase_cost) || 0;
      }

      const rows = [...bands, unknown].filter((row) => row.count > 0);
      return {
        columns: [
          { key: 'label', label: 'Age' },
          { key: 'count', label: 'Assets' },
          { key: 'value', label: 'Purchase value', format: (row) => money(row.value) }
        ],
        rows
      };
    }
  },
  {
    id: 'spend',
    label: 'Spend by purchase year',
    description: 'What was bought and when, from the purchase dates on the register.',
    build: ({ assets }) => {
      const years = new Map();
      for (const asset of assets) {
        if (!asset.purchase_date) continue;
        const year = String(asset.purchase_date).slice(0, 4);
        const row = years.get(year) ?? { label: year, count: 0, value: 0 };
        row.count += 1;
        row.value += Number(asset.purchase_cost) || 0;
        years.set(year, row);
      }
      return {
        columns: [
          { key: 'label', label: 'Year' },
          { key: 'count', label: 'Assets bought' },
          { key: 'value', label: 'Spend', format: (row) => money(row.value) }
        ],
        rows: [...years.values()].sort((a, b) => b.label.localeCompare(a.label))
      };
    }
  },
  {
    id: 'cleaning_month',
    label: 'Cleans by month',
    description: 'Cleaning activity from the history log. Only covers cleans recorded since the history was added.',
    needsLog: true,
    build: ({ log }) => {
      const months = new Map();
      for (const entry of log) {
        const month = String(entry.cleaned_on).slice(0, 7);
        const row = months.get(month) ?? { label: month, count: 0, assets: new Set() };
        row.count += 1;
        row.assets.add(entry.asset_ref);
        months.set(month, row);
      }
      return {
        columns: [
          { key: 'label', label: 'Month', format: (row) => formatMonth(row.label) },
          { key: 'count', label: 'Cleans recorded' },
          { key: 'assets', label: 'Distinct assets', format: (row) => row.assets.size }
        ],
        rows: [...months.values()].sort((a, b) => b.label.localeCompare(a.label))
      };
    }
  },
  {
    id: 'cleaning_person',
    label: 'Cleans by person',
    description: 'Who has recorded the cleaning, from the history log.',
    needsLog: true,
    build: ({ log }) => {
      const people = new Map();
      for (const entry of log) {
        const row = people.get(entry.cleaned_by) ?? { label: entry.cleaned_by, count: 0, last: '' };
        row.count += 1;
        if (entry.cleaned_on > row.last) row.last = entry.cleaned_on;
        people.set(entry.cleaned_by, row);
      }
      return {
        columns: [
          { key: 'label', label: 'Cleaned by' },
          { key: 'count', label: 'Cleans recorded' },
          { key: 'last', label: 'Most recent' }
        ],
        rows: [...people.values()].sort((a, b) => b.count - a.count)
      };
    }
  },
  {
    id: 'never_cleaned',
    label: 'Never cleaned',
    description: 'Laptops and desktops with no clean on record at all — the ones most likely to have been missed.',
    build: ({ assets }) => ({
      columns: [
        { key: 'asset_ref', label: 'Asset Ref' },
        { key: 'device_type', label: 'Type' },
        { key: 'owner_name', label: 'User', format: (row) => row.owner_name ?? 'Unassigned' },
        { key: 'department', label: 'Department' },
        { key: 'location', label: 'Location', format: (row) => row.location ?? NOT_RECORDED }
      ],
      rows: assets
        .filter((asset) => isCleaningTracked(asset.device_type) && !asset.date_cleaned)
        .sort((a, b) => String(a.asset_ref).localeCompare(String(b.asset_ref), 'en-GB', { numeric: true }))
    })
  }
];

export function reportById(id) {
  return REPORTS.find((report) => report.id === id) ?? REPORTS[0];
}
