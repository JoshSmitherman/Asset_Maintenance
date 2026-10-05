import { useState } from 'react';
import Modal from './Modal';
import TeamSelect from './TeamSelect';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../hooks/useTeam';
import { RETIRE_REASONS } from '../lib/constants';
import { isValidIsoDate, todayIso } from '../lib/dates';

/**
 * Takes kit out of use without losing its record: it leaves the register,
 * the cleaning queue and the dashboard, but its details, repairs, files and
 * history stay, and an admin can bring it back.
 *
 * Works for one asset or a ticked batch - the same answers apply to each.
 */
export default function RetireModal({ assets, onSubmit, onClose }) {
  const { user } = useAuth();
  const team = useTeam();
  const [values, setValues] = useState({
    retired_on: todayIso(),
    retired_reason: '',
    retired_notes: '',
    data_wiped: false,
    // Usually the person retiring it did the wipe; it can be changed.
    data_wiped_by: user?.id ?? null
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);

  const count = assets.length;
  const single = count === 1 ? assets[0] : null;

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    const next = {};
    if (!values.retired_on || !isValidIsoDate(values.retired_on)) {
      next.retired_on = 'Enter a valid date.';
    } else if (values.retired_on > todayIso()) {
      next.retired_on = 'The retirement date cannot be in the future.';
    }
    if (!values.retired_reason) next.retired_reason = 'Choose why it is being retired.';
    if (values.retired_notes.length > 500) next.retired_notes = 'Keep the note to 500 characters.';
    if (values.data_wiped && !values.data_wiped_by) next.data_wiped_by = 'Choose who wiped it.';

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
      title={single ? `Retire ${single.asset_ref}` : `Retire ${count} assets`}
      description="It leaves the register, the cleaning queue and the dashboard, but its record, repairs and files are kept. An admin can restore it."
      size="sm"
      onClose={busy ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal__body field-stack">
          {single ? null : (
            <p className="field__hint">
              {assets.slice(0, 8).map((asset) => asset.asset_ref).join(', ')}
              {count > 8 ? ` and ${count - 8} more` : ''}
            </p>
          )}

          <div className="field">
            <label className="field__label" htmlFor="retired_on">Retirement date</label>
            <input
              id="retired_on"
              className={`input${errors.retired_on ? ' input--error' : ''}`}
              type="date"
              max={todayIso()}
              value={values.retired_on}
              onChange={(event) => setField('retired_on', event.target.value)}
              disabled={busy}
            />
            {errors.retired_on ? <span className="field__error">{errors.retired_on}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="retired_reason">Reason</label>
            <select
              id="retired_reason"
              className={`select${errors.retired_reason ? ' input--error' : ''}`}
              value={values.retired_reason}
              onChange={(event) => setField('retired_reason', event.target.value)}
              disabled={busy}
              autoFocus
            >
              <option value="">— Choose a reason —</option>
              {RETIRE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
            {errors.retired_reason ? <span className="field__error">{errors.retired_reason}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="retired_notes">Note (optional)</label>
            <textarea
              id="retired_notes"
              className={`textarea${errors.retired_notes ? ' input--error' : ''}`}
              rows={2}
              maxLength={500}
              value={values.retired_notes}
              onChange={(event) => setField('retired_notes', event.target.value)}
              placeholder="e.g. Motherboard failed; replaced by LAP-0210."
              disabled={busy}
            />
            {errors.retired_notes ? <span className="field__error">{errors.retired_notes}</span> : null}
          </div>

          {/* Anything that held personal data should be wiped before it
              leaves; recording who did it is what an audit asks for. */}
          <div className="field">
            <label className="checkbox-field">
              <input
                type="checkbox"
                className="checkbox"
                checked={values.data_wiped}
                onChange={(event) => setField('data_wiped', event.target.checked)}
                disabled={busy}
              />
              <span>Data has been wiped</span>
            </label>
          </div>

          {values.data_wiped ? (
            <div className="field">
              <label className="field__label" htmlFor="data_wiped_by">Wiped by</label>
              <TeamSelect
                id="data_wiped_by"
                value={values.data_wiped_by}
                team={team}
                onChange={(next) => setField('data_wiped_by', next)}
                invalid={Boolean(errors.data_wiped_by)}
                disabled={busy}
              />
              {errors.data_wiped_by ? <span className="field__error">{errors.data_wiped_by}</span> : null}
            </div>
          ) : null}

          {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Retiring…' : single ? 'Retire asset' : `Retire ${count}`}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
