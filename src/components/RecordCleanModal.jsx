import { useMemo, useRef, useState } from 'react';
import { useFieldErrors } from '../hooks/useFieldErrors';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { defaultIntervalFor } from '../lib/constants';
import CleanerSelect from './CleanerSelect';
import { useTeam } from '../hooks/useTeam';
import { useAuth } from '../context/AuthContext';
import { displayName } from '../lib/access';
import { previewNextCleanDue, statusFor } from '../lib/assetStatus';
import { formatDate, isValidIsoDate, todayIso } from '../lib/dates';

/**
 * The cleaning side's only editor: the four fields a technician touches when
 * they clean a machine. Purchase cost, location and the asset reference are
 * deliberately absent - those belong to the register, on the Assets page.
 */
const FIELD_IDS = { date_cleaned: 'rc_date_cleaned', cleaned_by: 'rc_cleaned_by', cleaning_interval_months: 'rc_interval', notes: 'rc_notes' };

export default function RecordCleanModal({ asset, onSubmit, onClose }) {
  const team = useTeam();
  const { userEmail, userName } = useAuth();
  const [values, setValues] = useState(() => ({
    // A new clean is today's, by whoever does it. Pre-filling the last clean
    // meant pressing Save recorded nothing new.
    date_cleaned: todayIso(),
    // Usually whoever is recording it did the clean.
    cleaned_by: displayName({ email: userEmail, full_name: userName }),
    cleaning_interval_months: String(asset.cleaning_interval_months ?? defaultIntervalFor(asset.device_type)),
    notes: asset.notes ?? ''
  }));
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  useFieldErrors(formRef, errors, { ids: FIELD_IDS });
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const preview = useMemo(() => {
    const nextCleanDue = previewNextCleanDue(values.date_cleaned, values.cleaning_interval_months);
    return {
      nextCleanDue,
      status: statusFor(asset.device_type, values.date_cleaned, nextCleanDue)
    };
  }, [asset.device_type, values.date_cleaned, values.cleaning_interval_months]);

  const validate = () => {
    const next = {};
    const today = todayIso();

    if (values.date_cleaned) {
      if (!isValidIsoDate(values.date_cleaned)) {
        next.date_cleaned = 'Enter a valid date.';
      } else if (values.date_cleaned > today) {
        next.date_cleaned = 'Date Cleaned cannot be in the future.';
      } else if (asset.date_cleaned && values.date_cleaned < asset.date_cleaned) {
        // Recording an older clean would move the due date backwards.
        next.date_cleaned = `Its last clean was ${formatDate(asset.date_cleaned)}. A new clean cannot be dated before that - to correct the last one, use Edit on the Assets page.`;
      }
      if (!values.cleaned_by) {
        next.cleaned_by = 'Select who cleaned it.';
      }
    } else if (values.cleaned_by) {
      next.date_cleaned = 'Enter the date this asset was cleaned.';
    }

    const months = Number(values.cleaning_interval_months);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      next.cleaning_interval_months = 'Interval must be a whole number of months between 1 and 60.';
    }

    if (values.notes && values.notes.length > 2000) {
      next.notes = 'Notes must be 2000 characters or fewer.';
    }

    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
      title={`Record clean — ${asset.asset_ref}`}
      description={`${asset.device_type}${asset.owner_name ? ` · ${asset.owner_name}` : ''}${asset.location ? ` · ${asset.location}` : ''}`}
      onClose={busy ? () => {} : onClose}
      size="sm"
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div className="modal__body field-stack">
          <div className="field">
            <label className="field__label" htmlFor="rc_date_cleaned">Date cleaned</label>
            <input
              id="rc_date_cleaned"
              className={`input${errors.date_cleaned ? ' input--error' : ''}`}
              type="date"
              max={todayIso()}
              value={values.date_cleaned}
              onChange={(event) => setField('date_cleaned', event.target.value)}
              autoFocus
              disabled={busy}
            />
            {errors.date_cleaned ? (
              <span className="field__error">{errors.date_cleaned}</span>
            ) : (
              <span className="field__hint">
                {asset.date_cleaned
                  ? `Last cleaned ${formatDate(asset.date_cleaned)}${asset.cleaned_by ? ` by ${asset.cleaned_by}` : ''}.`
                  : 'No clean recorded before.'}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rc_cleaned_by">Cleaned by</label>
            <CleanerSelect
              id="rc_cleaned_by"
              value={values.cleaned_by}
              team={team}
              onChange={(next) => setField('cleaned_by', next)}
              invalid={Boolean(errors.cleaned_by)}
              disabled={busy}
            />
            {errors.cleaned_by ? <span className="field__error">{errors.cleaned_by}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rc_interval">Cleaning interval (months)</label>
            <input
              id="rc_interval"
              className={`input${errors.cleaning_interval_months ? ' input--error' : ''}`}
              type="number"
              min={1}
              max={60}
              step={1}
              value={values.cleaning_interval_months}
              onChange={(event) => setField('cleaning_interval_months', event.target.value)}
              disabled={busy}
            />
            {errors.cleaning_interval_months ? (
              <span className="field__error">{errors.cleaning_interval_months}</span>
            ) : (
              <span className="field__hint">Defaults to {defaultIntervalFor(asset.device_type)} months for a {asset.device_type.toLowerCase()}.</span>
            )}
          </div>

          <div className="field">
            <span className="field__label">Next clean due (calculated)</span>
            <div className="calc-preview">
              <span className="calc-preview__date">
                {preview.nextCleanDue ? formatDate(preview.nextCleanDue) : 'No clean recorded'}
              </span>
              <StatusBadge status={preview.status} />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rc_notes">Notes</label>
            <textarea
              id="rc_notes"
              className={`textarea${errors.notes ? ' input--error' : ''}`}
              rows={3}
              value={values.notes}
              onChange={(event) => setField('notes', event.target.value)}
              maxLength={2000}
              placeholder="Anything the next technician should know."
              disabled={busy}
            />
            {errors.notes ? <span className="field__error">{errors.notes}</span> : null}
          </div>

          {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save clean'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
