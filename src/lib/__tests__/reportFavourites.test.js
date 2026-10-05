import { describe, it, expect } from 'vitest';
import { favouritesKey, inMenuOrder, loadFavourites, saveFavourites, toggleFavourite } from '../reportFavourites';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    data
  };
}

const KNOWN = ['assets_by', 'person', 'due_this_month', 'repairs'];

describe('report favourites', () => {
  it('keeps each person\'s favourites apart', () => {
    expect(favouritesKey('ann')).not.toBe(favouritesKey('bo'));
  });

  it('saves and loads a person\'s favourites', () => {
    const storage = memoryStorage();
    saveFavourites(storage, 'ann', ['person', 'repairs']);
    expect(loadFavourites(storage, 'ann', KNOWN)).toEqual(['person', 'repairs']);
    expect(loadFavourites(storage, 'bo', KNOWN)).toEqual([]);
  });

  it('drops reports that no longer exist, and repeats', () => {
    const storage = memoryStorage({ [favouritesKey('ann')]: JSON.stringify(['person', 'gone', 'person', 7]) });
    expect(loadFavourites(storage, 'ann', KNOWN)).toEqual(['person']);
  });

  it('starts with none rather than failing on a damaged or blocked store', () => {
    expect(loadFavourites(memoryStorage({ [favouritesKey('ann')]: '{not json' }), 'ann', KNOWN)).toEqual([]);
    expect(loadFavourites(memoryStorage({ [favouritesKey('ann')]: '"person"' }), 'ann', KNOWN)).toEqual([]);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadFavourites(blocked, 'ann', KNOWN)).toEqual([]);
    expect(() => saveFavourites(blocked, 'ann', ['person'])).not.toThrow();
  });

  it('stars and unstars', () => {
    expect(toggleFavourite([], 'person')).toEqual(['person']);
    expect(toggleFavourite(['person', 'repairs'], 'person')).toEqual(['repairs']);
  });

  it('lists favourites in menu order, not the order they were starred', () => {
    const menu = KNOWN.map((id) => ({ id }));
    expect(inMenuOrder(['repairs', 'assets_by'], menu).map((item) => item.id)).toEqual(['assets_by', 'repairs']);
  });
});
