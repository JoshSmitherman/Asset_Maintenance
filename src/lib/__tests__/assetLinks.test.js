import { describe, it, expect } from 'vitest';
import { assetLink, assetRefFromSearch, findAssetByRef } from '../assetLinks';

describe('assetLink', () => {
  it('builds the address under the site path', () => {
    expect(assetLink('AST-0076', { origin: 'https://joshsmitherman.github.io', base: '/Asset_Maintenance/' }))
      .toBe('https://joshsmitherman.github.io/Asset_Maintenance/?asset=AST-0076');
  });
  it('escapes a reference with unusual characters', () => {
    expect(assetLink('LAP 01/A', { origin: 'https://x.io', base: '/' })).toBe('https://x.io/?asset=LAP%2001%2FA');
  });
});

describe('assetRefFromSearch', () => {
  it('reads the reference, and ignores a blank one', () => {
    expect(assetRefFromSearch('?asset=AST-0076')).toBe('AST-0076');
    expect(assetRefFromSearch('?asset=%20')).toBeNull();
    expect(assetRefFromSearch('')).toBeNull();
  });
});

describe('findAssetByRef', () => {
  it('matches ignoring case and surrounding spaces', () => {
    const assets = [{ asset_ref: 'AST-0076 ' }];
    expect(findAssetByRef(assets, 'ast-0076')).toBe(assets[0]);
    expect(findAssetByRef(assets, 'AST-0077')).toBeNull();
  });
});
