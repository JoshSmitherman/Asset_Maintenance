import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadFavourites, saveFavourites, toggleFavourite } from '../lib/reportFavourites';

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The signed-in person's favourite reports, remembered in this browser. */
export function useReportFavourites(knownIds) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [favourites, setFavourites] = useState(() => loadFavourites(browserStorage(), userId, knownIds));

  // Someone else signing in on the same browser gets their own list.
  useEffect(() => {
    setFavourites(loadFavourites(browserStorage(), userId, knownIds));
    // knownIds is the fixed report menu; only the person changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggle = useCallback(
    (id) =>
      setFavourites((current) => {
        const next = toggleFavourite(current, id);
        saveFavourites(browserStorage(), userId, next);
        return next;
      }),
    [userId]
  );

  return { favourites, isFavourite: (id) => favourites.includes(id), toggle };
}
