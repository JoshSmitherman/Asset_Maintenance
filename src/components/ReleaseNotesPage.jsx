import { Fragment, useState } from 'react';
import { CHANGE_TYPES, RELEASES } from '../lib/releaseNotes';
import { formatLongDate } from '../lib/dates';

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
export default function ReleaseNotesPage() {
  const [version, setVersion] = useState(RELEASES[0].version);
  const release = RELEASES.find((item) => item.version === version) ?? RELEASES[0];

  return (
    <div className="release-notes">
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
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
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
