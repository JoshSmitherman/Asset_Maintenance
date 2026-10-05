import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ATTACHMENT_ACCEPT, ATTACHMENT_TYPES, attachmentProblem, formatBytes, isImage } from '../lib/attachments';
import { formatTimestamp } from '../lib/dates';
import { displayNameFromEmail } from '../lib/accountName';

/**
 * A list of files with a button to add more. Used on the asset's Files tab
 * and under each repair. Files are private: opening one fetches a link that
 * only works for a couple of minutes.
 */
export default function AttachmentList({
  attachments,
  onUpload,
  onRemove,
  onOpen,
  isAdmin = false,
  readOnly = false,
  uploadLabel = 'Attach a file',
  emptyMessage = 'No files attached.',
  describe
}) {
  const { user } = useAuth();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const pick = async (event) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length === 0) return;

    // Turn away the wrong files before any upload starts.
    const refused = files.map(attachmentProblem).find(Boolean);
    if (refused) {
      setProblem(refused);
      return;
    }

    setProblem(null);
    setBusy(true);
    try {
      for (const file of files) await onUpload(file);
    } catch (caught) {
      setProblem(caught.message);
    } finally {
      setBusy(false);
    }
  };

  const open = async (attachment) => {
    // Opened straight away, so a pop-up blocker treats it as the click it is;
    // the private link is filled in once it arrives.
    const tab = window.open('', '_blank');
    try {
      const url = await onOpen(attachment);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (caught) {
      tab?.close();
      setProblem(caught.message);
    }
  };

  const remove = async (attachment) => {
    setBusy(true);
    setProblem(null);
    try {
      await onRemove(attachment);
      setConfirming(null);
    } catch (caught) {
      setProblem(caught.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="attachments">
      {attachments.length === 0 ? (
        <p className="attachments__empty">{emptyMessage}</p>
      ) : (
        <ul className="attachments__list">
          {attachments.map((attachment) => {
            const canRemove = !readOnly && (isAdmin || attachment.uploaded_by === user?.id);
            return (
              <li key={attachment.id} className="attachment">
                <span className="attachment__kind" aria-hidden="true">
                  {isImage(attachment.content_type) ? 'IMG' : 'PDF'}
                </span>
                <div className="attachment__body">
                  <button
                    type="button"
                    className="attachment__name"
                    onClick={() => open(attachment)}
                    title={`Open ${attachment.file_name}`}
                  >
                    {attachment.file_name}
                  </button>
                  <span className="attachment__meta">
                    {[
                      ATTACHMENT_TYPES[attachment.content_type],
                      formatBytes(attachment.size_bytes),
                      describe?.(attachment),
                      `added ${formatTimestamp(attachment.uploaded_at)}`,
                      attachment.uploaded_by_email ? `by ${displayNameFromEmail(attachment.uploaded_by_email)}` : null
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {canRemove ? (
                  confirming === attachment.id ? (
                    <span className="attachment__confirm">
                      <button
                        type="button"
                        className="btn btn--small btn--danger-ghost"
                        onClick={() => remove(attachment)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        className="btn btn--small btn--ghost"
                        onClick={() => setConfirming(null)}
                        disabled={busy}
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      onClick={() => setConfirming(attachment.id)}
                      aria-label={`Remove ${attachment.file_name}`}
                    >
                      Remove
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {problem ? <p className="form-error" role="alert">{problem}</p> : null}

      {readOnly ? null : (
        <>
          <input
            ref={input}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            className="sr-only"
            onChange={pick}
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            {busy ? 'Working…' : `+ ${uploadLabel}`}
          </button>
          <span className="field__hint attachments__hint">Photos or PDFs, up to 10 MB each.</span>
        </>
      )}
    </div>
  );
}
