import { useEffect, useRef, useState } from 'react';
import { applyTheme, currentTheme, followSystemTheme } from '../lib/theme';

/** The sun/moon switch in the header. */
export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme);
  const stopFollowing = useRef(() => {});

  useEffect(() => {
    const stop = followSystemTheme();
    stopFollowing.current = stop;
    // Keep the icon right if the system setting flips the theme.
    const observer = new MutationObserver(() => setTheme(currentTheme()));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      stop();
      observer.disconnect();
    };
  }, []);

  const next = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;

  return (
    <button
      type="button"
      className={`theme-switch ${className}`}
      onClick={() => {
        // A choice made here wins over the computer's setting from now on.
        stopFollowing.current();
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
