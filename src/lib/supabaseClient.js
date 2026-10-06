import { createClient } from '@supabase/supabase-js';
import { normaliseSupabaseUrl, urlNeededFixing } from './supabaseUrl';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = normaliseSupabaseUrl(configuredUrl);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (urlNeededFixing(configuredUrl)) {
  // Corrected rather than failed, but say so: the setting itself is wrong and
  // somebody should fix it at source.
  // eslint-disable-next-line no-console
  console.warn(
    `VITE_SUPABASE_URL should be just the project URL. Using "${supabaseUrl}" ` +
      `instead of "${String(configuredUrl).trim()}".`
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      '(in .env.local for local development, or as GitHub Actions secrets for the deployed build).'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Microsoft sign-in comes back to the site with a one-time code in
        // the address; Supabase swaps it for a session and tidies the address.
        // PKCE keeps the token itself out of the address and history.
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'it-hardware-tracker-auth'
      },
      realtime: { params: { eventsPerSecond: 5 } }
    })
  : null;

/**
 * Which sign-in methods the Supabase project has switched on, from its
 * public settings (no sign-in needed). Lets the sign-in page offer Microsoft
 * only once it has been set up. Null if it cannot be read.
 */
export async function fetchSignInMethods() {
  if (!isSupabaseConfigured) return null;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey }
    });
    if (!response.ok) return null;
    const settings = await response.json();
    return {
      microsoft: Boolean(settings?.external?.azure),
      password: settings?.external?.email !== false
    };
  } catch {
    return null;
  }
}
