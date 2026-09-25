/**
 * Supabase's dashboard shows several URLs, and the one under "Data API" ends
 * in /rest/v1/. Paste that into VITE_SUPABASE_URL and every request the app
 * makes is built on top of it — /rest/v1/auth/v1/token and so on — which the
 * server rejects with "Invalid path specified in request URL", at sign-in,
 * with nothing on screen to say which setting is wrong.
 *
 * So the known API sub-paths are trimmed off here. Only those exact segments
 * are removed, never an arbitrary path, so a self-hosted Supabase living
 * under a prefix like https://example.com/supabase still works.
 */
const API_SUFFIXES = ['/rest/v1', '/auth/v1', '/storage/v1', '/realtime/v1', '/functions/v1'];

export function normaliseSupabaseUrl(value) {
  if (!value) return value;

  let url = String(value).trim().replace(/\/+$/, '');

  for (const suffix of API_SUFFIXES) {
    if (url.toLowerCase().endsWith(suffix)) {
      url = url.slice(0, -suffix.length).replace(/\/+$/, '');
      break;
    }
  }

  return url;
}

/** True when the value carried a path the app had to strip. */
export function urlNeededFixing(value) {
  return Boolean(value) && normaliseSupabaseUrl(value) !== String(value).trim();
}
