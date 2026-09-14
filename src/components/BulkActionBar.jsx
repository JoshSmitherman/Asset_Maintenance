/**
 * Appears once something is ticked, and says what will happen to how many.
 *
 * "Select all matching" is offered separately from the page's own checkbox:
 * ticking the header selects what you can see, which is what people expect,
 * and reaching beyond the page has to be a deliberate second click.
 */
export default function BulkActionBar({
  count,
  matchingCount,
  cleanableCount,
  onSelectAllMatching,
  onClear,
  onAssign,
  onUnassign,
  onRecordClean,
  onDelete
}) {
  if (count === 0) return null;

  return (
    <div className="bulk-bar" role="region" aria-label="Actions for the selected assets">
      <div className="bulk-bar__count">
        <strong>{count}</strong> selected
        {matchingCount > count ? (
          <button type="button" className="bulk-bar__link" onClick={onSelectAllMatching}>
            Select all {matchingCount} matching
          </button>
        ) : null}
      </div>

      <div className="bulk-bar__actions">
        <button type="button" className="btn btn--small btn--brand-light" onClick={onAssign}>
          Assign to…
        </button>
        <button type="button" className="btn btn--small btn--ghost" onClick={onUnassign}>
          Unassign
        </button>
        {onRecordClean ? (
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={onRecordClean}
            disabled={cleanableCount === 0}
            title={
              cleanableCount === 0
                ? 'Only laptops and desktops are in the cleaning rota'
                : `Records one clean against ${cleanableCount} laptop${cleanableCount === 1 ? '' : 's'} or desktop${cleanableCount === 1 ? '' : 's'}`
            }
          >
            Record clean{cleanableCount !== count ? ` (${cleanableCount})` : ''}
          </button>
        ) : null}
        <button type="button" className="btn btn--small btn--danger-ghost" onClick={onDelete}>
          Delete
        </button>
        <button type="button" className="bulk-bar__link" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
