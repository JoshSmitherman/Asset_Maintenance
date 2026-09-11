import { useState } from 'react';

// Served from public/, so it respects the GitHub Pages base path.
const LOGO_SRC = `${import.meta.env.BASE_URL}adaro-logo.png`;

/**
 * Shows the ADARO logo, falling back to a plain wordmark if the image is
 * missing - so the page never renders a broken-image icon.
 */
export default function BrandLogo({ className = '' }) {
  const [failed, setFailed] = useState(false);
  const classes = `${className} ${failed ? 'brand-wordmark' : 'brand-logo'}`.trim();

  if (failed) return <span className={classes}>ADARO</span>;

  return <img src={LOGO_SRC} alt="ADARO" className={classes} onError={() => setFailed(true)} />;
}
