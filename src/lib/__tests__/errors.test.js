import { describe, it, expect } from 'vitest';
import { describeDatabaseError } from '../errors';

describe('describeDatabaseError — user-facing translations', () => {
  it('maps unique-violation to a duplicate-ref message', () => {
    expect(describeDatabaseError({ code: '23505' }, { assetRef: 'LAP-001' }))
      .toContain('LAP-001');
  });
  it('maps RLS denial (42501) to a permission message', () => {
    expect(describeDatabaseError({ code: '42501' })).toMatch(/permission/i);
  });
  it('maps expired JWT to a re-sign-in message', () => {
    expect(describeDatabaseError({ code: 'PGRST301' })).toMatch(/sign in again/i);
  });
  it('maps a future clean-date trigger error', () => {
    expect(describeDatabaseError({ message: 'Date Cleaned cannot be in the future (2099-01-01).' }))
      .toBe('Date Cleaned cannot be in the future.');
  });
  it('falls back gracefully on unknown errors', () => {
    expect(describeDatabaseError(null)).toMatch(/went wrong/i);
  });
});
