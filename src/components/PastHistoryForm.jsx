import { useEffect, useRef, useState } from 'react';
import { addPastNote, addPastOwner } from '../lib/pastEvents';
import { isValidIsoDate, todayIso } from '../lib/dates';
import { useFieldErrors } from '../hooks/useFieldErrors';

/**
 * Adds what Orbit did not see: who had the asset before, or a dated note.
 * Everything added here shows as "added later" on the timeline.
 */
export default function PastHistoryForm({ assetId, onSaved, onCancel }) {
  const [kind, setKind] = useState('past_owner');
  const [values, setValues] = useState({ owner: '', from: '', to: todayIso(), note: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  useFieldErrors(formRef, errors, {
    ids: { owner: 'past_owner_name', from: 'past_from', to: 'past_to', note: 'past_note' }
  });
  const firstBox = useRef(null);
  useEffect(() => firstBox.current?.focus(), [kind]);

  const set = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    const today = todayIso();
    if (kind === 'past_owner') {
      if (!values.owner.trim()) next.owner = 'Say who had it.';
      else if (values.owner.trim().length > 80) next.owner = 'Keep the name to 80 characters.';
      if (values.from && !isValidIsoDate(values.from)) next.from = 'Enter a real date, or leave it blank.';
      else if (values.from && values.from > today) next.from = 'This cannot be in the future.';
    } else if (!values.note.trim()) {
      next.note = 'Write what happened.';
    }
    if (!values.to || !isValidIsoDate(values.to)) next.to = 'Enter a date.';
    else if (values.to > today) next.to = 'This cannot be in the future.';
    else if (kind === 'past_owner' && values.from && isValidIsoDate(values.from) && values.from > values.to) {
      next.from = 'This must be before the date they handed it back.';
    }
    if (values.note.length > 500) next.note = 'Keep the note to 500 characters.';
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError(null);
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    try {
      if (kind === 'past_owner') {
        await addPastOwner(assetId, { owner: values.owner.trim(), from: values.from, to: values.to, note: values.note.trim() });
      } else {
        await addPastNote(assetId, { date: values.to, note: values.note.trim() });
      }
      onSaved(kind === 'past_owner' ? `Added: was with ${values.owner.trim()}.` : 'Note added to the history.');
    } catch (caught) {
      setSubmitError(caught.message);
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} className="past-form" onSubmit={submit} noValidate>
      <h3 className="history__heading">Add earlier history</h3>
      <p className="field__hint">
        For what happened before Orbit knew about it. It shows on the timeline as added later, by you.
      </p>

      <div className="segmented" role="radiogroup" aria-label="What to add">
        {[
          { id: 'past_owner', label: 'Who had it' },
          { id: 'past_note', label: 'A note' }
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={kind === option.id}
            className={`segmented__option${kind === option.id ? ' segmented__option--active' : ''}`}
            onClick={() => setKind(option.id)}
            disabled={busy}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        {kind === 'past_owner' ? (
          <>
            <div className="field field--full">
              <label className="field__label" htmlFor="past_owner_name">Who had it *</label>
              <input
                id="past_owner_name"
                ref={firstBox}
                className={`input${errors.owner ? ' input--error' : ''}`}
                value={values.owner}
                onChange={(event) => set('owner', event.target.value)}
                placeholder="e.g. Sarah Jones"
                maxLength={80}
                autoComplete="off"
                disabled={busy}
              />
              {errors.owner ? <span className="field__error">{errors.owner}</span> : null}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="past_from">From</label>
              <input
                id="past_from"
                type="date"
                className={`input${errors.from ? ' input--error' : ''}`}
                value={values.from}
                max={todayIso()}
                onChange={(event) => set('from', event.target.value)}
                disabled={busy}
              />
              {errors.from ? (
                <span className="field__error">{errors.from}</span>
              ) : (
                <span className="field__hint">Leave blank if you are not sure.</span>
              )}
            </div>
          </>
        ) : null}
        <div className="field">
          <label className="field__label" htmlFor="past_to">
            {kind === 'past_owner' ? 'Until (handed back) *' : 'When *'}
          </label>
          <input
            id="past_to"
            type="date"
            className={`input${errors.to ? ' input--error' : ''}`}
            value={values.to}
            max={todayIso()}
            onChange={(event) => set('to', event.target.value)}
            disabled={busy}
          />
          {errors.to ? <span className="field__error">{errors.to}</span> : null}
        </div>
        <div className="field field--full">
          <label className="field__label" htmlFor="past_note">
            {kind === 'past_owner' ? 'Note' : 'What happened *'}
          </label>
          <textarea
            id="past_note"
            ref={kind === 'past_note' ? firstBox : undefined}
            className={`textarea${errors.note ? ' input--error' : ''}`}
            rows={2}
            value={values.note}
            onChange={(event) => set('note', event.target.value)}
            placeholder={kind === 'past_owner' ? 'e.g. Brought back to the office - no longer needed' : 'e.g. Bought for the Leeds office'}
            maxLength={500}
            disabled={busy}
          />
          {errors.note ? <span className="field__error">{errors.note}</span> : null}
        </div>
      </div>

      {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}

      <div className="past-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Add to history'}
        </button>
      </div>
    </form>
  );
}
