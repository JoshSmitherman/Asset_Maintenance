// Supabase hands back at most 1,000 rows per request (the project's "Max
// rows" setting) and says nothing when it stops there. Anything that needs
// every row reads it a page at a time until a short page comes back, so a
// register past that size is never silently cut short.

export const PAGE_SIZE = 1000;
// A runaway guard, not a limit anyone should reach: 200,000 rows.
const MAX_PAGES = 200;

/**
 * Reads every row of a query. `build` returns a fresh query each time (a
 * Supabase query can only be awaited once); it must order by something
 * unique-ish so pages do not overlap.
 */
export async function fetchAll(build, { pageSize = PAGE_SIZE } = {}) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * pageSize;
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    // Fewer rows than asked for: that was the last page. A server capped
    // below pageSize also lands here, which is why pageSize matches the
    // Supabase default rather than exceeding it.
    if (batch.length < pageSize) return rows;
  }
  return rows;
}

/** Splits a list into chunks, for writes that name rows by id in the URL. */
export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
