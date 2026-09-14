const PAGE_SIZES = [5, 10, 25, 50];

/**
 * Page controls for a table. Five at a time keeps a list short enough to take
 * in at a glance; the size picker is there for when the fleet outgrows that.
 */
export default function Pagination({ page, pageCount, pageSize, total, from, to, onPageChange, onPageSizeChange, label }) {
  if (total === 0) return null;

  return (
    <div className="pager">
      <span className="pager__status">
        {from}–{to} of {total}
      </span>

      <div className="pager__controls">
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={`Previous page of ${label}`}
        >
          Previous
        </button>
        <span className="pager__page">Page {page} of {pageCount}</span>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label={`Next page of ${label}`}
        >
          Next
        </button>

        <label className="pager__size">
          <span className="sr-only">Rows per page</span>
          <select
            className="select select--small"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
