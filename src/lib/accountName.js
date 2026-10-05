// A display name and initials for the account menu, worked out from the
// email address - the app stores nothing else about a person.
// "bruce.baldomero@adaro.net" -> "Bruce Baldomero", "BB".

export function displayNameFromEmail(email) {
  const local = String(email ?? '').split('@')[0];
  const words = local
    .split(/[._-]+/)
    .map((word) => word.replace(/\d+/g, ''))
    .filter(Boolean);
  if (words.length === 0) return email || 'Signed in';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export function initialsFor(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}
