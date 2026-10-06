import { useMemo } from 'react';
import { buildCustody, buildTimeline } from '../lib/assetHistory';
import { formatDate, formatTimestamp } from '../lib/dates';

const KIND_LABEL = {
  created: 'Added',
  start: 'Recording began',
  assign: 'Moved',
  change: 'Changed',
  clean: 'Cleaned',
  retired: 'Retired',
  restored: 'Restored'
};

/**
 * Who has had this asset, drawn as a bar - one stretch per person, as wide as
 * they held it - over a newest-first list of everything that happened to it.
 * Names are written on or beside each stretch, so nothing depends on colour.
 */
export default function AssetHistory({ asset, events, cleans, loading, error }) {
  const custody = useMemo(() => buildCustody(events), [events]);
  const timeline = useMemo(() => buildTimeline(asset, events, cleans), [asset, events, cleans]);

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

  return (
    <div className="history">
      {custody.length > 0 ? (
        <section className="custody" aria-labelledby="custody-title">
          <h3 id="custody-title" className="history__heading">Who has had it</h3>
          <div className="custody__bar">
            {custody.map((segment, index) => {
              const name = segment.owner ?? 'Unassigned';
              const range = `${formatDate(segment.start.slice(0, 10))} – ${
                index === custody.length - 1 ? 'now' : formatDate(segment.end.slice(0, 10))
              }`;
              return (
                <div
                  key={`${segment.start}-${index}`}
                  className={`custody__segment${segment.owner ? '' : ' custody__segment--none'}${
                    index === custody.length - 1 ? ' custody__segment--current' : ''
                  }`}
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
                  {formatDate(segment.start.slice(0, 10))} –{' '}
                  {index === custody.length - 1 ? 'now' : formatDate(segment.end.slice(0, 10))}
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
                    {entry.dateOnly ? formatDate(entry.at) : formatTimestamp(entry.at)}
                    {entry.by ? ` · ${entry.by}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
