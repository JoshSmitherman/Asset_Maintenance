import { displayName } from '../lib/access';

/**
 * Who cleaned it: a name from the team. Older records may hold initials from
 * before cleaners came from the team list; those still show and can be kept.
 */
export function cleanerOptions(team, current) {
  const names = [...new Set(team.map(displayName).filter(Boolean))];
  if (current && !names.includes(current)) names.unshift(current);
  return names;
}

export default function CleanerSelect({ id, value, team, onChange, disabled, invalid, blankLabel = '— Choose —', describedBy }) {
  const options = cleanerOptions(team, value);
  return (
    <select
      id={id}
      className={`select${invalid ? ' input--error' : ''}`}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
    >
      <option value="">{blankLabel}</option>
      {options.map((name) => <option key={name} value={name}>{name}</option>)}
    </select>
  );
}
