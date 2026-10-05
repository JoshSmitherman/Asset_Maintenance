import { describe, it, expect } from 'vitest';
import { editDistance, looksLikeSameModel, pairKey, similarKnownModels, similarModelGroups } from '../modelNames';

describe('looksLikeSameModel', () => {
  it('catches typos, spacing and case', () => {
    expect(looksLikeSameModel('Dell Latitude 5540', 'Dell Lattitude 5540')).toBe(true);
    expect(looksLikeSameModel('Dell Latitude 5540', 'dell latitude5540')).toBe(true);
    expect(looksLikeSameModel('Dell Latitude 5540', 'Del Latitude 5540')).toBe(true);
    expect(looksLikeSameModel('HP EliteBook 840 G10', 'HP Elitebok 840 G10')).toBe(true);
  });

  it('keeps different model numbers apart, however close the spelling', () => {
    expect(looksLikeSameModel('Dell Latitude 5540', 'Dell Latitude 5550')).toBe(false);
    expect(looksLikeSameModel('HP EliteBook 840 G10', 'HP EliteBook 840 G9')).toBe(false);
  });

  it('does not match names that are simply different', () => {
    expect(looksLikeSameModel('Dell Latitude 5540', 'Dell Precision 5540')).toBe(false);
    expect(looksLikeSameModel('Dell OptiPlex 7010', 'HP ProDesk 7010')).toBe(false);
  });
});

describe('editDistance', () => {
  it('counts a swap of neighbouring letters as one edit', () => {
    expect(editDistance('latitude', 'laitude')).toBe(1);
    expect(editDistance('latitude', 'latiutde')).toBe(1);
  });
});

const latitude = { key: 'dell latitude 5540', brand: 'Dell', model: 'Latitude 5540', label: 'Dell Latitude 5540', count: 3, refs: ['L1', 'L2', 'L3'], ids: ['1', '2', '3'] };
const typo = { key: 'dell lattitude 5540', brand: 'Dell', model: 'Lattitude 5540', label: 'Dell Lattitude 5540', count: 1, refs: ['L4'], ids: ['4'] };
const other = { key: 'dell latitude 5550', brand: 'Dell', model: 'Latitude 5550', label: 'Dell Latitude 5550', count: 2, refs: ['L5', 'L6'], ids: ['5', '6'] };

describe('similarKnownModels', () => {
  it('suggests the known spelling for a typo, not for an exact match', () => {
    expect(similarKnownModels([latitude, other], 'Dell', 'Lattitude 5540')).toEqual([latitude]);
    expect(similarKnownModels([latitude, other], 'Dell', 'Latitude 5540')).toEqual([]);
  });
});

describe('similarModelGroups', () => {
  it('groups spellings of one model, the most common first', () => {
    const groups = similarModelGroups({ Laptop: [typo, other, latitude] });
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((entry) => entry.label)).toEqual(['Dell Latitude 5540', 'Dell Lattitude 5540']);
  });

  it('leaves alone a pair marked as genuinely different', () => {
    const notSame = new Set([pairKey(latitude.key, typo.key)]);
    expect(similarModelGroups({ Laptop: [latitude, typo] }, notSame)).toEqual([]);
  });
});
