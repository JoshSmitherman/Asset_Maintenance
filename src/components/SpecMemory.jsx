import { useState } from 'react';
import { matchKnownModel } from '../lib/specs';

/**
 * Copies a specification from kit already on the register. Free and instant:
 * nothing leaves the browser - it reads the assets the app has already
 * loaded. When the Brand and Model typed match something recorded before it
 * offers that model's specs straight away; otherwise any known model can be
 * picked from the list. Only empty boxes are filled, and all stay editable.
 */
export default function SpecMemory({ models = [], brand, model, onApply, disabled }) {
  const [message, setMessage] = useState(null);
  const match = matchKnownModel(models, brand, model);

  const apply = (entry) => {
    const { filled, kept } = onApply(entry.specs);
    const from = entry.refs.slice(0, 3).join(', ') + (entry.refs.length > 3 ? ` and ${entry.refs.length - 3} more` : '');
    setMessage(
      filled.length
        ? `Filled ${filled.length} field${filled.length === 1 ? '' : 's'} from ${from}.` +
            (kept.length ? ` Kept ${kept.length} you had already entered.` : '') +
            ' Check them before saving.'
        : `Nothing new to fill in from ${from}.`
    );
  };

  if (models.length === 0) {
    return (
      <p className="field__hint field--full">
        Once a model's specification is recorded here, adding another of the same model can copy it.
      </p>
    );
  }

  return (
    <div className="spec-memory field--full">
      {match ? (
        <div className="spec-memory__row spec-memory__row--match">
          <span>
            <strong>{match.label}</strong> is already on the register ({match.count}).
          </span>
          <button type="button" className="btn btn--brand-light btn--small" onClick={() => apply(match)} disabled={disabled}>
            Fill in its specs
          </button>
        </div>
      ) : (
        <>
          <label className="field__label" htmlFor="spec_memory">Copy specs from a model you already have</label>
          <select
            id="spec_memory"
            className="select"
            value=""
            onChange={(event) => {
              const entry = models.find((item) => item.key === event.target.value);
              if (entry) apply(entry);
            }}
            disabled={disabled}
          >
            <option value="">— Choose a model —</option>
            {models.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label} ({entry.count} on the register)
              </option>
            ))}
          </select>
        </>
      )}
      {message ? (
        <p className="spec-memory__result" role="status">{message}</p>
      ) : null}
    </div>
  );
}
