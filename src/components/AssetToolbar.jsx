import { DEVICE_TYPES, LOCATIONS, OTHER_KIT_FILTER, STATUS_FILTER_VALUES } from '../lib/constants';
import { EMPTY_FILTERS } from '../lib/assetQueries';

export default function AssetToolbar({ filters, onChange, departments, resultCount, totalCount, deviceTypes, showOtherKit = true, onFindRef, cleaners = [] }) {
  const update = (patch) => onChange({ ...filters, ...patch });
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="toolbar">
      <div className="toolbar__row">
        {/* A form so Enter does something: a barcode scanner types the code
            on the sticker and presses Enter, which opens that asset. */}
        <form
          className="toolbar__search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onFindRef?.(filters.search);
          }}
        >
          <label className="sr-only" htmlFor="asset-search">Search assets, or scan a barcode</label>
          <input
            id="asset-search"
            className="input"
            type="search"
            placeholder="Search or scan a barcode (e.g. AST-0222) - asset ref, user, department, notes…"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            autoComplete="off"
          />
        </form>
      </div>

      <div className="toolbar__row toolbar__row--filters">
        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-device">Device type</label>
          <select
            id="filter-device"
            className="select"
            value={filters.deviceType}
            onChange={(event) => update({ deviceType: event.target.value })}
          >
            <option value="all">All</option>
            {(deviceTypes ?? DEVICE_TYPES).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
            {showOtherKit ? (
              <option value={OTHER_KIT_FILTER}>Peripherals &amp; other (not laptops, desktops or monitors)</option>
            ) : null}
          </select>
        </div>

        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-department">Department</label>
          <select
            id="filter-department"
            className="select"
            value={filters.department}
            onChange={(event) => update({ department: event.target.value })}
          >
            <option value="all">All</option>
            {departments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        </div>

        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-location">Location</label>
          <select
            id="filter-location"
            className="select"
            value={filters.location}
            onChange={(event) => update({ location: event.target.value })}
          >
            <option value="all">All</option>
            {LOCATIONS.map((place) => <option key={place} value={place}>{place}</option>)}
            <option value="unassigned">Not recorded</option>
          </select>
        </div>

        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-cleaner">Cleaned by</label>
          <select
            id="filter-cleaner"
            className="select"
            value={filters.cleanedBy}
            onChange={(event) => update({ cleanedBy: event.target.value })}
          >
            <option value="all">All</option>
            {cleaners.map((cleaner) => <option key={cleaner} value={cleaner}>{cleaner}</option>)}
            <option value="unassigned">Not recorded</option>
          </select>
        </div>

        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            className="select"
            value={filters.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="all">All</option>
            {STATUS_FILTER_VALUES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <div className="toolbar__meta">
          <span className="cell-muted">
            Showing {resultCount} of {totalCount}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            disabled={!isFiltered}
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
