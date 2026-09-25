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
        detectSessionInUrl: false,
        storageKey: 'it-hardware-tracker-auth'
      },
      realtime: { params: { eventsPerSecond: 5 } }
    })
  : null;
