import { displayName } from '../lib/access';

/**
 * Picks a person from the team, shown by name with their email alongside so
 * two people with similar names cannot be confused. Only people who have
 * signed in at least once can be chosen: the record links to their account.
 */
export default function TeamSelect({ id, value, team, onChange, disabled, invalid }) {
  const choosable = team.filter((member) => member.id);
  // Someone recorded before their account was removed still shows.
  const known = choosable.some((member) => member.id === value);

  return (
    <select
      id={id}
      className={`select${invalid ? ' input--error' : ''}`}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
      disabled={disabled}
      aria-invalid={invalid ? true : undefined}
    >
      {!known && value ? <option value={value}>(account removed)</option> : null}
      {!value ? <option value="">— Choose —</option> : null}
      {choosable.map((member) => (
        <option key={member.id} value={member.id}>
          {displayName(member)} — {member.email}
        </option>
      ))}
    </select>
  );
}
