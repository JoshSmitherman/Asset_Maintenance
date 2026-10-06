// A web address for each asset, for NFC tags and QR codes:
//   https://<site>/Asset_Maintenance/?asset=AST-0076
// Opening it signs the person in if need be, then shows that asset's details.

const PARAM = 'asset';

/** The address that opens one asset's details. */
export function assetLink(assetRef, { origin = window.location.origin, base = import.meta.env.BASE_URL ?? '/' } = {}) {
  const path = base.endsWith('/') ? base : `${base}/`;
  return `${origin}${path}?${PARAM}=${encodeURIComponent(String(assetRef).trim())}`;
}

/** The asset reference in an address's query string, if there is one. */
export function assetRefFromSearch(search = window.location.search) {
  const value = new URLSearchParams(search).get(PARAM);
  return value && value.trim() ? value.trim() : null;
}

/** Takes ?asset= back off the address bar, so a reload does not reopen it. */
export function clearAssetFromAddress() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/** The register's asset for a reference, ignoring case and spaces. */
export function findAssetByRef(assets, assetRef) {
  const wanted = String(assetRef ?? '').trim().toUpperCase();
  return assets.find((asset) => String(asset.asset_ref).trim().toUpperCase() === wanted) ?? null;
}

/**
 * The next free reference in the register's main series: with AST-0221 and
 * AST-0222 in use, AST-0223. The series is whichever prefix most assets use,
 * keeping its zero padding. Null when there is no such series yet.
 */
export function nextAssetRef(assets) {
  const series = new Map();
  for (const asset of assets) {
    const match = /^([A-Za-z]+-)(\d+)$/.exec(String(asset.asset_ref ?? '').trim());
    if (!match) continue;
    const prefix = match[1].toUpperCase();
    const entry = series.get(prefix) ?? { count: 0, max: 0, width: 0 };
    entry.count += 1;
    entry.max = Math.max(entry.max, Number(match[2]));
    entry.width = Math.max(entry.width, match[2].length);
    series.set(prefix, entry);
  }
  let best = null;
  for (const [prefix, entry] of series) {
    if (!best || entry.count > best.entry.count) best = { prefix, entry };
  }
  if (!best) return null;
  const taken = new Set(assets.map((asset) => String(asset.asset_ref ?? '').trim().toUpperCase()));
  let next = best.entry.max + 1;
  let ref = `${best.prefix}${String(next).padStart(best.entry.width, '0')}`;
  while (taken.has(ref)) {
    next += 1;
    ref = `${best.prefix}${String(next).padStart(best.entry.width, '0')}`;
  }
  return ref;
}
