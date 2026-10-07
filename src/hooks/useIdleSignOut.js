import { useEffect, useRef, useState } from 'react';
import { IDLE_LIMIT_MS, IDLE_WARNING_MS, idleFor, markActive } from '../lib/idle';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove', 'scroll'];
// Writing on every mouse move would be wasteful; once every 15 seconds is
// plenty against a limit measured in minutes.
const WRITE_EVERY_MS = 15 * 1000;
const CHECK_EVERY_MS = 10 * 1000;

/**
 * Watches for activity while someone is signed in. Shortly before the limit
 * it says so (returns the seconds left, for a warning); at the limit it
 * calls onExpire. Returns { secondsLeft, stayActive }.
 */
export function useIdleSignOut({ enabled, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const lastWrite = useRef(0);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const warningShown = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    markActive();
    lastWrite.current = Date.now();

    const onActivity = () => {
      // While the warning is up, only its button counts: a stray mouse move
      // should not silently cancel it.
      if (warningShown.current) return;
      const now = Date.now();
      if (now - lastWrite.current < WRITE_EVERY_MS) return;
      lastWrite.current = now;
      markActive(now);
    };

    const check = () => {
      const idle = idleFor();
      if (idle >= IDLE_LIMIT_MS) {
        warningShown.current = false;
        setSecondsLeft(null);
        expireRef.current();
        return;
      }
      const left = IDLE_LIMIT_MS - idle;
      if (left <= IDLE_WARNING_MS) {
        warningShown.current = true;
        setSecondsLeft(Math.ceil(left / 1000));
      } else if (warningShown.current) {
        // Someone carried on in another tab.
        warningShown.current = false;
        setSecondsLeft(null);
      }
    };

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true });
    // A laptop waking from sleep: check at once rather than at the next tick.
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    // Count down by the second once the warning is showing.
    const countdown = window.setInterval(() => {
      if (warningShown.current) check();
    }, 1000);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      window.clearInterval(countdown);
    };
  }, [enabled]);

  const stayActive = () => {
    warningShown.current = false;
    lastWrite.current = Date.now();
    markActive();
    setSecondsLeft(null);
  };

  return { secondsLeft, stayActive };
}
