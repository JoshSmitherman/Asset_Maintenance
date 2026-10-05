import { useState } from 'react';
import TeamSelect from './TeamSelect';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../hooks/useTeam';
import { formatCurrency } from '../lib/constants';
import { todayIso } from '../lib/dates';
import { MAX_PARTS, blankPart, partsTotal, repairFormValues, validateRepair } from '../lib/repairs';

/**
 * Logging or editing an in-house repair. Shown in place of the repair list,
 * inside the asset's Repairs tab, so a second window never opens on top.
 */
export default function RepairForm({ repair, onSave, onCancel }) {
  const { user } = useAuth();
  const team = useTeam();
  const [values, setValues] = useState(() => repairFormValues(repair, { userId: user?.id }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setPart = (index, field, value) => {
    setValues((current) => ({
      ...current,
      parts: current.parts.map((row, at) => (at === index ? { ...row, [field]: value } : row))
    }));
    setErrors((current) => ({ ...current, [`${field}_${index}`]: undefined }));
  };

  const addPart = () => setValues((current) => ({ ...current, parts: [...current.parts, blankPart()] }));

  const removePart = (index) => {
    setValues((current) => {
      const parts = current.parts.filter((_, at) => at !== index);
      return { ...current, parts: parts.length ? parts : [blankPart()] };
    });
    // Errors are keyed by row, so they no longer line up once one is removed.
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => !/^(part|cost)_\d+$/.test(key)))
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);
    const next = validateRepair(values);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    try {
      await onSave(values);
    } catch (caught) {
      setSubmitError(caught.message);
      setBusy(false);
    }
  };

  const total = partsTotal(values.parts);

  return (
    <form className="repair-form" onSubmit={handleSubmit} noValidate>
      <h3 className="repair-form__title">{repair ? 'Edit repair' : 'Log a repair'}</h3>

      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="repaired_on">Date</label>
          <input
            id="repaired_on"
            className={`input${errors.repaired_on ? ' input--error' : ''}`}
            type="date"
            max={todayIso()}
            value={values.repaired_on}
            onChange={(event) => setField('repaired_on', event.target.value)}
            disabled={busy}
          />
          {errors.repaired_on ? <span className="field__error">{errors.repaired_on}</span> : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="fixed_by">Fixed by</label>
          <TeamSelect
            id="fixed_by"
            value={values.fixed_by}
            team={team}
            onChange={(next) => setField('fixed_by', next)}
            invalid={Boolean(errors.fixed_by)}
            disabled={busy}
          />
          {errors.fixed_by ? <span className="field__error">{errors.fixed_by}</span> : null}
        </div>

        <div className="field field--full">
          <label className="field__label" htmlFor="fault">What was wrong / what was done</label>
          <input
            id="fault"
            className={`input${errors.fault ? ' input--error' : ''}`}
            value={values.fault}
            onChange={(event) => setField('fault', event.target.value)}
            maxLength={500}
            placeholder="e.g. Battery would not hold charge; replaced battery"
            disabled={busy}
            autoFocus
          />
          {errors.fault ? <span className="field__error">{errors.fault}</span> : null}
        </div>
      </div>

      <fieldset className="parts" disabled={busy}>
        <legend className="field__label">Parts replaced</legend>
        <p className="field__hint">One row per part. Leave the list empty if nothing needed replacing.</p>

        {values.parts.map((row, index) => (
          // Rows have no identity of their own; position is what the errors use too.
          // eslint-disable-next-line react/no-array-index-key
          <div className="parts__row" key={index}>
            <div className="field parts__name">
              <label className="sr-only" htmlFor={`part_${index}`}>Part {index + 1}</label>
              <input
                id={`part_${index}`}
                className={`input${errors[`part_${index}`] ? ' input--error' : ''}`}
                value={row.part}
                onChange={(event) => setPart(index, 'part', event.target.value)}
                maxLength={80}
                placeholder="Part, e.g. Battery"
              />
              {errors[`part_${index}`] ? <span className="field__error">{errors[`part_${index}`]}</span> : null}
            </div>
            <div className="field parts__cost">
              <label className="sr-only" htmlFor={`cost_${index}`}>Cost of part {index + 1} (£)</label>
              <input
                id={`cost_${index}`}
                className={`input${errors[`cost_${index}`] ? ' input--error' : ''}`}
                inputMode="decimal"
                value={row.cost}
                onChange={(event) => setPart(index, 'cost', event.target.value)}
                placeholder="£0.00"
              />
              {errors[`cost_${index}`] ? <span className="field__error">{errors[`cost_${index}`]}</span> : null}
            </div>
            <button
              type="button"
              className="icon-button parts__remove"
              onClick={() => removePart(index)}
              aria-label={`Remove part ${index + 1}`}
              title="Remove this part"
            >
              <span aria-hidden="true">−</span>
            </button>
          </div>
        ))}

        <div className="parts__footer">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={addPart}
            disabled={values.parts.length >= MAX_PARTS}
          >
            + Add a part
          </button>
          <span className="parts__total">
            Total <strong>{formatCurrency(total) ?? '£0.00'}</strong>
          </span>
        </div>
        {errors.parts ? <span className="field__error">{errors.parts}</span> : null}
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor="repair_notes">Notes (optional)</label>
        <textarea
          id="repair_notes"
          className={`textarea${errors.notes ? ' input--error' : ''}`}
          rows={2}
          maxLength={2000}
          value={values.notes}
          onChange={(event) => setField('notes', event.target.value)}
          disabled={busy}
        />
        {errors.notes ? <span className="field__error">{errors.notes}</span> : null}
      </div>

      {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}

      <div className="repair-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : repair ? 'Save repair' : 'Log repair'}
        </button>
      </div>
    </form>
  );
}
