// Which copy of the tracker this is, so nobody mistakes a test copy for the
// live site (or the other way round). The live site shows nothing; anything
// else gets a banner across the top and a tag on the browser tab.
//
//   npm run dev      on this computer   -> LOCAL - DEVELOPMENT
//   npm run preview  on this computer   -> LOCAL - PREVIEW (the live build)
//   VITE_APP_ENV=staging (or any name)  -> that name, e.g. STAGING
//   the GitHub Pages site               -> live, no banner

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'];

export function isLocalHost(hostname) {
  const host = String(hostname ?? '').toLowerCase();
  return LOCAL_HOSTS.includes(host) || host.endsWith('.local') || /^192\.168\./.test(host) || /^10\./.test(host);
}

/**
 * { kind, label, description } for this copy. kind is 'live', 'local-dev',
 * 'local-preview' or 'custom' (named by VITE_APP_ENV).
 */
export function detectEnvironment({ hostname, isDev, override } = {}) {
  const named = String(override ?? '').trim();
  if (named && named.toLowerCase() !== 'live' && named.toLowerCase() !== 'production') {
    return {
      kind: 'custom',
      label: named.toUpperCase(),
      description: 'A test copy of the tracker, not the live site.'
    };
  }
  if (named) return { kind: 'live', label: 'LIVE', description: '' };
  if (!isLocalHost(hostname)) return { kind: 'live', label: 'LIVE', description: '' };
  return isDev
    ? {
        kind: 'local-dev',
        label: 'LOCAL · DEVELOPMENT',
        description: 'Running on this computer with npm run dev. Edits to the code show as soon as they are saved.'
      }
    : {
        kind: 'local-preview',
        label: 'LOCAL · PREVIEW',
        description: 'The live build, run on this computer with npm run preview, to check before it goes live.'
      };
}

/** "abcdefgh" from https://abcdefgh.supabase.co - the database's project name. */
export function supabaseProjectRef(url) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.supabase.co') ? host.split('.')[0] : host;
  } catch {
    return null;
  }
}
