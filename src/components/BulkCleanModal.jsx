import { useState } from 'react';
import Modal from './Modal';
import { CLEANERS } from '../lib/constants';
import { isValidIsoDate, todayIso } from '../lib/dates';

/**
 * One clean, recorded against a batch.
 *
 * Deliberately narrower than the single-asset dialog: the interval and the
 * notes stay per-asset, because applying one note to twenty machines would
 * wipe twenty individual ones. Each asset keeps its own cleaning interval, so
 * their next-due dates still differ.
 */
export default function BulkCleanModal({ count, onSubmit, onClose }) {
  const [values, setValues] = useState({ date_cleaned: todayIso(), cleaned_by: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    const next = {};
    if (!values.date_cleaned || !isValidIsoDate(values.date_cleaned)) {
      next.date_cleaned = 'Enter a valid date.';
    } else if (values.date_cleaned > todayIso()) {
      next.date_cleaned = 'Date cleaned cannot be in the future.';
    }
    if (!values.cleaned_by) next.cleaned_by = 'Select who cleaned them.';

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    try {
      await onSubmit(values);
    } catch (caught) {
      setSubmitError(caught.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Record clean — ${count} asset${count === 1 ? '' : 's'}`}
      description="The same date and cleaner against every selected laptop and desktop. Each keeps its own interval and notes."
      size="sm"
      onClose={busy ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal__body field-stack">
          <div className="field">
            <label className="field__label" htmlFor="bulk_date_cleaned">Date cleaned</label>
            <input
              id="bulk_date_cleaned"
              className={`input${errors.date_cleaned ? ' input--error' : ''}`}
              type="date"
              max={todayIso()}
              value={values.date_cleaned}
              onChange={(event) => setField('date_cleaned', event.target.value)}
              autoFocus
              disabled={busy}
            />
            {errors.date_cleaned ? <span className="field__error">{errors.date_cleaned}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="bulk_cleaned_by">Cleaned by</label>
            <select
              id="bulk_cleaned_by"
              className={`select${errors.cleaned_by ? ' input--error' : ''}`}
              value={values.cleaned_by}
              onChange={(event) => setField('cleaned_by', event.target.value)}
              disabled={busy}
            >
              <option value="">— Choose —</option>
              {CLEANERS.map((cleaner) => <option key={cleaner} value={cleaner}>{cleaner}</option>)}
            </select>
            {errors.cleaned_by ? <span className="field__error">{errors.cleaned_by}</span> : null}
          </div>

          {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : `Record ${count} clean${count === 1 ? '' : 's'}`}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
