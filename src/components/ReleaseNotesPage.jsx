import { Fragment, useEffect, useState } from 'react';
import { CHANGE_TYPES, CURRENT_VERSION, RELEASES } from '../lib/releaseNotes';
import { REPO_URL } from '../lib/releaseMarkdown';
import { setVersionInAddress, versionFromSearch } from '../lib/releaseLinks';
import { formatLongDate, formatTimestamp } from '../lib/dates';

// Stamped in by vite.config.js at build time; absent in tests and local runs.
const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || null;
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || null;

/** Where this version came from: its GitHub release, and for the one running
 *  now, the exact code it was built from and when. */
function BuildFooter({ version }) {
  const tagUrl = `${REPO_URL}/releases/tag/v${version}`;
  return (
    <footer className="release__builds">
      {version === CURRENT_VERSION && BUILD_SHA ? (
        <p>
          v{version} is the version running now, built
          {BUILD_TIME ? ` ${formatTimestamp(BUILD_TIME)}` : ''} from code{' '}
          <a href={`${REPO_URL}/commit/${BUILD_SHA}`} target="_blank" rel="noreferrer">
            <code>{BUILD_SHA.slice(0, 7)}</code>
          </a>
          .
        </p>
      ) : null}
      <p>
        <a href={tagUrl} target="_blank" rel="noreferrer">v{version} on GitHub</a>
        {' '}- the code exactly as it was released.
      </p>
    </footer>
  );
}

/** "**Bold** and plain" -> text with <strong> where the asterisks were. */
function RichText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>
  );
}

/**
 * What changed in each version, newest first, one version at a time - pick
 * another from the list. The notes themselves live in src/lib/releaseNotes.js.
 */
export default function ReleaseNotesPage({ onBack }) {
  const [version, setVersion] = useState(() => versionFromSearch() ?? RELEASES[0].version);
  const release = RELEASES.find((item) => item.version === version) ?? RELEASES[0];

  // The address follows the version shown, so it can be copied and shared;
  // leaving the page takes it off again.
  useEffect(() => {
    setVersionInAddress(release.version);
  }, [release.version]);
  useEffect(() => () => setVersionInAddress(null), []);

  return (
    <div className="release-notes">
      {onBack ? (
        <button type="button" className="link-button release-notes__back" onClick={onBack}>
          ← Back to the dashboard
        </button>
      ) : null}
      <h2 className="release-notes__title">Release Notes</h2>

      <div className="release-notes__layout">
        <article className="card release" aria-labelledby="release-version">
          <h3 id="release-version" className="release__version">{release.version}</h3>
          <p className="release__name">{release.title}</p>
          <p className="release__date">{formatLongDate(release.date)}</p>

          {release.sections.map((section) => (
            <section key={section.area} className="release__area">
              <h4 className="release__area-title">{section.area}</h4>
              {section.groups.map((group) => (
                <div key={group.heading} className="release__group">
                  <h5 className="release__group-title">{group.heading}</h5>
                  <ul className="release__items">
                    {group.items.map((item, index) => (
                      <li key={index} className="release__item">
                        <span className={`change-badge change-badge--${item.type}`}>
                          {CHANGE_TYPES[item.type]}
                        </span>
                        <span className="release__text">
                          <RichText text={item.text} />
                        </span>
                        {item.details?.length ? (
                          <ul className="release__details">
                            {item.details.map((detail, detailIndex) => (
                              <li key={detailIndex}>
                                <span className="release__detail-mark" aria-hidden="true">↳</span>
                                <RichText text={detail} />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}

          <BuildFooter version={release.version} />
        </article>

        <div className="release-notes__picker">
          <label className="sr-only" htmlFor="release-version-select">Version</label>
          <select
            id="release-version-select"
            className="select"
            value={release.version}
            onChange={(event) => setVersion(event.target.value)}
          >
            {RELEASES.map((item) => (
              <option key={item.version} value={item.version}>
                {item.version}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
