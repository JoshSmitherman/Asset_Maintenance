// How a table's order is described in words: "Sorted by Cost (highest
// first)" above the table, and "Sort by Cost, highest first" on a heading.

const TEXT = { asc: 'A to Z', desc: 'Z to A' };
const DATE = { asc: 'oldest first', desc: 'newest first' };

const DIRECTION_WORDS = {
  purchase_cost: { asc: 'lowest first', desc: 'highest first' },
  purchase_date: DATE,
  date_cleaned: DATE,
  updated_at: DATE,
  next_clean_due: { asc: 'soonest first', desc: 'latest first' },
  status: { asc: 'most urgent first', desc: 'least urgent first' }
};

/** "A to Z", "newest first" and so on, for this column and direction. */
export function describeDirection(key, direction) {
  return (DIRECTION_WORDS[key] ?? TEXT)[direction === 'desc' ? 'desc' : 'asc'];
}

/** What clicking a heading does next: flip it if it is the sorted one, else A to Z. */
export function nextSort(sort, key) {
  return sort.key === key
    ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' };
}

export function isSameSort(a, b) {
  return a?.key === b?.key && a?.direction === b?.direction;
}
