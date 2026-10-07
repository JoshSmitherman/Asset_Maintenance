// Signing out after a period with nothing done, so a laptop left open (or
// unlocked on someone else's desk) does not stay in Orbit for good.
//
// Activity is shared between tabs through localStorage: working in one
// Orbit tab keeps the others signed in too, and signing out in one signs
// out all of them (Supabase does that part).

/** How long with nothing done before signing out. */
export const IDLE_LIMIT_MS = 60 * 60 * 1000;
/** How long before that the "still there?" warning appears. */
export const IDLE_WARNING_MS = 2 * 60 * 1000;

const ACTIVE_KEY = 'orbit-last-active';
const REASON_KEY = 'orbit-signed-out-reason';

export function lastActiveAt() {
  try {
    const value = Number(window.localStorage.getItem(ACTIVE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function markActive(now = Date.now()) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, String(now));
  } catch {
    // Storage blocked: this tab still times itself.
  }
}

/** Milliseconds since anything was done in any Orbit tab (0 if unknown). */
export function idleFor(now = Date.now()) {
  const last = lastActiveAt();
  return last ? Math.max(0, now - last) : 0;
}

export function isIdleExpired(now = Date.now()) {
  return idleFor(now) >= IDLE_LIMIT_MS;
}

/** Remembers why someone was signed out, for the sign-in page to say. */
export function rememberSignOutReason(reason) {
  try {
    window.localStorage.setItem(REASON_KEY, reason);
  } catch {
    // Nothing to remember it in; the sign-in page just will not explain.
  }
}

/** Reads the reason once, then forgets it. */
export function takeSignOutReason() {
  try {
    const reason = window.localStorage.getItem(REASON_KEY);
    window.localStorage.removeItem(REASON_KEY);
    return reason;
  } catch {
    return null;
  }
}

export function forgetActivity() {
  try {
    window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Nothing stored.
  }
}

export function describeIdleLimit() {
  const minutes = Math.round(IDLE_LIMIT_MS / 60000);
  return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${minutes} minutes`;
}
