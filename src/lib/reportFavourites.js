/**
 * Favourite reports: starred in the Reports menu, listed together at the top
 * of it, and the one the page opens on.
 *
 * Kept in this browser, per account, so two people sharing a PC keep their
 * own. It is a convenience - if the browser forgets them, nothing is lost -
 * so no database is involved.
 */

const KEY_PREFIX = 'report-favourites';

export function favouritesKey(userId) {
  return `${KEY_PREFIX}:${userId ?? 'signed-out'}`;
}

/**
 * The saved favourites, keeping only reports that still exist and dropping
 * repeats, so a renamed or removed report can never leave a dead entry.
 */
export function loadFavourites(storage, userId, knownIds) {
  try {
    const saved = JSON.parse(storage?.getItem(favouritesKey(userId)) ?? '[]');
    if (!Array.isArray(saved)) return [];
    const known = new Set(knownIds);
    return [...new Set(saved.filter((id) => typeof id === 'string' && known.has(id)))];
  } catch {
    // Unreadable (or storage blocked): start with none rather than fail.
    return [];
  }
}

export function saveFavourites(storage, userId, ids) {
  try {
    storage?.setItem(favouritesKey(userId), JSON.stringify(ids));
  } catch {
    // Storage full or blocked: the stars still work until the page closes.
  }
}

export function toggleFavourite(ids, id) {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

/** Favourites in the order the menu lists them, so the group reads naturally. */
export function inMenuOrder(ids, menuItems) {
  const wanted = new Set(ids);
  return menuItems.filter((item) => wanted.has(item.id));
}
