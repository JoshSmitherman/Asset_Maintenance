// Each release has its own address, as on Ascend: ?v=2.6.0 opens the
// Release Notes at that version, so a link to one release can be shared.

import { RELEASES } from './releaseNotes.js';

const PARAM = 'v';

/** The version named in the address, if it is one that exists. */
export function versionFromSearch(search = window.location.search) {
  const value = new URLSearchParams(search).get(PARAM);
  return RELEASES.some((release) => release.version === value) ? value : null;
}

/** Puts ?v= in the address bar (or takes it off with null), without a reload. */
export function setVersionInAddress(version) {
  const url = new URL(window.location.href);
  if (version) url.searchParams.set(PARAM, version);
  else url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
