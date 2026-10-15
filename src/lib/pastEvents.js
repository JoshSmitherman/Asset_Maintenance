// Earlier history added by hand: who had an asset before Orbit knew about it,
// and dated notes. The database (add_past_event in supabase/setup.sql) checks
// everything and marks each entry as added later.
import { supabase } from './supabaseClient';
import { describeDatabaseError } from './errors';

async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(describeDatabaseError(error));
  return data;
}

/** "Sarah Jones had it from (optionally) `from` until `to`." */
export function addPastOwner(assetId, { owner, from = null, to, note = null }) {
  return call('add_past_event', {
    p_asset_id: assetId,
    p_kind: 'past_owner',
    p_owner: owner,
    p_from: from || null,
    p_to: to,
    p_note: note || null
  });
}

/** A dated note: "Bought for the Leeds office". */
export function addPastNote(assetId, { date, note }) {
  return call('add_past_event', {
    p_asset_id: assetId,
    p_kind: 'past_note',
    p_owner: null,
    p_from: null,
    p_to: date,
    p_note: note
  });
}

/** Admins only, and only entries added by hand. */
export function removePastEvent(eventId) {
  return call('remove_past_event', { p_event_id: eventId });
}

export const isPastEvent = (event) => event?.event_type === 'past_owner' || event?.event_type === 'past_note';
