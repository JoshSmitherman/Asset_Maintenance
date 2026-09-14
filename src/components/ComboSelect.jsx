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
  addLabel = '+ Add new…'
}) {
  const [adding, setAdding] = useState(false);

  const choices = useMemo(() => {
    const all = new Set(options.filter(Boolean));
    if (value) all.add(value);
    return [...all].sort((a, b) =>
      a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' })
    );
  }, [options, value]);

  if (adding) {
    return (
      <div className="combo">
        <input
          id={id}
          className={`input${invalid ? ' input--error' : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={60}
          disabled={disabled}
          autoFocus
        />
        <button
          type="button"
          className="combo__back"
          onClick={() => {
            onChange('');
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
          onChange('');
          setAdding(true);
          return;
        }
        onChange(event.target.value);
      }}
    >
      <option value="">{blankLabel}</option>
      {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      <option value={ADD_NEW}>{addLabel}</option>
    </select>
  );
}
