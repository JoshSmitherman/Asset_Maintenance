import { useMemo, useState } from 'react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import {
  CLEANERS,
  DEFAULT_CLEANING_INTERVAL_MONTHS,
  DEVICE_TYPES,
  isCleaningTracked,
  LOCATIONS
} from '../lib/constants';
import { previewNextCleanDue, statusFor } from '../lib/assetStatus';
import { formatDate, isValidIsoDate, todayIso } from '../lib/dates';

function blankValues(prefill = {}) {
  return {
    asset_ref: '',
    device_type: DEVICE_TYPES[0],
    owner_name: '',
    department: '',
    location: '',
    purchase_cost: '',
    purchase_date: '',
    date_cleaned: '',
    cleaned_by: '',
    cleaning_interval_months: String(DEFAULT_CLEANING_INTERVAL_MONTHS),
    notes: '',
    ...prefill
  };
}

function valuesFromAsset(asset, prefill = {}) {
  return {
    asset_ref: asset.asset_ref ?? '',
    device_type: asset.device_type ?? DEVICE_TYPES[0],
    owner_name: asset.owner_name ?? '',
    department: asset.department ?? '',
    location: asset.location ?? '',
    purchase_cost: asset.purchase_cost ?? '',
    purchase_date: asset.purchase_date ?? '',
    date_cleaned: asset.date_cleaned ?? '',
    cleaned_by: asset.cleaned_by ?? '',
    cleaning_interval_months: String(asset.cleaning_interval_months ?? DEFAULT_CLEANING_INTERVAL_MONTHS),
    notes: asset.notes ?? '',
    ...prefill
  };
}

function validate(values, { assetRefExists, ignoreId }) {
  const errors = {};
  const today = todayIso();
  const tracked = isCleaningTracked(values.device_type);

  if (!values.asset_ref.trim()) {
    errors.asset_ref = 'Asset Ref is required.';
  } else if (values.asset_ref.trim().length > 40) {
    errors.asset_ref = 'Asset Ref must be 40 characters or fewer.';
  } else if (assetRefExists(values.asset_ref, ignoreId)) {
    errors.asset_ref = 'Another asset already uses this Asset Ref.';
  }

  if (!DEVICE_TYPES.includes(values.device_type)) {
    errors.device_type = 'Choose a device type.';
  }
  if (!values.department.trim()) {
    errors.department = 'Department is required.';
  }

  if (values.location && !LOCATIONS.includes(values.location)) {
    errors.location = 'Choose a location from the list.';
  }

  if (values.purchase_date && !isValidIsoDate(values.purchase_date)) {
    errors.purchase_date = 'Enter a valid date.';
  }

  const costText = String(values.purchase_cost ?? '').trim();
  if (costText) {
    const cost = Number(costText);
    if (!Number.isFinite(cost) || cost < 0) {
      errors.purchase_cost = 'Purchase cost must be a number of zero or more.';
    }
  }

  // Cleaning only applies to laptops and desktops.
  if (tracked && values.date_cleaned) {
    if (!isValidIsoDate(values.date_cleaned)) {
      errors.date_cleaned = 'Enter a valid date.';
    } else if (values.date_cleaned > today) {
      errors.date_cleaned = 'Date Cleaned cannot be in the future.';
    }
    if (!values.cleaned_by) {
      errors.cleaned_by = 'Select who cleaned it.';
    }
  } else if (tracked && values.cleaned_by) {
    errors.date_cleaned = 'Enter the date this asset was cleaned.';
  }

  const months = Number(values.cleaning_interval_months);
  if (tracked && (!Number.isInteger(months) || months < 1 || months > 60)) {
    errors.cleaning_interval_months = 'Interval must be a whole number of months between 1 and 60.';
  }

  if (values.notes && values.notes.length > 2000) {
    errors.notes = 'Notes must be 2000 characters or fewer.';
  }

  return errors;
}

export default function AssetFormModal({ asset, prefill, onSubmit, onClose, assetRefExists }) {
  const isEditing = Boolean(asset);
  const [values, setValues] = useState(() =>
    isEditing ? valuesFromAsset(asset, prefill) : blankValues(prefill)
  );
  const [errors, setErrors] = useState({});
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

  const tracked = isCleaningTracked(values.device_type);

  const preview = useMemo(() => {
    const nextCleanDue = previewNextCleanDue(values.date_cleaned, values.cleaning_interval_months);
    return {
      nextCleanDue,
      status: statusFor(values.device_type, values.date_cleaned, nextCleanDue)
    };
  }, [values.device_type, values.date_cleaned, values.cleaning_interval_months]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validate(values, { assetRefExists, ignoreId: asset?.id ?? null });
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
      title={isEditing ? `Edit ${asset.asset_ref}` : 'Add asset'}
      description={
        isEditing
          ? 'Changes are saved to Supabase immediately and visible to the whole team.'
          : 'Next Clean Due and Status are calculated automatically.'
      }
      onClose={busy ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal__body form-grid">
          <div className="field">
            <label className="field__label" htmlFor="asset_ref">Asset Ref *</label>
            <input
              id="asset_ref"
              className={`input${errors.asset_ref ? ' input--error' : ''}`}
              value={values.asset_ref}
              onChange={(event) => setField('asset_ref', event.target.value)}
              placeholder="e.g. LAP-0142"
              maxLength={40}
              autoFocus
              disabled={busy}
            />
            {errors.asset_ref ? <span className="field__error">{errors.asset_ref}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="device_type">Device Type *</label>
            <select
              id="device_type"
              className={`select${errors.device_type ? ' input--error' : ''}`}
              value={values.device_type}
              onChange={(event) => setField('device_type', event.target.value)}
              disabled={busy}
            >
              {DEVICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {errors.device_type ? <span className="field__error">{errors.device_type}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="owner_name">User</label>
            <input
              id="owner_name"
              className={`input${errors.owner_name ? ' input--error' : ''}`}
              value={values.owner_name}
              onChange={(event) => setField('owner_name', event.target.value)}
              list="user-options"
              placeholder="Person, or a shared location"
              disabled={busy}
            />
            {errors.owner_name ? (
              <span className="field__error">{errors.owner_name}</span>
            ) : (
              <span className="field__hint">Leave blank if nobody has it yet — it'll be listed as unassigned.</span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="department">Department *</label>
            <input
              id="department"
              className={`input${errors.department ? ' input--error' : ''}`}
              value={values.department}
              onChange={(event) => setField('department', event.target.value)}
              list="department-options"
              placeholder="e.g. Finance"
              disabled={busy}
            />
            {errors.department ? <span className="field__error">{errors.department}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="location">Location</label>
            <select
              id="location"
              className={`select${errors.location ? ' input--error' : ''}`}
              value={values.location}
              onChange={(event) => setField('location', event.target.value)}
              disabled={busy}
            >
              <option value="">— Not recorded —</option>
              {LOCATIONS.map((place) => <option key={place} value={place}>{place}</option>)}
            </select>
            {errors.location ? <span className="field__error">{errors.location}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="purchase_date">Purchase Date</label>
            <input
              id="purchase_date"
              className={`input${errors.purchase_date ? ' input--error' : ''}`}
              type="date"
              value={values.purchase_date}
              onChange={(event) => setField('purchase_date', event.target.value)}
              disabled={busy}
            />
            {errors.purchase_date ? <span className="field__error">{errors.purchase_date}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="purchase_cost">Purchase Cost (£)</label>
            <input
              id="purchase_cost"
              className={`input${errors.purchase_cost ? ' input--error' : ''}`}
              type="number"
              min={0}
              step="0.01"
              value={values.purchase_cost}
              onChange={(event) => setField('purchase_cost', event.target.value)}
              placeholder="e.g. 899.00"
              disabled={busy}
            />
            {errors.purchase_cost ? <span className="field__error">{errors.purchase_cost}</span> : null}
          </div>

          {tracked ? (
            <>
          <div className="field">
            <label className="field__label" htmlFor="date_cleaned">Date Cleaned</label>
            <input
              id="date_cleaned"
              className={`input${errors.date_cleaned ? ' input--error' : ''}`}
              type="date"
              max={todayIso()}
              value={values.date_cleaned}
              onChange={(event) => setField('date_cleaned', event.target.value)}
              disabled={busy}
            />
            {errors.date_cleaned ? (
              <span className="field__error">{errors.date_cleaned}</span>
            ) : (
              <span className="field__hint">Leave blank if this asset has never been cleaned.</span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="cleaned_by">Cleaned By</label>
            <select
              id="cleaned_by"
              className={`select${errors.cleaned_by ? ' input--error' : ''}`}
              value={values.cleaned_by}
              onChange={(event) => setField('cleaned_by', event.target.value)}
              disabled={busy}
            >
              <option value="">— Not recorded —</option>
              {CLEANERS.map((cleaner) => <option key={cleaner} value={cleaner}>{cleaner}</option>)}
            </select>
            {errors.cleaned_by ? <span className="field__error">{errors.cleaned_by}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="cleaning_interval_months">Cleaning interval (months)</label>
            <input
              id="cleaning_interval_months"
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
              <span className="field__hint">Defaults to {DEFAULT_CLEANING_INTERVAL_MONTHS} months.</span>
            )}
          </div>

          <div className="field">
            <span className="field__label">Next Clean Due (calculated)</span>
            <div className="calc-preview">
              <span className="calc-preview__date">
                {preview.nextCleanDue ? formatDate(preview.nextCleanDue) : 'No clean recorded'}
              </span>
              <StatusBadge status={preview.status} />
            </div>
          </div>
            </>
          ) : (
            <div className="field field--full">
              <p className="field__hint">
                Cleaning is tracked for laptops and desktops only. This asset is recorded
                for inventory and will not appear in the cleaning area.
              </p>
            </div>
          )}

          <div className="field field--full">
            <label className="field__label" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
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

          {submitError ? (
            <p className="form-error field--full" role="alert">{submitError}</p>
          ) : null}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Add asset'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
