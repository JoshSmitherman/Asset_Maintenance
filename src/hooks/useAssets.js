import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ASSETS_TABLE, ASSETS_VIEW, isCleaningTracked } from '../lib/constants';
import { decorateAsset, isRetired } from '../lib/assetStatus';
import { ATTACHMENTS_BUCKET } from '../lib/attachments';
import { specPayload } from '../lib/specs';
import { describeDatabaseError } from '../lib/errors';
import { todayIso } from '../lib/dates';
import { chunk, fetchAll } from '../lib/fetchAll';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
// A bulk change to 200 assets arrives as 200 live events; one reload covers
// them all.
const LIVE_RELOAD_DELAY_MS = 800;
// Bulk writes name their rows in the request address, which has a length
// limit; a few thousand ids are sent a batch at a time.
const WRITE_BATCH = 200;

/** Only these columns are ever written; the rest are database-managed. */
function toWritePayload(values) {
  // Cleaning fields only apply to laptops and desktops. Clearing them here
  // means changing an asset's type cannot leave a stale cleaning record behind.
  const tracked = isCleaningTracked(values.device_type);
  const hasCleanRecord = tracked && Boolean(values.date_cleaned);
  const cost = String(values.purchase_cost ?? '').trim();

  return {
    // Specs follow the same rule as the cleaning fields: only the ones that
    // apply to this device type are written.
    ...specPayload(values.device_type, values),
    asset_ref: values.asset_ref.trim(),
    device_type: values.device_type,
    // Blank means unassigned, stored as null so there is one representation
    // of "nobody has this" rather than two.
    owner_name: values.owner_name?.trim() ? values.owner_name.trim() : null,
    department: values.department.trim(),
    location: values.location || null,
    purchase_cost: cost === '' ? null : Number(cost),
    purchase_date: values.purchase_date || null,
    serial_number: values.serial_number?.trim() ? values.serial_number.trim() : null,
    date_cleaned: hasCleanRecord ? values.date_cleaned : null,
    cleaned_by: hasCleanRecord ? values.cleaned_by : null,
    cleaning_interval_months: Number(values.cleaning_interval_months),
    notes: values.notes?.trim() ? values.notes.trim() : null
  };
}

export function useAssets() {
  // Every row, retired kit included. Almost everything works from the active
  // list below, so retired kit drops out of the lists, the cleaning queue,
  // the dashboard and the reports without each of them having to check.
  const [allAssets, setAssets] = useState([]);
  const assets = useMemo(() => allAssets.filter((asset) => !isRetired(asset)), [allAssets]);
  const retiredAssets = useMemo(() => allAssets.filter(isRetired), [allAssets]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const mounted = useRef(true);
  // Each load is numbered. Loads overlap (a save, a live update and a focus
  // can all fire together) and replies can arrive out of order, so only the
  // newest one may update the screen - an older reply would put stale data
  // back over newer.
  const latestLoad = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!supabase) return;
    const ticket = latestLoad.current + 1;
    latestLoad.current = ticket;
    if (quiet) setRefreshing(true);
    try {
      // Every row, a page at a time, ordered by id so pages never overlap;
      // the lists sort for themselves.
      const data = await fetchAll(() => supabase.from(ASSETS_VIEW).select('*').order('id'));
      if (!mounted.current || ticket !== latestLoad.current) return;

      const today = todayIso();
      setAssets(data.map((row) => decorateAsset(row, today)));
      setError(null);
      setLastSyncedAt(new Date());
    } catch (caught) {
      if (mounted.current && ticket === latestLoad.current) setError(describeDatabaseError(caught));
    } finally {
      if (mounted.current && ticket === latestLoad.current) {
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

    let pending = null;
    const channel = supabase
      .channel('assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: ASSETS_TABLE }, () => {
        window.clearTimeout(pending);
        pending = window.setTimeout(() => load({ quiet: true }), LIVE_RELOAD_DELAY_MS);
      })
      .subscribe();

    const interval = window.setInterval(() => load({ quiet: true }), REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearTimeout(pending);
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

  /**
   * Writes only the cleaning columns, for the Cleaning page's Record clean
   * dialog. Leaves the register's own fields - reference, user, location,
   * purchase details - untouched, so the two pages cannot overwrite each
   * other's data.
   */
  const recordClean = useCallback(
    async (id, version, values) => {
      const hasCleanRecord = Boolean(values.date_cleaned);
      const payload = {
        date_cleaned: hasCleanRecord ? values.date_cleaned : null,
        cleaned_by: hasCleanRecord ? values.cleaned_by : null,
        cleaning_interval_months: Number(values.cleaning_interval_months),
        notes: values.notes?.trim() ? values.notes.trim() : null
      };

      const { data, error: writeError } = await supabase
        .from(ASSETS_TABLE)
        .update(payload)
        .eq('id', id)
        .eq('version', version)
        .select('id');

      if (writeError) throw new Error(describeDatabaseError(writeError));
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

  /**
   * Creates several assets in one request - the quantity box on the add form.
   * Postgres applies the insert as a single statement, so either every copy
   * lands or none does, and a duplicate reference cannot leave half a batch
   * behind.
   */
  const createAssets = useCallback(
    async (rows) => {
      const payloads = rows.map((values) => toWritePayload(values));
      const { data, error: insertError } = await supabase
        .from(ASSETS_TABLE)
        .insert(payloads)
        .select('id');

      if (insertError) {
        throw new Error(describeDatabaseError(insertError, { batch: payloads.length > 1, assetRef: payloads[0]?.asset_ref }));
      }
      await load({ quiet: true });
      return data;
    },
    [load]
  );

  /**
   * Applies one change to many rows.
   *
   * Unlike a single edit this does not check each row's version: a bulk action
   * is a deliberate "do this to all of these", and failing the lot because a
   * colleague touched one of them would be worse than applying it. The rows
   * are reloaded afterwards either way.
   */
  const bulkUpdate = useCallback(
    async (ids, payload) => {
      let changed = 0;
      try {
        for (const batch of chunk(ids, WRITE_BATCH)) {
          const { data, error: writeError } = await supabase
            .from(ASSETS_TABLE)
            .update(payload)
            .in('id', batch)
            .select('id');
          if (writeError) {
            const message = describeDatabaseError(writeError);
            throw new Error(
              changed > 0 ? `${changed} of ${ids.length} were updated before this stopped: ${message}` : message
            );
          }
          changed += data?.length ?? 0;
        }
      } finally {
        await load({ quiet: true });
      }
      return changed;
    },
    [load]
  );

  const bulkAssign = useCallback(
    (ids, ownerName) => bulkUpdate(ids, { owner_name: ownerName?.trim() ? ownerName.trim() : null }),
    [bulkUpdate]
  );

  const bulkRecordClean = useCallback(
    (ids, { date_cleaned, cleaned_by }) => bulkUpdate(ids, { date_cleaned, cleaned_by }),
    [bulkUpdate]
  );

  /** One spelling for a model across many assets, from the tidy-up tool. */
  const bulkRenameModel = useCallback(
    (ids, { brand, model }) =>
      bulkUpdate(ids, {
        spec_brand: brand?.trim() ? brand.trim() : null,
        spec_model: model?.trim() ? model.trim() : null
      }),
    [bulkUpdate]
  );

  /**
   * Retires kit: it leaves every list but keeps its record. Anyone may do
   * this; the database stamps who did.
   */
  const retireAssets = useCallback(
    async (ids, { retired_on, retired_reason, retired_notes, data_wiped, data_wiped_by }) =>
      bulkUpdate(ids, {
        retired_on,
        retired_reason,
        retired_notes: retired_notes?.trim() ? retired_notes.trim() : null,
        data_wiped: Boolean(data_wiped),
        data_wiped_by: data_wiped ? data_wiped_by || null : null
      }),
    [bulkUpdate]
  );

  /** Brings retired kit back. Admins only - the database refuses anyone else. */
  const restoreAsset = useCallback(
    async (id) => {
      const count = await bulkUpdate([id], { retired_on: null });
      if (count === 0) throw new Error('Only an admin can restore retired kit.');
      return count;
    },
    [bulkUpdate]
  );

  /**
   * Deletes assets outright. Admins only: for anyone else the database
   * matches no rows, which is reported rather than passed off as success.
   *
   * Attached files live in Storage, not the table, so their paths are read
   * first and the files removed once the delete has actually happened -
   * never before, or a refused delete would still lose the files.
   */
  const bulkDelete = useCallback(
    async (ids) => {
      const files = [];
      let deleted = 0;
      for (const batch of chunk(ids, WRITE_BATCH)) {
        const { data: batchFiles } = await supabase
          .from('attachments')
          .select('storage_path')
          .in('asset_id', batch);
        files.push(...(batchFiles ?? []));

        const { data, error: deleteError } = await supabase
          .from(ASSETS_TABLE)
          .delete()
          .in('id', batch)
          .select('id');
        if (deleteError) throw new Error(describeDatabaseError(deleteError));
        deleted += data?.length ?? 0;
      }

      if (deleted === 0) {
        throw new Error('Only an admin can delete assets. Retire it instead to take it out of use.');
      }

      const paths = files.map((file) => file.storage_path);
      for (const batch of chunk(paths, WRITE_BATCH)) {
        // Best effort: a file left behind is harmless, and removable later.
        await supabase.storage.from(ATTACHMENTS_BUCKET).remove(batch);
      }

      await load({ quiet: true });
      return deleted;
    },
    [load]
  );

  const deleteAsset = useCallback((id) => bulkDelete([id]), [bulkDelete]);

  /** Case-insensitive duplicate check before we even hit the database.
   *  Retired kit keeps its reference, so it counts. */
  const assetRefExists = useCallback(
    (assetRef, ignoreId = null) => {
      const needle = assetRef.trim().toUpperCase();
      return allAssets.some(
        (asset) => asset.id !== ignoreId && String(asset.asset_ref).trim().toUpperCase() === needle
      );
    },
    [allAssets]
  );

  return useMemo(
    () => ({
      assets,
      allAssets,
      retiredAssets,
      loading,
      refreshing,
      error,
      lastSyncedAt,
      refresh: () => load({ quiet: true }),
      createAsset,
      createAssets,
      updateAsset,
      recordClean,
      bulkAssign,
      bulkRenameModel,
      bulkRecordClean,
      bulkDelete,
      deleteAsset,
      retireAssets,
      restoreAsset,
      assetRefExists
    }),
    [
      assets, allAssets, retiredAssets, loading, refreshing, error, lastSyncedAt, load,
      createAsset, createAssets, updateAsset, recordClean,
      bulkAssign, bulkRenameModel, bulkRecordClean, bulkDelete, deleteAsset,
      retireAssets, restoreAsset, assetRefExists
    ]
  );
}
