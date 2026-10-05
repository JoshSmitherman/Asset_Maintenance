import { useEffect } from 'react';
import { detectEnvironment, supabaseProjectRef } from '../lib/environment';

const environment = detectEnvironment({
  hostname: window.location.hostname,
  isDev: import.meta.env.DEV,
  override: import.meta.env.VITE_APP_ENV
});
const database = supabaseProjectRef(import.meta.env.VITE_SUPABASE_URL);

/**
 * A full-width strip across the top of every copy except the live site, so a
 * local or test copy is never mistaken for the real thing. It names the
 * database the copy is using, because a local copy normally talks to the
 * live one: what is changed here is changed for everyone.
 */
export default function EnvironmentBanner() {
  // The browser tab says so too, for when the page itself is out of sight.
  useEffect(() => {
    if (environment.kind === 'live') return undefined;
    const original = document.title;
    document.title = `[${environment.kind === 'custom' ? environment.label : 'LOCAL'}] ${original}`;
    return () => {
      document.title = original;
    };
  }, []);

  if (environment.kind === 'live') return null;

  return (
    <div className={`env-banner env-banner--${environment.kind}`} role="note" aria-label={`${environment.label} copy`}>
      <strong className="env-banner__label">{environment.label}</strong>
      <span className="env-banner__text">
        {environment.description}
        {database ? (
          <>
            {' '}Database: <code>{database}</code> - if that is the live one, changes here are real.
          </>
        ) : null}
      </span>
    </div>
  );
}
