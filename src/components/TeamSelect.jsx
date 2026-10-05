import { displayNameFromEmail } from '../lib/accountName';

/**
 * Picks a person from the team, shown by name with their email alongside so
 * two people with similar names cannot be confused.
 */
export default function TeamSelect({ id, value, team, onChange, disabled, invalid }) {
  // Someone recorded before their account was removed still shows.
  const known = team.some((member) => member.id === value);

  return (
    <select
      id={id}
      className={`select${invalid ? ' input--error' : ''}`}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
      disabled={disabled}
    >
      {!known && value ? <option value={value}>(account removed)</option> : null}
      {team.map((member) => (
        <option key={member.id} value={member.id}>
          {displayNameFromEmail(member.email)} — {member.email}
        </option>
      ))}
    </select>
  );
}
