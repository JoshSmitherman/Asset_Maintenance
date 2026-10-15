import { useEffect, useMemo, useState } from 'react';
import { buildCustody, buildTimeline } from '../lib/assetHistory';
import { formatDate, formatTimestamp } from '../lib/dates';
import { removePastEvent } from '../lib/pastEvents';
import PastHistoryForm from './PastHistoryForm';
import ConfirmDialog from './ConfirmDialog';

const KIND_LABEL = {
  created: 'Added',
  start: 'Recording began',
  assign: 'Moved',
  change: 'Changed',
  clean: 'Cleaned',
  retired: 'Retired',
  restored: 'Restored',
  repair: 'Repair',
  past: 'Added later'
};

/** "15 Oct 2024 – 3 Mar 2026", "until 3 Mar 2026" or "15 Oct 2024 – now". */
function custodyRange(segment, isLast) {
  const end = isLast && !segment.earlier ? 'now' : formatDate(segment.end.slice(0, 10));
  return segment.start ? `${formatDate(segment.start.slice(0, 10))} – ${end}` : `until ${end}`;
}

/**
 * Who has had this asset, drawn as a bar - one stretch per person, as wide as
 * they held it - over a newest-first list of everything that happened to it.
 * Names are written on or beside each stretch, so nothing depends on colour.
 */
export default function AssetHistory({
  asset,
  events,
  cleans,
  loading,
  error,
  reload,
  canEdit = false,
  isAdmin = false,
  onToast,
  onEditingChange
}) {
  const custody = useMemo(() => buildCustody(events), [events]);
  const timeline = useMemo(() => buildTimeline(asset, events, cleans), [asset, events, cleans]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);

  // The details window asks before closing over a half-written entry.
  useEffect(() => {
    onEditingChange?.(adding);
  }, [adding, onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);

  if (error) {
    return (
      <div className="alert alert--error" role="alert">
        <span>{error}</span>
      </div>
    );
  }
  if (loading && events.length === 0) {
    return <p className="empty-state">Loading the history…</p>;
  }

  if (adding) {
    return (
      <PastHistoryForm
        assetId={asset.id}
        onCancel={() => setAdding(false)}
        onSaved={(message) => {
          setAdding(false);
          onToast?.({ tone: 'success', message });
          reload?.();
        }}
      />
    );
  }

  return (
    <div className="history">
      {canEdit ? (
        <div className="history__actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setAdding(true)}>
            + Add earlier history
          </button>
        </div>
      ) : null}
      {custody.length > 0 ? (
        <section className="custody" aria-labelledby="custody-title">
          <h3 id="custody-title" className="history__heading">Who has had it</h3>
          <div className="custody__bar">
            {custody.map((segment, index) => {
              const name = segment.owner ?? 'Unassigned';
              const range = custodyRange(segment, index === custody.length - 1);
              return (
                <div
                  key={`${segment.start}-${index}`}
                  className={`custody__segment${segment.owner ? '' : ' custody__segment--none'}${
                    index === custody.length - 1 ? ' custody__segment--current' : ''
                  }${segment.earlier ? ' custody__segment--earlier' : ''}`}
                  // A minimum width keeps a one-day loan visible and clickable.
                  style={{ flexGrow: Math.max(segment.share, 0.06) }}
                  title={`${name}: ${range}`}
                  tabIndex={0}
                  aria-label={`${name}, ${range}`}
                >
                  <span className="custody__name">{name}</span>
                </div>
              );
            })}
          </div>
          <ol className="custody__legend">
            {custody.map((segment, index) => (
              <li key={`${segment.start}-legend-${index}`}>
                <strong>{segment.owner ?? 'Unassigned'}</strong>{' '}
                <span className="cell-muted">
                  {custodyRange(segment, index === custody.length - 1)}
                  {segment.earlier ? ' (added later)' : ''}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="timeline-title">
        <h3 id="timeline-title" className="history__heading">Timeline</h3>
        {timeline.length === 0 ? (
          <p className="empty-state">
            Nothing recorded yet. Moves, changes and cleans will appear here from now on.
          </p>
        ) : (
          <ol className="timeline">
            {timeline.map((entry) => (
              <li key={entry.id} className={`timeline__item timeline__item--${entry.kind}`}>
                <span className="timeline__dot" aria-hidden="true" />
                <div className="timeline__body">
                  <div className="timeline__top">
                    <span className="timeline__title">{entry.title}</span>
                    {KIND_LABEL[entry.kind] ? <span className="timeline__kind">{KIND_LABEL[entry.kind]}</span> : null}
                  </div>
                  {entry.detail ? <p className="timeline__detail">{entry.detail}</p> : null}
                  <p className="timeline__meta">
                    {entry.addedLater ? (
                      <>
                        Added{entry.by ? ` by ${entry.by}` : ''}
                        {entry.addedAt ? ` on ${formatDate(String(entry.addedAt).slice(0, 10))}` : ''}
                        {isAdmin ? (
                          <>
                            {' · '}
                            <button type="button" className="link-button" onClick={() => setRemoving(entry)}>
                              Remove
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {entry.dateOnly ? formatDate(entry.at) : formatTimestamp(entry.at)}
                        {entry.by ? ` · ${entry.by}` : ''}
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {removing ? (
        <ConfirmDialog
          title="Remove from the history"
          message={`Remove "${removing.title}"? It was added by hand; the rest of the history is not affected.`}
          confirmLabel="Remove"
          onConfirm={async () => {
            await removePastEvent(removing.eventId);
            setRemoving(null);
            onToast?.({ tone: 'success', message: 'Removed from the history.' });
            reload?.();
          }}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}
