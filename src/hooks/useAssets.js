import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ASSETS_TABLE, ASSETS_VIEW, isCleaningTracked } from '../lib/constants';
import { decorateAsset } from '../lib/assetStatus';
import { describeDatabaseError } from '../lib/errors';
import { todayIso } from '../lib/dates';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/** Only these columns are ever written; the rest are database-managed. */
function toWritePayload(values) {
  // Cleaning fields only apply to laptops and desktops. Clearing them here
  // means changing an asset's type cannot leave a stale cleaning record behind.
  const tracked = isCleaningTracked(values.device_type);
  const hasCleanRecord = tracked && Boolean(values.date_cleaned);
  const cost = String(values.purchase_cost ?? '').trim();

  return {
    asset_ref: values.asset_ref.trim(),
    device_type: values.device_type,
    owner_name: values.owner_name.trim(),
    department: values.department.trim(),
    location: values.location || null,
    purchase_cost: cost === '' ? null : Number(cost),
    purchase_date: values.purchase_date || null,
    date_cleaned: hasCleanRecord ? values.date_cleaned : null,
    cleaned_by: hasCleanRecord ? values.cleaned_by : null,
    cleaning_interval_months: Number(values.cleaning_interval_months),
    notes: values.notes?.trim() ? values.notes.trim() : null
  };
}

export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!supabase) return;
    if (quiet) setRefreshing(true);
    try {
      const { data, error: queryError } = await supabase
        .from(ASSETS_VIEW)
        .select('*')
        .order('next_clean_due', { ascending: true, nullsFirst: true });

      if (queryError) throw queryError;
      if (!mounted.current) return;

      const today = todayIso();
      setAssets((data ?? []).map((row) => decorateAsset(row, today)));
      setError(null);
      setLastSyncedAt(new Date());
    } catch (caught) {
      if (mounted.current) setError(describeDatabaseError(caught));
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Initial load.
  useEffect(() => {
    load();
  }, [load]);

  // Live updates from other signed-in users, plus a safety-net poll and a
  // refresh whenever the tab regains focus (covers laptops waking from sleep).
  useEffect(() => {
    if (!supabase) return undefined;

    const channel = supabase
      .channel('assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: ASSETS_TABLE }, () => {
        load({ quiet: true });
      })
      .subscribe();

    const interval = window.setInterval(() => load({ quiet: true }), REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  const createAsset = useCallback(
    async (values) => {
      const payload = toWritePayload(values);
      const { data, error: insertError } = await supabase
        .from(ASSETS_TABLE)
        .insert(payload)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(describeDatabaseError(insertError, { assetRef: payload.asset_ref }));
      }
      await load({ quiet: true });
      return data;
    },
    [load]
  );

  const updateAsset = useCallback(
    async (id, version, values) => {
      const payload = toWritePayload(values);
      // Optimistic concurrency: the update only matches while the row is still
      // at the version this browser last read.
      const { data, error: updateError } = await supabase
        .from(ASSETS_TABLE)
        .update(payload)
        .eq('id', id)
        .eq('version', version)
        .select('id');

      if (updateError) {
        throw new Error(describeDatabaseError(updateError, { assetRef: payload.asset_ref }));
      }
      if (!data || data.length === 0) {
        await load({ quiet: true });
        throw new Error(
          'Someone else updated this asset while you were editing it. The latest version has been reloaded - please reapply your changes.'
        );
      }
      await load({ quiet: true });
      return data[0];
    },
    [load]
  );

  const deleteAsset = useCallback(
    async (id) => {
      const { error: deleteError } = await supabase.from(ASSETS_TABLE).delete().eq('id', id);
      if (deleteError) throw new Error(describeDatabaseError(deleteError));
      await load({ quiet: true });
    },
    [load]
  );

  /** Case-insensitive duplicate check before we even hit the database. */
  const assetRefExists = useCallback(
    (assetRef, ignoreId = null) => {
      const needle = assetRef.trim().toUpperCase();
      return assets.some(
        (asset) => asset.id !== ignoreId && String(asset.asset_ref).trim().toUpperCase() === needle
      );
    },
    [assets]
  );

  return useMemo(
    () => ({
      assets,
      loading,
      refreshing,
      error,
      lastSyncedAt,
      refresh: () => load({ quiet: true }),
      createAsset,
      updateAsset,
      deleteAsset,
      assetRefExists
    }),
    [assets, loading, refreshing, error, lastSyncedAt, load, createAsset, updateAsset, deleteAsset, assetRefExists]
  );
}
