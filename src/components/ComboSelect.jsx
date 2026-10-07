import { useMemo, useState } from 'react';

const ADD_NEW = '__add_new__';

/**
 * A dropdown that can still take a value nobody has used before.
 *
 * A plain select would make a new starter or a new department impossible to
 * record until an asset already existed for them, so the list ends with
 * "Add new", which swaps in a text box. Anything already saved is always in
 * the list, otherwise reopening the form would quietly reset it.
 */
export default function ComboSelect({
  id,
  value,
  options = [],
  onChange,
  disabled,
  invalid,
  placeholder,
  blankLabel = '— Not recorded —',
  addLabel = '+ Add new…',
  // Keep the options in the order given (the usual ones first) rather than A-Z.
  sorted = true,
  maxLength = 60
}) {
  const [adding, setAdding] = useState(false);
  // What was chosen before "Add new", so "Choose from the list instead" puts
  // it back rather than jumping to the first option.
  const [before, setBefore] = useState(null);

  const choices = useMemo(() => {
    const all = new Set(options.filter(Boolean));
    if (value) all.add(value);
    const list = [...all];
    return sorted
      ? list.sort((a, b) => a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' }))
      : list;
  }, [options, value, sorted]);

  if (adding) {
    return (
      <div className="combo">
        <input
          id={id}
          className={`input${invalid ? ' input--error' : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus
        />
        <button
          type="button"
          className="combo__back"
          onClick={() => {
            // With no blank choice, go back to the first option rather than
            // leave a value the list cannot show.
            onChange(before ?? (blankLabel === null ? choices[0] ?? '' : ''));
            setBefore(null);
            setAdding(false);
          }}
          disabled={disabled}
        >
          Choose from the list instead
        </button>
      </div>
    );
  }

  return (
    <select
      id={id}
      className={`select${invalid ? ' input--error' : ''}`}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => {
        if (event.target.value === ADD_NEW) {
          setBefore(value || null);
          onChange('');
          setAdding(true);
          return;
        }
        onChange(event.target.value);
      }}
    >
      {blankLabel === null ? null : <option value="">{blankLabel}</option>}
      {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      <option value={ADD_NEW}>{addLabel}</option>
    </select>
  );
}
