import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { describeDatabaseError } from '../lib/errors';
import { ATTACHMENTS_BUCKET, attachmentProblem, storagePathFor } from '../lib/attachments';

const COLUMNS = 'id, asset_id, repair_id, storage_path, file_name, content_type, size_bytes, uploaded_at, uploaded_by, uploaded_by_email';

/** How long a link to open a private file stays valid. */
const LINK_SECONDS = 120;

/**
 * Every file attached to one asset - its own and its repairs' - in one
 * request; the Files tab and each repair pick out their own.
 */
export function useAttachments({ assetId, enabled }) {
  const [state, setState] = useState({ attachments: [], loading: false, error: null });
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
    const { data, error } = await supabase
      .from('attachments')
      .select(COLUMNS)
      .eq('asset_id', assetId)
      .order('uploaded_at', { ascending: false });
    if (!mounted.current) return;
    setState({
      attachments: data ?? [],
      loading: false,
      error: error ? describeDatabaseError(error) : null
    });
  }, [assetId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  /**
   * Uploads the file, then records it. If the record cannot be saved the
   * file is taken back out, so Storage never fills with files nothing
   * points to.
   */
  const upload = useCallback(
    async (file, { repairId = null } = {}) => {
      const problem = attachmentProblem(file);
      if (problem) throw new Error(problem);

      const path = storagePathFor(assetId, file.name, { repairId });
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Could not upload ${file.name}: ${uploadError.message}`);

      const { error: recordError } = await supabase.from('attachments').insert({
        asset_id: assetId,
        repair_id: repairId,
        storage_path: path,
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size
      });
      if (recordError) {
        await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
        throw new Error(describeDatabaseError(recordError));
      }
      await load();
    },
    [assetId, load]
  );

  /** The person who added it, or an admin. Anyone else matches nothing. */
  const remove = useCallback(
    async (attachment) => {
      const { error: fileError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([attachment.storage_path]);
      if (fileError) throw new Error(`Could not remove ${attachment.file_name}: ${fileError.message}`);

      const { data, error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id)
        .select('id');
      if (error) throw new Error(describeDatabaseError(error));
      if (!data || data.length === 0) {
        throw new Error('Only the person who added a file, or an admin, can remove it.');
      }
      await load();
    },
    [load]
  );

  /** A short-lived link to a private file. */
  const linkFor = useCallback(async (attachment) => {
    const { data, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(attachment.storage_path, LINK_SECONDS);
    if (error || !data?.signedUrl) throw new Error(`Could not open ${attachment.file_name}.`);
    return data.signedUrl;
  }, []);

  return { ...state, reload: load, upload, remove, linkFor };
}
