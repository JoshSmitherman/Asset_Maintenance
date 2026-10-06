// Light or dark. index.html applies the starting theme before the page
// draws (a saved choice, else the computer's setting); this switches it.

const KEY = 'theme';

export function currentTheme() {
  return document.body.classList.contains('light-mode') ? 'light' : 'dark';
}

export function applyTheme(theme, { remember = true } = {}) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  document.body.classList.toggle('light-mode', theme === 'light');
  if (!remember) return;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
}

/** Follows the computer's setting as it changes, until someone picks one. */
export function followSystemTheme() {
  let saved = null;
  try {
    saved = window.localStorage.getItem(KEY);
  } catch {
    saved = null;
  }
  if (saved || !window.matchMedia) return () => {};
  const query = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = (event) => applyTheme(event.matches ? 'light' : 'dark', { remember: false });
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}
