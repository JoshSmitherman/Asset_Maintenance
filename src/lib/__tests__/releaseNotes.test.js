import { describe, it, expect } from 'vitest';
import pkg from '../../../package.json';
import { CHANGE_TYPES, CURRENT_VERSION, RELEASES } from '../releaseNotes';
import { isValidIsoDate } from '../dates';

const parse = (version) => version.split('.').map(Number);
const newer = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

describe('release notes', () => {
  it('lead with the version package.json is on', () => {
    expect(CURRENT_VERSION).toBe(pkg.version);
  });

  it('run newest first, with no version twice', () => {
    for (let i = 1; i < RELEASES.length; i += 1) {
      expect(newer(RELEASES[i - 1].version, RELEASES[i].version)).toBe(true);
    }
  });

  it('give every release a title, a real date and only known change types', () => {
    for (const release of RELEASES) {
      expect(release.title).toBeTruthy();
      expect(isValidIsoDate(release.date)).toBe(true);
      for (const section of release.sections) {
        for (const group of section.groups) {
          expect(group.items.length).toBeGreaterThan(0);
          for (const item of group.items) {
            expect(Object.keys(CHANGE_TYPES)).toContain(item.type);
            expect(item.text.trim()).not.toBe('');
          }
        }
      }
    }
  });
});
