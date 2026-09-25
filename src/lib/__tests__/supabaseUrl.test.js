import { describe, it, expect } from 'vitest';
import { normaliseSupabaseUrl, urlNeededFixing } from '../supabaseUrl';

const PROJECT = 'https://mzlhemqspydpghykgead.supabase.co';

describe('normaliseSupabaseUrl', () => {
  it('leaves a correct project URL alone', () => {
    expect(normaliseSupabaseUrl(PROJECT)).toBe(PROJECT);
    expect(urlNeededFixing(PROJECT)).toBe(false);
  });

  it('strips the Data API path that causes "Invalid path specified in request URL"', () => {
    expect(normaliseSupabaseUrl(`${PROJECT}/rest/v1/`)).toBe(PROJECT);
    expect(normaliseSupabaseUrl(`${PROJECT}/rest/v1`)).toBe(PROJECT);
    expect(urlNeededFixing(`${PROJECT}/rest/v1/`)).toBe(true);
  });

  it('strips the other API paths the dashboard shows', () => {
    for (const suffix of ['/auth/v1', '/storage/v1', '/realtime/v1', '/functions/v1']) {
      expect(normaliseSupabaseUrl(`${PROJECT}${suffix}`)).toBe(PROJECT);
      expect(normaliseSupabaseUrl(`${PROJECT}${suffix}/`)).toBe(PROJECT);
    }
  });

  it('tidies stray whitespace and trailing slashes', () => {
    expect(normaliseSupabaseUrl(`  ${PROJECT}/  `)).toBe(PROJECT);
    expect(normaliseSupabaseUrl(`${PROJECT}///`)).toBe(PROJECT);
  });

  it('keeps a self-hosted path prefix, which is not an API path', () => {
    expect(normaliseSupabaseUrl('https://example.com/supabase')).toBe('https://example.com/supabase');
    // Only the API segment comes off, the prefix stays.
    expect(normaliseSupabaseUrl('https://example.com/supabase/rest/v1')).toBe('https://example.com/supabase');
  });

  it('passes a missing value straight through, so the existing check still fires', () => {
    expect(normaliseSupabaseUrl(undefined)).toBeUndefined();
    expect(normaliseSupabaseUrl('')).toBe('');
    expect(urlNeededFixing(undefined)).toBe(false);
  });
});
