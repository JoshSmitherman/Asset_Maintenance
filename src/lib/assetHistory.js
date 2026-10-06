// Turns the raw history rows for one asset (asset_events and cleaning_log,
// see supabase/setup.sql section 6b) into what the History tab draws: a
// custody bar of who held it and when, and a newest-first list of events.

import { formatDate, parseIsoDate } from './dates';

/** Milliseconds for a timestamp or a plain "YYYY-MM-DD" date (taken as midday,
 *  so a clean on the same day as a change sorts sensibly either side). */
function toMs(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const date = parseIsoDate(value);
    return date ? date.getTime() + 12 * 60 * 60 * 1000 : null;
  }
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const FIELD_LABELS = {
  purchase_cost: 'purchase cost',
  purchase_date: 'purchase date',
  cleaning_interval_months: 'cleaning interval',
  notes: 'notes',
  serial_number: 'serial number',
  retired_reason: 'retirement reason',
  retired_notes: 'retirement notes',
  retired_on: 'retirement date',
  data_wiped: 'data wiped'
};
function fieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  if (key.startsWith('spec_')) return key.slice(5).replace(/_/g, ' ');
  return key.replace(/_/g, ' ');
}

const blank = (value) => (value === null || value === undefined || value === '' ? null : value);

function describeEvent(event) {
  const from = blank(event.old_value);
  const to = blank(event.new_value);
  switch (event.event_type) {
    case 'created': {
      const owner = blank(event.details?.owner);
      return {
        kind: 'created',
        title: 'Added to the register',
        detail: [owner ? `With ${owner}` : 'Unassigned', event.details?.department, event.details?.location]
          .filter(Boolean)
          .join(' · ')
      };
    }
    case 'tracking_started': {
      const owner = blank(event.details?.owner);
      return {
        kind: 'start',
        title: 'History recording began',
        detail: `${owner ? `With ${owner}` : 'Unassigned'} at this point. Earlier moves were not recorded.`
      };
    }
    case 'owner':
      return {
        kind: 'assign',
        title: to ? `Assigned to ${to}` : 'Unassigned',
        detail: from ? `Previously with ${from}` : 'Previously unassigned'
      };
    case 'department':
      return { kind: 'change', title: `Department: ${to ?? '—'}`, detail: from ? `Was ${from}` : null };
    case 'location':
      return { kind: 'change', title: `Location: ${to ?? 'not recorded'}`, detail: from ? `Was ${from}` : null };
    case 'device_type':
      return { kind: 'change', title: `Device type: ${to ?? '—'}`, detail: from ? `Was ${from}` : null };
    case 'asset_ref':
      return { kind: 'change', title: `Renamed to ${to ?? '—'}`, detail: from ? `Was ${from}` : null };
    case 'retired': {
      const details = event.details ?? {};
      const wiped = details.data_wiped
        ? `Data wiped${details.data_wiped_by ? ` by ${details.data_wiped_by}` : ''}`
        : 'Data not recorded as wiped';
      return {
        kind: 'retired',
        title: `Retired${details.reason ? `: ${details.reason}` : ''}`,
        detail: [wiped, blank(details.notes)].filter(Boolean).join(' · ')
      };
    }
    case 'restored':
      return { kind: 'restored', title: 'Brought back into use', detail: null };
    case 'edited': {
      // Fields changed in one save, from the full change record.
      const fields = Object.keys(event.details?.fields ?? {});
      return {
        kind: 'change',
        title: 'Details edited',
        detail: fields.length ? `Changed: ${fields.map(fieldLabel).join(', ')}` : null
      };
    }
    case 'repair_added':
    case 'repair_edited':
    case 'repair_deleted': {
      const details = event.details ?? {};
      const verb = { repair_added: 'Repair logged', repair_edited: 'Repair changed', repair_deleted: 'Repair deleted' }[
        event.event_type
      ];
      const cost = Number(details.total_cost);
      return {
        kind: 'repair',
        title: `${verb}${details.fault ? `: ${details.fault}` : ''}`,
        detail: [
          details.repaired_on ? `Repaired ${formatDate(details.repaired_on)}` : null,
          Number.isFinite(cost) && cost > 0 ? `parts £${cost.toFixed(2)}` : null,
          details.fixed_by ? `by ${details.fixed_by}` : null
        ]
          .filter(Boolean)
          .join(' · ')
      };
    }
    default:
      return { kind: 'change', title: 'Changed', detail: null };
  }
}

/**
 * Every event for the asset, newest first: its changes, its cleans and its
 * purchase. Each entry has { id, kind, title, detail, at, dateOnly, by }.
 */
export function buildTimeline(asset, events = [], cleans = []) {
  const entries = [];

  for (const event of events) {
    entries.push({
      id: `e-${event.id}`,
      ...describeEvent(event),
      at: event.happened_at,
      dateOnly: false,
      by: event.actor_email || null
    });
  }

  for (const clean of cleans) {
    entries.push({
      id: `c-${clean.id}`,
      kind: 'clean',
      title: `Cleaned by ${clean.cleaned_by}`,
      detail: null,
      at: clean.cleaned_on,
      dateOnly: true,
      by: clean.logged_by_email || null
    });
  }

  if (asset?.purchase_date) {
    entries.push({
      id: 'purchase',
      kind: 'purchase',
      title: 'Purchased',
      detail: null,
      at: asset.purchase_date,
      dateOnly: true,
      by: null
    });
  }

  return entries
    .map((entry, index) => ({ entry, index, ms: toMs(entry.at) ?? 0 }))
    // Ties (several changes saved together) keep their recorded order.
    .sort((a, b) => b.ms - a.ms || b.index - a.index)
    .map(({ entry }) => entry);
}

/**
 * Who held the asset, as consecutive stretches from when history begins up to
 * `now`. Each segment is { owner, start, end, share } where owner is null for
 * unassigned and share is its fraction of the whole span (0..1).
 */
export function buildCustody(events = [], now = new Date()) {
  const ordered = events
    .map((event, index) => ({ event, index, ms: toMs(event.happened_at) }))
    .filter((item) => item.ms !== null)
    .sort((a, b) => a.ms - b.ms || a.index - b.index);

  const origin = ordered.find(
    ({ event }) => event.event_type === 'created' || event.event_type === 'tracking_started'
  );
  if (!origin) return [];

  const endMs = Math.max(now.getTime(), origin.ms);
  const segments = [];
  let owner = blank(origin.event.details?.owner);
  let startMs = origin.ms;

  for (const { event, ms } of ordered) {
    if (event.event_type !== 'owner' || ms < origin.ms) continue;
    const next = blank(event.new_value);
    if (next === owner) continue;
    if (ms > startMs) segments.push({ owner, startMs, endMs: ms });
    owner = next;
    startMs = ms;
  }
  segments.push({ owner, startMs, endMs: Math.max(endMs, startMs) });

  const total = segments.reduce((sum, segment) => sum + (segment.endMs - segment.startMs), 0);
  return segments.map((segment) => ({
    owner: segment.owner,
    start: new Date(segment.startMs).toISOString(),
    end: new Date(segment.endMs).toISOString(),
    share: total > 0 ? (segment.endMs - segment.startMs) / total : 1 / segments.length
  }));
}
