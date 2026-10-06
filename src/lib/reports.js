import { deviceTypeLabel, formatCurrency, isCleaningTracked, STATUS } from './constants';
import { formatDate, formatMonth, monthBoundsIso, parseIsoDate, todayIso } from './dates';
import { displayNameFromEmail } from './accountName';
import { CLEANING_CSV_COLUMNS, REGISTER_CSV_COLUMNS } from './assetCsv';

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

/**
 * Age in years (with a fraction) from a purchase date to today, counted in
 * calendar months so kit is exactly 2 on its second anniversary - not a few
 * hours later, as dividing days by 365.25 made it.
 */
export function ageInYears(purchaseDate, today = new Date()) {
  const bought = parseIsoDate(purchaseDate);
  if (!bought) return null;
  let months = (today.getFullYear() - bought.getFullYear()) * 12 + (today.getMonth() - bought.getMonth());
  if (today.getDate() < bought.getDate()) months -= 1;
  return months / 12;
}

/** Every asset by id, retired kit included - repairs outlive retirement. */
function assetIndex(assets, retired = []) {
  return new Map([...assets, ...retired].map((asset) => [asset.id, asset]));
}

/** Repair count and spend per asset id. */
function repairsByAsset(repairs = []) {
  const byAsset = new Map();
  for (const repair of repairs) {
    const entry = byAsset.get(repair.asset_id) ?? { count: 0, spent: 0, last: '' };
    entry.count += 1;
    entry.spent = (Math.round(entry.spent * 100) + Math.round(Number(repair.total_cost || 0) * 100)) / 100;
    if (repair.repaired_on > entry.last) entry.last = repair.repaired_on;
    byAsset.set(repair.asset_id, entry);
  }
  return byAsset;
}

function fixerName(repair) {
  return repair.fixed_by_email ? displayNameFromEmail(repair.fixed_by_email) : 'No longer on the team';
}

/** "Battery £45.50; Keyboard £30.00" - parts in one cell for a CSV. */
function partsInline(parts) {
  return (parts ?? []).map((part) => `${part.part} ${money(part.cost)}`).join('; ');
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
      rows: groupBy(assets, (asset) => deviceTypeLabel(asset.device_type))
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
    id: 'purchases_month',
    label: 'Bought by month',
    description: 'Every month something was bought: how many assets, and what they cost. Newest first.',
    build: ({ assets }) => {
      const months = new Map();
      for (const asset of assets) {
        if (!asset.purchase_date) continue;
        const month = String(asset.purchase_date).slice(0, 7);
        const row = months.get(month) ?? { label: month, count: 0, value: 0, types: new Map() };
        row.count += 1;
        row.value += Number(asset.purchase_cost) || 0;
        row.types.set(asset.device_type, (row.types.get(asset.device_type) ?? 0) + 1);
        months.set(month, row);
      }
      return {
        columns: [
          { key: 'label', label: 'Month', format: (row) => formatMonth(row.label) },
          { key: 'count', label: 'Assets bought' },
          { key: 'value', label: 'Spend', format: (row) => money(row.value) },
          {
            key: 'types',
            label: 'What',
            format: (row) =>
              [...row.types.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => `${count} ${type}`)
                .join(', ')
          }
        ],
        rows: [...months.values()].sort((a, b) => b.label.localeCompare(a.label))
      };
    }
  },
  {
    id: 'due_this_month',
    label: 'Cleaning due this month',
    description:
      'Every laptop and desktop needing a clean by the end of this month, soonest first. Includes anything already overdue, because it still needs doing.',
    build: ({ assets }) => {
      const { end } = monthBoundsIso(todayIso());

      return {
        columns: [
          { key: 'asset_ref', label: 'Asset Ref' },
          { key: 'device_type', label: 'Type' },
          { key: 'owner_name', label: 'User', format: (row) => row.owner_name ?? 'Unassigned' },
          { key: 'department', label: 'Department' },
          { key: 'next_clean_due', label: 'Clean due', format: (row) => formatDate(row.next_clean_due) },
          { key: 'status', label: 'Status' }
        ],
        // Dates are plain YYYY-MM-DD, so comparing them as text is the same as
        // comparing them as dates, without any timezone to get wrong. An asset
        // never cleaned has no due date at all and belongs to its own report.
        rows: assets
          // Only kit that is actually cleaned: the database gives monitors and
          // phones a due date too (purchase + interval), which means nothing.
          .filter(
            (asset) =>
              isCleaningTracked(asset.device_type) && asset.next_clean_due && asset.next_clean_due <= end
          )
          .sort((a, b) => String(a.next_clean_due).localeCompare(String(b.next_clean_due)))
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
  },
  {
    id: 'person',
    label: 'Assets by person',
    description:
      'Choose someone to see everything they hold; or everyone, for a line each. Handy when somebody starts, leaves or changes role.',
    parameter: { kind: 'person', label: 'Person', everyone: 'Everyone' },
    needsRepairs: true,
    build: ({ assets, repairs, person }) => {
      const repairStats = repairsByAsset(repairs);

      if (!person) {
        // One line per person who holds anything.
        const people = new Map();
        for (const asset of assets) {
          if (!asset.owner_name) continue;
          const row = people.get(asset.owner_name) ?? { label: asset.owner_name, count: 0, value: 0, overdue: 0, repairs: 0 };
          row.count += 1;
          row.value += Number(asset.purchase_cost) || 0;
          if (asset.status === STATUS.OVERDUE) row.overdue += 1;
          row.repairs += repairStats.get(asset.id)?.spent ?? 0;
          people.set(asset.owner_name, row);
        }
        return {
          columns: [
            { key: 'label', label: 'Person' },
            { key: 'count', label: 'Assets' },
            { key: 'value', label: 'Total value', format: (row) => money(row.value) },
            { key: 'overdue', label: 'Overdue cleans' },
            { key: 'repairs', label: 'Spent on repairs', format: (row) => money(row.repairs) }
          ],
          rows: [...people.values()].sort((a, b) => a.label.localeCompare(b.label, 'en-GB'))
        };
      }

      return {
        columns: [
          { key: 'asset_ref', label: 'Asset Ref' },
          { key: 'device_type', label: 'Type' },
          { key: 'department', label: 'Department' },
          { key: 'location', label: 'Location', format: (row) => row.location ?? NOT_RECORDED },
          { key: 'status', label: 'Cleaning status' },
          { key: 'purchase_cost', label: 'Value', format: (row) => money(row.purchase_cost) },
          {
            key: 'repairs',
            label: 'Repairs',
            format: (row) => {
              const stats = repairStats.get(row.id);
              return stats ? `${stats.count} · ${money(stats.spent)}` : 'None';
            }
          }
        ],
        rows: assets
          .filter((asset) => asset.owner_name === person)
          .sort((a, b) => String(a.asset_ref).localeCompare(String(b.asset_ref), 'en-GB', { numeric: true }))
      };
    }
  },
  {
    id: 'retired',
    label: 'Retired kit',
    description: 'Everything retired: when, why, and whether its data was wiped before it left - what a disposal audit asks for.',
    build: ({ retired = [] }) => ({
      columns: [
        { key: 'asset_ref', label: 'Asset Ref' },
        { key: 'device_type', label: 'Type' },
        { key: 'owner_name', label: 'Last user', format: (row) => row.owner_name ?? 'Unassigned' },
        { key: 'retired_on', label: 'Retired', format: (row) => formatDate(row.retired_on) },
        { key: 'retired_reason', label: 'Reason' },
        { key: 'data_wiped', label: 'Data wiped', format: (row) => (row.data_wiped ? 'Yes' : 'Not recorded') },
        {
          key: 'data_wiped_by_email',
          label: 'Wiped by',
          format: (row) => (row.data_wiped_by_email ? displayNameFromEmail(row.data_wiped_by_email) : '')
        },
        { key: 'retired_notes', label: 'Note', format: (row) => row.retired_notes ?? '' }
      ],
      rows: [...retired].sort((a, b) => String(b.retired_on).localeCompare(String(a.retired_on)))
    })
  },
  {
    id: 'repairs_all',
    label: 'Every repair',
    description: 'Each in-house repair, newest first: what was done, the parts and their cost, and who fixed it.',
    needsRepairs: true,
    build: ({ assets, retired, repairs = [] }) => {
      const byId = assetIndex(assets, retired);
      return {
        columns: [
          { key: 'repaired_on', label: 'Date', format: (row) => formatDate(row.repaired_on) },
          { key: 'asset_ref', label: 'Asset Ref', format: (row) => byId.get(row.asset_id)?.asset_ref ?? 'Deleted asset' },
          { key: 'fault', label: 'What was done' },
          { key: 'parts', label: 'Parts', format: (row) => partsInline(row.parts) || 'None' },
          { key: 'fixed_by', label: 'Fixed by', format: fixerName },
          { key: 'total_cost', label: 'Cost', format: (row) => money(row.total_cost) }
        ],
        rows: [...repairs].sort((a, b) => String(b.repaired_on).localeCompare(String(a.repaired_on)))
      };
    }
  },
  {
    id: 'repairs_by_asset',
    label: 'Repairs by asset',
    description: 'Which machines keep needing work, and what they have cost - the case for replacing rather than repairing.',
    needsRepairs: true,
    build: ({ assets, retired, repairs = [] }) => {
      const byId = assetIndex(assets, retired);
      const rows = [...repairsByAsset(repairs).entries()].map(([assetId, stats]) => {
        const asset = byId.get(assetId);
        return {
          id: assetId,
          label: asset?.asset_ref ?? 'Deleted asset',
          type: asset?.device_type ?? '',
          count: stats.count,
          spent: stats.spent,
          last: stats.last
        };
      });
      return {
        columns: [
          { key: 'label', label: 'Asset Ref' },
          { key: 'type', label: 'Type' },
          { key: 'count', label: 'Repairs' },
          { key: 'spent', label: 'Spent', format: (row) => money(row.spent) },
          { key: 'last', label: 'Last repair', format: (row) => formatDate(row.last) }
        ],
        rows: rows.sort((a, b) => b.spent - a.spent || b.count - a.count)
      };
    }
  },
  {
    id: 'repairs_by_part',
    label: 'Repairs by part',
    description: 'Which parts get replaced most often, and what they cost in total.',
    needsRepairs: true,
    build: ({ repairs = [] }) => {
      const parts = new Map();
      for (const repair of repairs) {
        for (const part of repair.parts ?? []) {
          // "battery" and "Battery" are the same part.
          const key = String(part.part).trim().toLowerCase();
          const row = parts.get(key) ?? { label: String(part.part).trim(), times: 0, pence: 0 };
          row.times += 1;
          row.pence += Math.round(Number(part.cost || 0) * 100);
          parts.set(key, row);
        }
      }
      return {
        columns: [
          { key: 'label', label: 'Part' },
          { key: 'times', label: 'Times replaced' },
          { key: 'total', label: 'Total cost', format: (row) => money(row.pence / 100) },
          { key: 'average', label: 'Average cost', format: (row) => money(row.pence / row.times / 100) }
        ],
        rows: [...parts.values()].sort((a, b) => b.times - a.times || b.pence - a.pence)
      };
    }
  },
  {
    id: 'repairs_by_person',
    label: 'Repairs by person',
    description: 'Who has carried out the repairs, and the cost of the parts they fitted.',
    needsRepairs: true,
    build: ({ repairs = [] }) => {
      const people = new Map();
      for (const repair of repairs) {
        const name = fixerName(repair);
        const row = people.get(name) ?? { label: name, count: 0, pence: 0, last: '' };
        row.count += 1;
        row.pence += Math.round(Number(repair.total_cost || 0) * 100);
        if (repair.repaired_on > row.last) row.last = repair.repaired_on;
        people.set(name, row);
      }
      return {
        columns: [
          { key: 'label', label: 'Fixed by' },
          { key: 'count', label: 'Repairs' },
          { key: 'spent', label: 'Parts cost', format: (row) => money(row.pence / 100) },
          { key: 'last', label: 'Most recent', format: (row) => formatDate(row.last) }
        ],
        rows: [...people.values()].sort((a, b) => b.count - a.count)
      };
    }
  },
  {
    id: 'cleaning_log',
    label: 'Cleaning history (every clean)',
    description: 'The full log, one row per clean, newest first. For totals by month or by person, see Cleaning activity.',
    needsLog: true,
    build: ({ log }) => ({
      columns: [
        { key: 'asset_ref', label: 'Asset Ref' },
        { key: 'cleaned_on', label: 'Date of clean', format: (row) => formatDate(row.cleaned_on) },
        { key: 'cleaned_by', label: 'Cleaned by' }
      ],
      rows: log
    })
  },
  {
    id: 'full_register',
    label: 'Full asset register',
    description: 'Every asset with everything recorded against it. The whole register, not a summary of it.',
    build: ({ assets }) => ({
      columns: REGISTER_CSV_COLUMNS,
      rows: [...assets].sort((a, b) =>
        String(a.asset_ref).localeCompare(String(b.asset_ref), 'en-GB', { numeric: true })
      )
    })
  },
  {
    id: 'unassigned',
    label: 'Unassigned assets',
    description: 'Everything nobody is recorded as using — spare kit, or waiting to be issued.',
    build: ({ assets }) => ({
      columns: REGISTER_CSV_COLUMNS,
      rows: assets
        .filter((asset) => !asset.owner_name)
        .sort((a, b) => String(a.asset_ref).localeCompare(String(b.asset_ref), 'en-GB', { numeric: true }))
    })
  },
  {
    id: 'cleaning_queue',
    label: 'Cleaning queue (full list)',
    description: 'Every laptop and desktop with its cleaning dates and status, whether or not anything is due.',
    build: ({ assets }) => ({
      columns: CLEANING_CSV_COLUMNS,
      rows: assets
        .filter((asset) => isCleaningTracked(asset.device_type))
        .sort((a, b) => String(a.asset_ref).localeCompare(String(b.asset_ref), 'en-GB', { numeric: true }))
    })
  }
];

export function reportById(id) {
  return REPORTS.find((report) => report.id === id) ?? REPORTS[0];
}

/**
 * How the Reports page presents REPORTS: three groups, and reports that are
 * the same table cut different ways (by department, type or location) shown
 * as one item with a switch between views. Every report in REPORTS appears
 * exactly once.
 */
export const REPORT_MENU = [
  {
    category: 'Assets',
    blurb: 'What we own, and what it is worth',
    items: [
      {
        id: 'assets_by',
        label: 'Assets by group',
        summary: 'Counts and value by department, type or location',
        viewLabel: 'Group by',
        views: [
          { reportId: 'department', label: 'Department' },
          { reportId: 'device_type', label: 'Device type' },
          { reportId: 'location', label: 'Location' }
        ]
      },
      { id: 'person', label: 'By person', summary: 'Everything one person holds', views: [{ reportId: 'person' }] },
      { id: 'age', label: 'Fleet age', summary: 'How old the kit is', views: [{ reportId: 'age' }] },
      {
        id: 'bought',
        label: 'Spend',
        summary: 'What was bought, by month or by year',
        viewLabel: 'Show',
        views: [
          { reportId: 'purchases_month', label: 'By month' },
          { reportId: 'spend', label: 'By year' }
        ]
      },
      { id: 'retired', label: 'Retired kit', summary: 'Why it went, and whether it was wiped', views: [{ reportId: 'retired' }] }
    ]
  },
  {
    category: 'Repairs',
    blurb: 'What has been fixed, and what it cost',
    items: [
      {
        id: 'repairs',
        label: 'Repairs',
        summary: 'Every repair, or by asset, part or person',
        viewLabel: 'Show',
        views: [
          { reportId: 'repairs_all', label: 'Every repair' },
          { reportId: 'repairs_by_asset', label: 'By asset' },
          { reportId: 'repairs_by_part', label: 'By part' },
          { reportId: 'repairs_by_person', label: 'By person' }
        ]
      }
    ]
  },
  {
    category: 'Cleaning',
    blurb: 'What needs doing, and what has been done',
    items: [
      {
        id: 'due_this_month',
        label: 'Due this month',
        summary: 'To clean by the end of the month',
        views: [{ reportId: 'due_this_month' }]
      },
      {
        id: 'never_cleaned',
        label: 'Never cleaned',
        summary: 'No clean on record at all',
        views: [{ reportId: 'never_cleaned' }]
      },
      {
        id: 'activity',
        label: 'Cleaning activity',
        summary: 'Cleans per month or per person',
        viewLabel: 'Show',
        views: [
          { reportId: 'cleaning_month', label: 'By month' },
          { reportId: 'cleaning_person', label: 'By person' }
        ]
      }
    ]
  },
  {
    category: 'Full exports',
    blurb: 'Complete lists, ready to download',
    items: [
      { id: 'full_register', label: 'Asset register', summary: 'Every asset, every field', views: [{ reportId: 'full_register' }] },
      { id: 'unassigned', label: 'Unassigned assets', summary: 'Spare or waiting to be issued', views: [{ reportId: 'unassigned' }] },
      { id: 'cleaning_queue', label: 'Cleaning list', summary: 'Every laptop and desktop with its dates', views: [{ reportId: 'cleaning_queue' }] },
      { id: 'cleaning_log', label: 'Cleaning history', summary: 'Every clean ever recorded', views: [{ reportId: 'cleaning_log' }] }
    ]
  }
];

export const REPORT_MENU_ITEMS = REPORT_MENU.flatMap((group) =>
  group.items.map((item) => ({ ...item, category: group.category }))
);
