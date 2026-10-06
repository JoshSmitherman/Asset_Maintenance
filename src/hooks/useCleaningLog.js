import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { describeDatabaseError } from '../lib/errors';
import { fetchAll } from '../lib/fetchAll';

const CLEANING_LOG_TABLE = 'cleaning_log';

/**
 * The cleaning history: one row per clean, newest first.
 *
 * Written by a database trigger rather than by the app (see
 * supabase/setup.sql, section 6), so it records every clean
 * however it was recorded - one at a time, or a whole batch at once.
 */
export function useCleaningLog({ enabled }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAll(() =>
        supabase
          .from(CLEANING_LOG_TABLE)
          .select('id, asset_ref, device_type, cleaned_on, cleaned_by, logged_at, logged_by_email')
          .order('cleaned_on', { ascending: false })
          .order('logged_at', { ascending: false })
          .order('id')
      );
      if (!mounted.current) return;
      setError(null);
      setEntries(data);
    } catch (readError) {
      if (!mounted.current) return;
      setError(describeDatabaseError(readError));
      setEntries([]);
    }
    setLoading(false);
  }, []);

  // Only fetched once the history is actually looked at - most visits to the
  // cleaning page are to do the work, not to read about it.
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return useMemo(
    () => ({ entries, loading, error, refresh: load }),
    [entries, loading, error, load]
  );
}
