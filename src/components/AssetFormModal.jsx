import { useMemo, useRef, useState } from 'react';
import { useFieldErrors } from '../hooks/useFieldErrors';
import Modal from './Modal';
import TabStrip from './TabStrip';
import ComboSelect from './ComboSelect';
import StatusBadge from './StatusBadge';
import CleanerSelect from './CleanerSelect';
import { useTeam } from '../hooks/useTeam';
import {
  DEVICE_TYPES,
  deviceTypeLabel,
  isLegacyDeviceType,
  defaultIntervalFor,
  isCleaningTracked,
  LOCATIONS
} from '../lib/constants';
import {
  SPEC_COLUMNS,
  SPEC_FIELDS,
  fillEmptySpecs,
  hasSpecs,
  modelOptionsFor,
  replaceSpecs,
  specsFor
} from '../lib/specs';
import SpecMemory from './SpecMemory';
import { previewNextCleanDue, statusFor } from '../lib/assetStatus';

/** Enough for a delivery, few enough that a typo cannot create a thousand. */
const MAX_BATCH = 20;
import { formatDate, isValidIsoDate, todayIso } from '../lib/dates';

/** Every spec starts empty; the form keeps them as text and converts on save. */
const BLANK_SPECS = Object.fromEntries(SPEC_COLUMNS.map((key) => [key, '']));

function specValuesFromAsset(asset) {
  return Object.fromEntries(
    SPEC_COLUMNS.map((key) => [key, asset[key] === null || asset[key] === undefined ? '' : String(asset[key])])
  );
}

function blankValues(prefill = {}) {
  return {
    ...BLANK_SPECS,
    /** One entry per extra copy when adding several identical assets. */
    extra_refs: [],
    asset_ref: '',
    device_type: DEVICE_TYPES[0],
    owner_name: '',
    department: '',
    location: '',
    purchase_cost: '',
    serial_number: '',
    purchase_date: '',
    date_cleaned: '',
    cleaned_by: '',
    cleaning_interval_months: String(defaultIntervalFor(prefill.device_type ?? DEVICE_TYPES[0])),
    notes: '',
    ...prefill
  };
}

function valuesFromAsset(asset, prefill = {}) {
  return {
    ...specValuesFromAsset(asset),
    extra_refs: [],
    asset_ref: asset.asset_ref ?? '',
    device_type: asset.device_type ?? DEVICE_TYPES[0],
    owner_name: asset.owner_name ?? '',
    department: asset.department ?? '',
    location: asset.location ?? '',
    purchase_cost: asset.purchase_cost ?? '',
    serial_number: asset.serial_number ?? '',
    purchase_date: asset.purchase_date ?? '',
    date_cleaned: asset.date_cleaned ?? '',
    cleaned_by: asset.cleaned_by ?? '',
    cleaning_interval_months: String(asset.cleaning_interval_months ?? defaultIntervalFor(asset.device_type)),
    notes: asset.notes ?? '',
    ...prefill
  };
}

/** The same rules the first Asset Ref box gets, for one of the extra copies. */
function refError(ref, { assetRefExists, others }) {
  const text = ref.trim();
  if (!text) return 'Asset Ref is required.';
  if (text.length > 40) return 'Asset Ref must be 40 characters or fewer.';
  if (!REF_PATTERN.test(text)) return REF_HELP;
  if (assetRefExists(text, null)) return 'Another asset already uses this Asset Ref.';
  if (others.filter((other) => other.trim().toUpperCase() === text.toUpperCase()).length > 1) {
    return 'This Asset Ref is repeated in this batch.';
  }
  return null;
}

// Letters, numbers and simple separators, as printed on a barcode: AST-0222.
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/;
const REF_HELP = 'Use letters, numbers and dashes, like AST-0222.';

function validate(values, { assetRefExists, ignoreId, originalType = null }) {
  const errors = {};
  const today = todayIso();
  const tracked = isCleaningTracked(values.device_type);

  if (!values.asset_ref.trim()) {
    errors.asset_ref = 'Asset Ref is required.';
  } else if (values.asset_ref.trim().length > 40) {
    errors.asset_ref = 'Asset Ref must be 40 characters or fewer.';
  } else if (!REF_PATTERN.test(values.asset_ref.trim())) {
    errors.asset_ref = REF_HELP;
  } else if (assetRefExists(values.asset_ref, ignoreId)) {
    errors.asset_ref = 'Another asset already uses this Asset Ref.';
  }

  // Adding several at once: every copy needs its own reference, and no two
  // of them may clash with each other or with the register.
  const allRefs = [values.asset_ref, ...(values.extra_refs ?? [])];
  (values.extra_refs ?? []).forEach((ref, index) => {
    const problem = refError(ref, { assetRefExists, others: allRefs });
    if (problem) errors[`extra_ref_${index}`] = problem;
  });
  if (allRefs.length > 1 && !errors.asset_ref) {
    const first = refError(values.asset_ref, { assetRefExists, others: allRefs });
    if (first) errors.asset_ref = first;
  }

  // An older type is only allowed on an asset that already has it.
  if (!DEVICE_TYPES.includes(values.device_type) && values.device_type !== originalType) {
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
  } else if (values.purchase_date && values.purchase_date > today) {
    errors.purchase_date = 'Purchase date cannot be in the future.';
  } else if (values.purchase_date && values.purchase_date < '1990-01-01') {
    errors.purchase_date = 'Check the purchase date - it is before 1990.';
  }

  const serial = String(values.serial_number ?? '').trim();
  if (serial.length > 60) errors.serial_number = 'Serial number must be 60 characters or fewer.';

  const costText = String(values.purchase_cost ?? '').trim();
  if (costText) {
    // Pounds and pence as typed in a shop: 849, 849.99. Not 1e3, not 12.345,
    // and nothing the database's numeric(12,2) cannot hold.
    if (!/^\d+(\.\d{1,2})?$/.test(costText)) {
      errors.purchase_cost = 'Enter the cost in pounds, like 849 or 849.99 (no £ sign or commas).';
    } else if (Number(costText) > 9999999999) {
      errors.purchase_cost = 'That cost is too large. Check it.';
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

  // Specs are all optional, but a value long enough to break the layout is
  // almost certainly a paste gone wrong.
  for (const key of specsFor(values.device_type)) {
    const text = String(values[key] ?? '').trim();
    if (text.length > 60) {
      errors[key] = `${SPEC_FIELDS[key].label} must be 60 characters or fewer.`;
    }
  }

  return errors;
}

export default function AssetFormModal({
  asset,
  prefill,
  onSubmit,
  onClose,
  assetRefExists,
  departments = [],
  users = [],
  specOptions = {},
  specMemory = {},
  suggestedRef = null
}) {
  const isEditing = Boolean(asset);
  const team = useTeam();
  // New kit is usually uncleaned; the last-clean boxes wait until asked for.
  const [showLastClean, setShowLastClean] = useState(() => Boolean(prefill?.date_cleaned));
  const [tab, setTab] = useState('details');
  const [values, setValues] = useState(() =>
    isEditing ? valuesFromAsset(asset, prefill) : blankValues(prefill)
  );
  // What the form opened with, to tell whether anything has been typed.
  const [initialValues] = useState(values);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  // Copying specs merges into what the form holds at that moment.
  const latestValues = useRef(values);
  latestValues.current = values;
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  useFieldErrors(formRef, errors);
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

  const setExtraRefs = (next) => {
    setValues((current) => ({ ...current, extra_refs: next }));
    // Errors are keyed by position, so they have to go when the list changes.
    setErrors((current) => {
      const kept = Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith('extra_ref_'))
      );
      return kept;
    });
  };

  const tracked = isCleaningTracked(values.device_type);

  // Only computers and monitors have a specification to fill in; for anything
  // else the form stays a single page.
  const showSpecs = hasSpecs(values.device_type);
  const activeTab = showSpecs ? tab : 'details';
  const specKeys = specsFor(values.device_type);

  const preview = useMemo(() => {
    const nextCleanDue = previewNextCleanDue(
      values.date_cleaned,
      values.cleaning_interval_months,
      values.purchase_date
    );
    return {
      nextCleanDue,
      status: statusFor(values.device_type, values.date_cleaned, nextCleanDue)
    };
  }, [values.device_type, values.date_cleaned, values.cleaning_interval_months, values.purchase_date]);

  // Changing the type moves the interval to the new type's default, but only
  // while it is still the old type's default - a number someone typed stays.
  const setDeviceType = (nextType) => {
    setValues((current) => {
      const untouched = Number(current.cleaning_interval_months) === defaultIntervalFor(current.device_type);
      return {
        ...current,
        device_type: nextType,
        cleaning_interval_months: untouched
          ? String(defaultIntervalFor(nextType))
          : current.cleaning_interval_months
      };
    });
    setErrors((current) => {
      if (!current.device_type && !current.cleaning_interval_months) return current;
      const next = { ...current };
      delete next.device_type;
      delete next.cleaning_interval_months;
      return next;
    });
  };

  // The Specification tab is easy to miss, so a new asset is walked to it:
  // check the details first, then move on rather than saving straight away.
  const goToSpecs = () => {
    const detailErrors = Object.fromEntries(
      Object.entries(validate(values, { assetRefExists, ignoreId: asset?.id ?? null, originalType: asset?.device_type ?? null })).filter(
        ([key]) => !specKeys.includes(key)
      )
    );
    setErrors(detailErrors);
    if (Object.keys(detailErrors).length === 0) setTab('specs');
  };

  const offerNext = !isEditing && showSpecs && activeTab === 'details';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    // Enter in a box on the Details tab submits the form through its first
    // submit button, "without specs". Treat it as Next instead, as the
    // primary button on that tab is; only a click on "without specs" skips.
    const submitter = event.nativeEvent?.submitter;
    if (offerNext && !submitter?.dataset?.skipSpecs) {
      goToSpecs();
      return;
    }

    const nextErrors = validate(values, { assetRefExists, ignoreId: asset?.id ?? null, originalType: asset?.device_type ?? null });
    setErrors(nextErrors);
    const failed = Object.keys(nextErrors);
    if (failed.length > 0) {
      // An error on the tab you cannot see would look like nothing happened.
      const onSpecs = failed.every((key) => specKeys.includes(key));
      setTab(onSpecs ? 'specs' : 'details');
      return;
    }

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
          ? 'Your changes are shared with the whole team as soon as you save.'
          : 'Next Clean Due and Status are calculated automatically.'
      }
      onClose={busy ? () => {} : onClose}
      confirmDiscard={dirty && !busy}
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {showSpecs ? (
          <TabStrip
            tabs={[
              { id: 'details', label: 'Details' },
              { id: 'specs', label: 'Specification' }
            ]}
            active={activeTab}
            onChange={setTab}
          />
        ) : null}

        <div
          className="modal__body form-grid"
          role={showSpecs ? 'tabpanel' : undefined}
          id={showSpecs ? `panel-${activeTab}` : undefined}
          aria-labelledby={showSpecs ? `tab-${activeTab}` : undefined}
        >
          {activeTab === 'specs' ? (
            <>
            <p className="field__hint field--full">
              All optional — fill in what you know, and edit it any time later.
            </p>
            <SpecMemory
              key={values.device_type}
              deviceType={values.device_type}
              models={specMemory[values.device_type] ?? []}
              values={values}
              disabled={busy}
              onChange={(mode, found) => {
                if (mode === 'set') {
                  setValues((current) => ({ ...current, ...found }));
                  return 0;
                }
                if (mode === 'replace') {
                  setValues((current) => replaceSpecs(current.device_type, current, found));
                  return 0;
                }
                const current = latestValues.current;
                const merged = fillEmptySpecs(current.device_type, current, found);
                setValues(merged.values);
                return merged.filled.length;
              }}
            />
            {specKeys.map((key) => {
              const field = SPEC_FIELDS[key];
              return (
                <div className="field" key={key}>
                  <label className="field__label" htmlFor={key}>{field.label}</label>
                  {field.kind === 'count' ? (
                    <select
                      id={key}
                      className="select"
                      value={values[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      disabled={busy}
                    >
                      <option value="">— Not recorded —</option>
                      {Array.from({ length: field.max + 1 }, (_, count) => (
                        <option key={count} value={String(count)}>{count}</option>
                      ))}
                    </select>
                  ) : (
                    <ComboSelect
                      id={key}
                      value={values[key]}
                      options={
                        key === 'spec_model'
                          ? modelOptionsFor(
                              specMemory[values.device_type],
                              values.spec_brand,
                              specOptions.spec_model ?? field.suggestions
                            )
                          : specOptions[key] ?? field.suggestions
                      }
                      onChange={(next) => setField(key, next)}
                      placeholder={field.placeholder}
                      invalid={Boolean(errors[key])}
                      disabled={busy}
                    />
                  )}
                  {errors[key] ? <span className="field__error">{errors[key]}</span> : null}
                </div>
              );
            })}
            </>
          ) : (
            <>
          <div className="field">
            <label className="field__label" htmlFor="asset_ref">Asset Ref *</label>
            <input
              id="asset_ref"
              className={`input${errors.asset_ref ? ' input--error' : ''}`}
              value={values.asset_ref}
              onChange={(event) => setField('asset_ref', event.target.value)}
              placeholder={suggestedRef ? `e.g. ${suggestedRef}` : 'e.g. AST-0222'}
              maxLength={40}
              autoFocus
              autoComplete="off"
              aria-invalid={errors.asset_ref ? true : undefined}
              aria-describedby="asset_ref_hint"
              disabled={busy}
            />
            {errors.asset_ref ? (
              <span className="field__error">{errors.asset_ref}</span>
            ) : (
              <span className="field__hint" id="asset_ref_hint">
                As on its barcode sticker - you can scan it into this box.
                {!isEditing && suggestedRef && !values.asset_ref ? (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setField('asset_ref', suggestedRef)}
                      disabled={busy}
                    >
                      Use next free: {suggestedRef}
                    </button>
                  </>
                ) : null}
              </span>
            )}
          </div>

          {/* Several identical machines usually arrive together. Fill the form
              once, add a reference for each, and they are created in one go.
              Editing an existing asset is always one asset. */}
          {isEditing ? null : (
            <div className="field">
              <span className="field__label">Quantity</span>
              <div className="quantity">
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => setExtraRefs(values.extra_refs.slice(0, -1))}
                  disabled={busy || values.extra_refs.length === 0}
                  aria-label="One fewer"
                >
                  −
                </button>
                <span className="quantity__value" aria-live="polite">
                  {values.extra_refs.length + 1}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => setExtraRefs([...values.extra_refs, ''])}
                  disabled={busy || values.extra_refs.length + 1 >= MAX_BATCH}
                  aria-label="One more"
                >
                  +
                </button>
                <span className="field__hint">
                  {values.extra_refs.length === 0
                    ? 'All the details below are shared by every copy.'
                    : `${values.extra_refs.length + 1} assets, identical apart from their references.`}
                </span>
              </div>
            </div>
          )}

          {values.extra_refs.map((ref, index) => (
            <div className="field" key={`extra-${index}`}>
              <label className="field__label" htmlFor={`extra_ref_${index}`}>
                Asset Ref {index + 2} *
              </label>
              <input
                id={`extra_ref_${index}`}
                className={`input${errors[`extra_ref_${index}`] ? ' input--error' : ''}`}
                value={ref}
                onChange={(event) => {
                  const next = [...values.extra_refs];
                  next[index] = event.target.value;
                  setExtraRefs(next);
                }}
                placeholder="Its own barcode, e.g. AST-0223"
                maxLength={40}
                disabled={busy}
              />
              {errors[`extra_ref_${index}`] ? (
                <span className="field__error">{errors[`extra_ref_${index}`]}</span>
              ) : null}
            </div>
          ))}

          <div className="field">
            <label className="field__label" htmlFor="device_type">Device Type *</label>
            <select
              id="device_type"
              className={`select${errors.device_type ? ' input--error' : ''}`}
              value={values.device_type}
              onChange={(event) => setDeviceType(event.target.value)}
              disabled={busy}
            >
              {DEVICE_TYPES.map((type) => (
                <option key={type} value={type}>{deviceTypeLabel(type)}</option>
              ))}
              {asset && isLegacyDeviceType(asset.device_type) ? (
                <option value={asset.device_type}>{asset.device_type} (older type - choose a current one)</option>
              ) : null}
            </select>
            {errors.device_type ? <span className="field__error">{errors.device_type}</span> : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="owner_name">User</label>
            <ComboSelect
              id="owner_name"
              value={values.owner_name}
              options={users}
              onChange={(next) => setField('owner_name', next)}
              placeholder="Person, or a shared location"
              blankLabel="— Unassigned —"
              addLabel="+ Add someone new…"
              invalid={Boolean(errors.owner_name)}
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
            <ComboSelect
              id="department"
              value={values.department}
              options={departments}
              onChange={(next) => setField('department', next)}
              placeholder="e.g. Finance"
              blankLabel="— Choose a department —"
              addLabel="+ Add a new department…"
              invalid={Boolean(errors.department)}
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
            <label className="field__label" htmlFor="serial_number">Serial number</label>
            <input
              id="serial_number"
              className={`input${errors.serial_number ? ' input--error' : ''}`}
              value={values.serial_number}
              onChange={(event) => setField('serial_number', event.target.value)}
              placeholder="From the label underneath - for warranty claims"
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
            {errors.serial_number ? <span className="field__error">{errors.serial_number}</span> : null}
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

          <h3 className="form-section field--full">Cleaning</h3>
          {tracked && !isEditing && !showLastClean ? (
            <div className="field field--full">
              <button type="button" className="link-button" onClick={() => setShowLastClean(true)} disabled={busy}>
                Already been cleaned? Record its last clean
              </button>
            </div>
          ) : null}
          {tracked ? (
            <>
          {isEditing || showLastClean ? (
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
            <CleanerSelect
              id="cleaned_by"
              value={values.cleaned_by}
              team={team}
              onChange={(next) => setField('cleaned_by', next)}
              invalid={Boolean(errors.cleaned_by)}
              blankLabel="— Not recorded —"
              disabled={busy}
            />
            {errors.cleaned_by ? <span className="field__error">{errors.cleaned_by}</span> : null}
          </div>
            </>
          ) : null}

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
              <span className="field__hint">Defaults to {defaultIntervalFor(values.device_type)} months for a {values.device_type.toLowerCase()}.</span>
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
            {!values.date_cleaned && values.purchase_date ? (
              <span className="field__hint">First clean is due a year after purchase.</span>
            ) : null}
          </div>
            </>
          ) : (
            <div className="field field--full">
              <p className="field__hint">
                Only laptops are on the cleaning rota. This {deviceTypeLabel(values.device_type).toLowerCase()} is
                recorded for the register and will not appear on the Cleaning page.
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
            </>
          )}

          {submitError ? (
            <p className="form-error field--full" role="alert">{submitError}</p>
          ) : null}
        </div>

        <footer className="modal__footer">
          {!isEditing && showSpecs && activeTab === 'specs' ? (
            <button
              type="button"
              className="btn btn--ghost modal__footer-start"
              onClick={() => setTab('details')}
              disabled={busy}
            >
              ← Back to details
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          {offerNext ? (
            <button key="save-without-specs" type="submit" data-skip-specs="true" className="btn btn--ghost" disabled={busy}>
              {values.extra_refs.length > 0
                ? `Add ${values.extra_refs.length + 1} assets`
                : 'Add asset'}{' '}
              without specs
            </button>
          ) : null}
          {offerNext ? (
            // Distinct keys matter: without them React reuses one <button> for
            // both and flips its type mid-click, so Next submitted the form.
            <button key="next" type="button" className="btn btn--primary" onClick={goToSpecs} disabled={busy}>
              Next: Specification →
            </button>
          ) : (
          <button key="save" type="submit" className="btn btn--primary" disabled={busy}>
            {busy
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : values.extra_refs.length > 0
                  ? `Add ${values.extra_refs.length + 1} assets`
                  : 'Add asset'}
          </button>
          )}
        </footer>
      </form>
    </Modal>
  );
}
