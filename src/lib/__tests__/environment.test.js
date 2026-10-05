import { describe, it, expect } from 'vitest';
import { detectEnvironment, isLocalHost, supabaseProjectRef } from '../environment';

describe('detectEnvironment', () => {
  it('shows nothing on the live site', () => {
    expect(detectEnvironment({ hostname: 'joshsmitherman.github.io', isDev: false }).kind).toBe('live');
  });
  it('tells the dev server from a preview of the live build on this computer', () => {
    expect(detectEnvironment({ hostname: 'localhost', isDev: true }).label).toBe('LOCAL · DEVELOPMENT');
    expect(detectEnvironment({ hostname: '127.0.0.1', isDev: false }).label).toBe('LOCAL · PREVIEW');
  });
  it('uses a name given in VITE_APP_ENV, and treats live/production as live', () => {
    expect(detectEnvironment({ hostname: 'test.example.com', override: 'staging' }).label).toBe('STAGING');
    expect(detectEnvironment({ hostname: 'localhost', isDev: true, override: 'production' }).kind).toBe('live');
  });
});

describe('isLocalHost', () => {
  it('counts this computer and the home network as local', () => {
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('192.168.1.20')).toBe(true);
    expect(isLocalHost('joshsmitherman.github.io')).toBe(false);
  });
});

describe('supabaseProjectRef', () => {
  it('gives the project name from the database address', () => {
    expect(supabaseProjectRef('https://abcdefgh.supabase.co')).toBe('abcdefgh');
    expect(supabaseProjectRef('not a url')).toBeNull();
  });
});
