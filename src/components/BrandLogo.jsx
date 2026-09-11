import { useState } from 'react';

// Served from public/, so the GitHub Pages base path is applied automatically.
// Several extensions are tried in turn so the upload does not have to be a
// particular format - the first one that loads wins.
const CANDIDATES = [
  'adaro-logo.svg',
  'adaro-logo.png',
  'adaro-logo.jpg',
  'adaro-logo.jpeg',
  'adaro-logo.webp'
];

/**
 * Shows the ADARO logo. If no logo file has been uploaded yet, falls back to a
 * plain wordmark rather than a broken-image icon.
 */
export default function BrandLogo({ className = '' }) {
  const [attempt, setAttempt] = useState(0);
  const exhausted = attempt >= CANDIDATES.length;
  const classes = `${className} ${exhausted ? 'brand-wordmark' : 'brand-logo'}`.trim();

  if (exhausted) return <span className={classes}>ADARO</span>;

  return (
    <img
      key={CANDIDATES[attempt]}
      src={`${import.meta.env.BASE_URL}${CANDIDATES[attempt]}`}
      alt="ADARO"
      className={classes}
      onError={() => setAttempt((current) => current + 1)}
    />
  );
}
