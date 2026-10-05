import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { describeDatabaseError } from '../lib/errors';

/**
 * One asset's history: its recorded changes (asset_events) and its cleans
 * (cleaning_log). Both are written by database triggers, never by the app.
 * Only fetched while the History tab is open.
 */
export function useAssetHistory(assetId, { enabled }) {
  const [state, setState] = useState({ events: [], cleans: [], loading: false, error: null });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!supabase || !assetId) return;
    setState((current) => ({ ...current, loading: true }));
    const [events, cleans] = await Promise.all([
      supabase
        .from('asset_events')
        .select('id, event_type, old_value, new_value, details, happened_at, actor_email')
        .eq('asset_id', assetId)
        .order('happened_at', { ascending: true })
        .limit(500),
      supabase
        .from('cleaning_log')
        .select('id, cleaned_on, cleaned_by, logged_by_email')
        .eq('asset_id', assetId)
        .order('cleaned_on', { ascending: true })
        .limit(500)
    ]);
    if (!mounted.current) return;
    const failure = events.error || cleans.error;
    setState({
      events: events.data ?? [],
      cleans: cleans.data ?? [],
      loading: false,
      error: failure ? describeDatabaseError(failure) : null
    });
  }, [assetId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return state;
}
