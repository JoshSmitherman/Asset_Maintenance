import { useMemo, useState } from 'react';
import { matchKnownModel, specSnapshot, specsFor } from '../lib/specs';
import { similarKnownModels } from '../lib/modelNames';

const describeRefs = (refs) =>
  refs.slice(0, 3).join(', ') + (refs.length > 3 ? ` and ${refs.length - 3} more` : '');

/**
 * Copies a specification from kit already on the register. Free and instant:
 * it reads the assets the app has already loaded, and nothing leaves the
 * browser.
 *
 * The model list is always there. Picking a model replaces the spec boxes
 * with that model's - pick another to switch, Undo to go back, Clear to start
 * again. When the Brand and Model typed match a known model, it also offers
 * to fill just the boxes still empty; when they nearly match one, it asks
 * whether that was meant, so a typo does not start a second entry.
 */
export default function SpecMemory({ deviceType, models = [], values, onChange, disabled }) {
  const [message, setMessage] = useState(null);
  // What the boxes held before the last copy or clear, for Undo.
  const [previous, setPrevious] = useState(null);

  const match = matchKnownModel(models, values.spec_brand, values.spec_model);
  // Typed something close to a known model but not quite it: probably a typo,
  // which would otherwise start a second entry for the same machine.
  const lookalikes = match ? [] : similarKnownModels(models, values.spec_brand, values.spec_model);
  const keys = specsFor(deviceType);
  const isBlank = (key) => String(values[key] ?? '').trim() === '';
  const anyFilled = keys.some((key) => !isBlank(key));
  const emptyItCouldFill = match
    ? keys.filter((key) => isBlank(key) && match.specs[key] !== undefined)
    : [];

  // One group per brand, biggest fleets first within each.
  const groups = useMemo(() => {
    const byBrand = new Map();
    for (const entry of models) {
      const brand = entry.brand || 'Other';
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand).push(entry);
    }
    return [...byBrand.entries()].sort(([a], [b]) => a.localeCompare(b, 'en-GB'));
  }, [models]);

  const remember = () => setPrevious(specSnapshot(deviceType, values));

  const copyModel = (entry) => {
    remember();
    onChange('replace', entry.specs);
    setMessage(`Copied the ${entry.label} specification from ${describeRefs(entry.refs)}. Check it before saving.`);
  };

  const fillEmpty = () => {
    remember();
    const filled = onChange('fill', match.specs);
    setMessage(`Filled ${filled} empty box${filled === 1 ? '' : 'es'} from ${describeRefs(match.refs)}.`);
  };

  const clear = () => {
    remember();
    onChange('replace', {});
    setMessage('Specification cleared.');
  };

  const undo = () => {
    onChange('replace', previous);
    setPrevious(null);
    setMessage('Put back what was there before.');
  };

  return (
    <div className="spec-memory field--full">
      {models.length > 0 ? (
        <>
          <label className="field__label" htmlFor="spec_memory">Copy specs from a model you already have</label>
          <div className="spec-memory__row">
            <select
              id="spec_memory"
              className="select"
              value={match?.key ?? ''}
              onChange={(event) => {
                const entry = models.find((item) => item.key === event.target.value);
                if (entry) copyModel(entry);
              }}
              disabled={disabled}
            >
              <option value="">— Choose a model —</option>
              {groups.map(([brand, entries]) => (
                <optgroup key={brand} label={brand}>
                  {entries.map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {entry.label} · {entry.count} on the register
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {previous ? (
              <button type="button" className="btn btn--ghost btn--small" onClick={undo} disabled={disabled}>
                Undo
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={clear}
              disabled={disabled || !anyFilled}
            >
              Clear specs
            </button>
          </div>
        </>
      ) : (
        <p className="field__hint">
          Once a model's specification is recorded here, adding another of the same model can copy it.
        </p>
      )}

      {lookalikes.length > 0 ? (
        <div className="spec-memory__match spec-memory__match--warn" role="alert">
          <span>
            Did you mean <strong>{lookalikes[0].label}</strong>? It is already on the register (
            {lookalikes[0].count}) - using the same spelling keeps them together.
          </span>
          <button
            type="button"
            className="btn btn--brand-light btn--small"
            onClick={() => {
              onChange('set', { spec_brand: lookalikes[0].brand, spec_model: lookalikes[0].model });
              setMessage(`Spelling changed to ${lookalikes[0].label}.`);
            }}
            disabled={disabled}
          >
            Use that spelling
          </button>
        </div>
      ) : null}

      {match && emptyItCouldFill.length > 0 ? (
        <div className="spec-memory__match">
          <span>
            <strong>{match.label}</strong> is on the register ({match.count}). It can fill{' '}
            {emptyItCouldFill.length} empty box{emptyItCouldFill.length === 1 ? '' : 'es'}.
          </span>
          <button type="button" className="btn btn--brand-light btn--small" onClick={fillEmpty} disabled={disabled}>
            Fill the empty boxes
          </button>
        </div>
      ) : null}

      {message ? <p className="spec-memory__result" role="status">{message}</p> : null}
    </div>
  );
}
