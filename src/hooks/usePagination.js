import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 5;

/**
 * Slices a list into pages.
 *
 * The page resets whenever the list itself changes shape - a filter, a search,
 * a deletion - because being left on page 7 of a 2-page result looks like an
 * empty table.
 */
export function usePagination(items, pageSize, onPageSizeChange) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(items.length / pageSize))));
  }, [items.length, pageSize]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return {
    page,
    pageCount,
    pageSize,
    total,
    pageItems,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    onPageChange: (next) => setPage(Math.min(Math.max(1, next), pageCount)),
    onPageSizeChange: (next) => {
      onPageSizeChange?.(next);
      setPage(1);
    },
    resetPage: () => setPage(1)
  };
}
