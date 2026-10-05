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
