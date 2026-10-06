import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { describeDatabaseError } from '../lib/errors';
import { repairPayload } from '../lib/repairs';
import { ATTACHMENTS_BUCKET } from '../lib/attachments';
import { fetchAll } from '../lib/fetchAll';

const COLUMNS =
  'id, asset_id, repaired_on, fault, parts, total_cost, fixed_by, fixed_by_email, notes, created_at, created_by_email, updated_at, updated_by_email';

/**
 * Repairs, newest first: one asset's, for its Repairs tab, or every asset's,
 * for the reports. Only fetched while something is actually showing them.
 */
export function useRepairs({ assetId = null, enabled }) {
  const [state, setState] = useState({ repairs: [], loading: false, error: null });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    setState((current) => ({ ...current, loading: true }));
    const build = () => {
      let query = supabase
        .from('repairs')
        .select(COLUMNS)
        .order('repaired_on', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id');
      if (assetId) query = query.eq('asset_id', assetId);
      return query;
    };

    try {
      const data = await fetchAll(build);
      if (mounted.current) setState({ repairs: data, loading: false, error: null });
    } catch (error) {
      if (mounted.current) setState({ repairs: [], loading: false, error: describeDatabaseError(error) });
    }
  }, [assetId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const saveRepair = useCallback(
    async (values, existing = null) => {
      const payload = repairPayload(values);
      const request = existing
        ? supabase.from('repairs').update(payload).eq('id', existing.id)
        : supabase.from('repairs').insert({ ...payload, asset_id: assetId });
      const { data, error } = await request.select('id').single();
      if (error) throw new Error(describeDatabaseError(error));
      await load();
      return data;
    },
    [assetId, load]
  );

  /**
   * Admins only: for anyone else the database matches nothing. The repair's
   * own files go with it - read first, removed once the delete has happened.
   */
  const deleteRepair = useCallback(
    async (repair) => {
      const { data: files } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('repair_id', repair.id);

      const { data, error } = await supabase.from('repairs').delete().eq('id', repair.id).select('id');
      if (error) throw new Error(describeDatabaseError(error));
      if (!data || data.length === 0) throw new Error('Only an admin can delete a repair.');

      const paths = (files ?? []).map((file) => file.storage_path);
      if (paths.length > 0) await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths);
      await load();
    },
    [load]
  );

  return { ...state, reload: load, saveRepair, deleteRepair };
}
