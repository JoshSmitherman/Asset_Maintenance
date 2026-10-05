import { useMemo, useState } from 'react';
import { pairKey, similarModelGroups } from '../lib/modelNames';

const STORAGE_KEY = 'model-names-not-same';

// Pairs someone has said are genuinely different models (a ThinkPad T14 and
// a T14s, say). Kept in this browser only: forgetting them just means the
// pair is suggested again, which is harmless.
function loadNotSame() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveNotSame(set) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
}

const describeRefs = (refs) =>
  refs.slice(0, 4).join(', ') + (refs.length > 4 ? ` and ${refs.length - 4} more` : '');

/**
 * Finds models on the register spelt more than one way and merges them into
 * one spelling, so the spec memory and reports see one model, not two.
 */
export default function ModelNameTidy({ specMemory, onMerge, onToast }) {
  const [notSame, setNotSame] = useState(loadNotSame);
  const [keep, setKeep] = useState({}); // group id -> key of the spelling to keep
  const [busy, setBusy] = useState(null);

  const groups = useMemo(() => similarModelGroups(specMemory, notSame), [specMemory, notSame]);

  const markDifferent = (group) => {
    const next = new Set(notSame);
    for (let i = 0; i < group.members.length; i += 1) {
      for (let j = i + 1; j < group.members.length; j += 1) {
        next.add(pairKey(group.members[i].key, group.members[j].key));
      }
    }
    saveNotSame(next);
    setNotSame(next);
  };

  const merge = async (group) => {
    const target = group.members.find((entry) => entry.key === keep[group.id]) ?? group.members[0];
    const ids = group.members.filter((entry) => entry !== target).flatMap((entry) => entry.ids);
    setBusy(group.id);
    try {
      const count = await onMerge(ids, { brand: target.brand, model: target.model });
      onToast({
        tone: 'success',
        message: `${count} asset${count === 1 ? '' : 's'} renamed to ${target.label}.`
      });
    } catch (caught) {
      onToast({ tone: 'error', message: caught.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Tidy model names</h2>
          <p className="card__subtitle">
            Models that look like the same machine spelt differently. Pick the spelling to keep and
            merge, so specs are remembered as one model.
          </p>
        </div>
        <span className={`pill${groups.length ? ' pill--overdue' : ''}`}>{groups.length}</span>
      </div>

      {groups.length === 0 ? (
        <p className="empty-state">Every model name on the register is spelt one way. Nothing to tidy.</p>
      ) : (
        <ul className="tidy-list">
          {groups.map((group) => {
            const chosen = keep[group.id] ?? group.members[0].key;
            const target = group.members.find((entry) => entry.key === chosen) ?? group.members[0];
            const moving = group.members.filter((entry) => entry !== target).reduce((sum, entry) => sum + entry.count, 0);
            return (
              <li key={group.id} className="tidy-group">
                <fieldset className="tidy-group__choices" disabled={busy === group.id}>
                  <legend className="tidy-group__legend">{group.deviceType}: keep which spelling?</legend>
                  {group.members.map((entry) => (
                    <label key={entry.key} className="tidy-group__choice">
                      <input
                        type="radio"
                        name={group.id}
                        value={entry.key}
                        checked={entry.key === chosen}
                        onChange={() => setKeep((current) => ({ ...current, [group.id]: entry.key }))}
                      />
                      <span>
                        <strong>{entry.label}</strong>{' '}
                        <span className="cell-muted">
                          {entry.count} asset{entry.count === 1 ? '' : 's'}: {describeRefs(entry.refs)}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="tidy-group__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => markDifferent(group)}
                    disabled={busy === group.id}
                  >
                    These are different models
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => merge(group)}
                    disabled={busy === group.id}
                  >
                    {busy === group.id
                      ? 'Merging…'
                      : `Rename ${moving} asset${moving === 1 ? '' : 's'} to ${target.label}`}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
