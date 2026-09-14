import { useMemo, useState } from 'react';
import Header from './Header';
import AppNav from './AppNav';
import StatsGrid from './StatsGrid';
import Dashboard from './Dashboard';
import AttentionPanel from './AttentionPanel';
import AssetToolbar from './AssetToolbar';
import AssetTable from './AssetTable';
import AssetFormModal from './AssetFormModal';
import RecordCleanModal from './RecordCleanModal';
import AssetDetailsModal from './AssetDetailsModal';
import BulkActionBar from './BulkActionBar';
import BulkCleanModal from './BulkCleanModal';
import AssignUserModal from './AssignUserModal';
import CleaningHistory from './CleaningHistory';
import ReportsPage from './ReportsPage';
import TabStrip from './TabStrip';
import Pagination from './Pagination';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import { useAssets } from '../hooks/useAssets';
import { useCleaningLog } from '../hooks/useCleaningLog';
import { DEFAULT_PAGE_SIZE, usePagination } from '../hooks/usePagination';
import { exportCsv } from '../lib/csv';
import { REGISTER_CSV_COLUMNS, CLEANING_CSV_COLUMNS } from '../lib/assetCsv';
import { summariseAssets } from '../lib/assetStatus';
import { totalPurchaseValue } from '../lib/dashboardStats';
import { specSuggestions } from '../lib/specs';
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  filterAssets,
  sortAssets,
  sortByUrgency,
  uniqueDepartments,
  uniqueUsers
} from '../lib/assetQueries';
import { ATTENTION_STATUSES, isCleaningTracked } from '../lib/constants';

export default function AppShell() {
  const {
    assets,
    loading,
    error,
    lastSyncedAt,
    refresh,
    createAsset,
    createAssets,
    updateAsset,
    recordClean,
    bulkAssign,
    bulkRecordClean,
    bulkDelete,
    deleteAsset,
    assetRefExists
  } = useAssets();

  const [page, setPage] = useState('dashboard');
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState({ ...DEFAULT_SORT });
  const [formState, setFormState] = useState(null); // { asset?, prefill? }
  const [cleaningTarget, setCleaningTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  // Edit and Delete are both launched from the details view. Dialogs never
  // stack - details closes as one opens - so this remembers where the user
  // came from, to hand them back there if they change their mind.
  const [returnToDetails, setReturnToDetails] = useState(null);
  const [toast, setToast] = useState(null);

  // Bulk actions. Selection is by id and survives paging, so you can tick
  // three on one page and two on the next and act on all five.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState(null); // 'assign' | 'clean' | 'delete'
  const [cleaningTab, setCleaningTab] = useState('queue');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const cleaningLog = useCleaningLog({
    enabled: (page === 'cleaning' && cleaningTab === 'history') || page === 'reports'
  });

  const summary = useMemo(() => summariseAssets(assets), [assets]);
  const departments = useMemo(() => uniqueDepartments(assets), [assets]);
  const users = useMemo(() => uniqueUsers(assets), [assets]);
  const totalValue = useMemo(() => totalPurchaseValue(assets), [assets]);
  // Spec dropdowns offer what is already on the register as well as the
  // built-in suggestions, so the lists grow with the fleet.
  const specOptions = useMemo(() => specSuggestions(assets), [assets]);

  // The cleaning section only ever sees laptops and desktops.
  const cleaningAssets = useMemo(
    () => assets.filter((asset) => isCleaningTracked(asset.device_type)),
    [assets]
  );
  const attentionCount = useMemo(
    () => cleaningAssets.filter((asset) => ATTENTION_STATUSES.includes(asset.status)).length,
    [cleaningAssets]
  );

  const sourceAssets = page === 'cleaning' ? cleaningAssets : assets;

  const visibleAssets = useMemo(() => {
    const filtered = filterAssets(sourceAssets, filters);
    // The queue's default order is urgency, which also ranks by how overdue
    // something is - more useful than the plain status grouping a column
    // sort would give. Clicking any heading still sorts normally.
    if (page === 'cleaning' && sort.key === 'status') {
      const byUrgency = sortByUrgency(filtered);
      return sort.direction === 'desc' ? [...byUrgency].reverse() : byUrgency;
    }
    return sortAssets(filtered, sort);
  }, [sourceAssets, filters, sort, page]);

  // On the register, kit nobody holds is listed on its own so it is obvious
  // what is spare or waiting to be issued.
  const unassignedAssets = useMemo(
    () => visibleAssets.filter((asset) => !asset.owner_name),
    [visibleAssets]
  );
  const assignedAssets = useMemo(
    () => visibleAssets.filter((asset) => asset.owner_name),
    [visibleAssets]
  );

  // One pager per list, so paging the register does not move the unassigned
  // list underneath it.
  const assignedPager = usePagination(assignedAssets, pageSize, setPageSize);
  const unassignedPager = usePagination(unassignedAssets, pageSize, setPageSize);
  const cleaningPager = usePagination(visibleAssets, pageSize, setPageSize);

  // Everything currently in view, whichever page of it you are on. A row
  // that a filter has since excluded is not acted on, even if it was ticked
  // before the filter changed.
  const selected = useMemo(
    () => visibleAssets.filter((asset) => selectedIds.has(asset.id)),
    [visibleAssets, selectedIds]
  );
  const cleanableSelection = useMemo(
    () => selected.filter((asset) => isCleaningTracked(asset.device_type)),
    [selected]
  );

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = (ids, checked) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const goToPage = (next) => {
    setPage(next);
    clearSelection();
    // Each page has its own natural order: urgency for the queue, asset
    // reference for the register.
    setSort(next === 'cleaning' ? { key: 'status', direction: 'asc' } : { ...DEFAULT_SORT });
  };

  const onFiltersChange = (next) => {
    setFilters(next);
    // A selection made under one filter should not be acted on under another.
    clearSelection();
  };

  const runBulk = async (work, describe) => {
    try {
      const count = await work();
      setBulkAction(null);
      clearSelection();
      setToast({ tone: 'success', message: describe(count) });
    } catch (caught) {
      setBulkAction(null);
      setToast({ tone: 'error', message: caught.message });
    }
  };

  const handleBulkUnassign = () =>
    runBulk(
      () => bulkAssign(selected.map((asset) => asset.id), null),
      (count) => `${count} asset${count === 1 ? '' : 's'} moved to Unassigned Assets.`
    );

  // Reopen the details the user came from, with whatever the register now
  // holds for that asset rather than the copy captured when it was opened.
  const backToDetails = () => {
    if (!returnToDetails) return;
    setDetailsTarget(assets.find((asset) => asset.id === returnToDetails) ?? null);
    setReturnToDetails(null);
  };

  const openFromDetails = (asset, open) => {
    setReturnToDetails(asset.id);
    setDetailsTarget(null);
    open(asset);
  };

  const handleCreate = async (values) => {
    const extras = values.extra_refs ?? [];
    if (extras.length === 0) {
      await createAsset(values);
      setFormState(null);
      setToast({ tone: 'success', message: `Asset ${values.asset_ref.trim()} added.` });
      return;
    }

    // Identical kit: the same details under each reference in the batch.
    const refs = [values.asset_ref, ...extras].map((ref) => ref.trim());
    await createAssets(refs.map((asset_ref) => ({ ...values, asset_ref })));
    setFormState(null);
    setToast({ tone: 'success', message: `${refs.length} assets added: ${refs.join(', ')}.` });
  };

  const handleUpdate = async (asset, values) => {
    await updateAsset(asset.id, asset.version, values);
    setFormState(null);
    setReturnToDetails(null);
    setToast({ tone: 'success', message: `Asset ${values.asset_ref.trim()} updated.` });
  };

  const handleRecordClean = async (values) => {
    const asset = cleaningTarget;
    await recordClean(asset.id, asset.version, values);
    setCleaningTarget(null);
    setToast({ tone: 'success', message: `Clean recorded for ${asset.asset_ref}.` });
  };

  const handleDelete = async () => {
    const asset = pendingDelete;
    await deleteAsset(asset.id);
    setPendingDelete(null);
    setReturnToDetails(null);
    setToast({ tone: 'success', message: `Asset ${asset.asset_ref} deleted.` });
  };

  return (
    <div className="app">
      {/* Header and nav stick as one block so they cannot pin to the same
          offset and overlap each other. */}
      <div className="app-chrome">
        <Header lastSyncedAt={lastSyncedAt} />
        <AppNav page={page} onChange={goToPage} counts={{ cleaning: attentionCount }} />
      </div>

      <main className="container">
        {error ? (
          <div className="alert alert--error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn--small" onClick={refresh}>Retry</button>
          </div>
        ) : null}

        {loading ? (
          <p className="empty-state">Loading assets…</p>
        ) : page === 'dashboard' ? (
          <>
            <StatsGrid
              summary={summary}
              activeStatus={filters.status}
              onSelectStatus={(status) => {
                setFilters((current) => ({ ...current, status }));
                goToPage(status === 'all' ? 'assets' : 'cleaning');
              }}
              totalValue={totalValue}
            />

            <Dashboard assets={assets} />

            <AttentionPanel assets={cleaningAssets} onRecordClean={setCleaningTarget} />
          </>
        ) : page === 'reports' ? (
          <ReportsPage
            assets={assets}
            log={cleaningLog.entries}
            logLoading={cleaningLog.loading}
            logError={cleaningLog.error}
          />
        ) : page === 'cleaning' ? (
          /* The work queue: what needs doing, most urgent first. Creating and
             editing assets lives on the register, not here. History is the
             same subject, so it sits behind a tab rather than a fourth item
             in the top navigation. */
          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">
                  {cleaningTab === 'history' ? 'Cleaning history' : 'Cleaning queue'}
                </h2>
                <p className="card__subtitle">
                  {cleaningTab === 'history'
                    ? 'Every clean that has been recorded, newest first.'
                    : 'Laptops and desktops, most urgent first. Record a clean straight from the list.'}
                </p>
              </div>
              {cleaningTab === 'queue' ? (
                <span className={`pill${attentionCount ? ' pill--overdue' : ''}`}>{attentionCount}</span>
              ) : null}
            </div>

            <TabStrip
              tabs={[
                { id: 'queue', label: 'Queue' },
                { id: 'history', label: 'History' }
              ]}
              active={cleaningTab}
              onChange={(next) => {
                setCleaningTab(next);
                clearSelection();
              }}
            />

            {cleaningTab === 'history' ? (
              <CleaningHistory
                entries={cleaningLog.entries}
                loading={cleaningLog.loading}
                error={cleaningLog.error}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            ) : (
              <>
                <AssetToolbar
                  filters={filters}
                  onChange={onFiltersChange}
                  departments={departments}
                  resultCount={visibleAssets.length}
                  totalCount={sourceAssets.length}
                  onExport={() => exportCsv('cleaning-queue', CLEANING_CSV_COLUMNS, visibleAssets)}
                />

                <BulkActionBar
                  count={selected.length}
                  matchingCount={visibleAssets.length}
                  cleanableCount={cleanableSelection.length}
                  onSelectAllMatching={() => setSelectedIds(new Set(visibleAssets.map((asset) => asset.id)))}
                  onClear={clearSelection}
                  onAssign={() => setBulkAction('assign')}
                  onUnassign={handleBulkUnassign}
                  onRecordClean={() => setBulkAction('clean')}
                  onDelete={() => setBulkAction('delete')}
                />

                <AssetTable
                  assets={cleaningPager.pageItems}
                  sort={sort}
                  onSortChange={setSort}
                  variant="cleaning"
                  onRecordClean={setCleaningTarget}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                />
                <Pagination {...cleaningPager} label="the cleaning queue" />
              </>
            )}
          </section>
        ) : (
          /* The register: everything owned, and what we know about it. */
          <>
            <section className="card">
              <div className="card__header">
                <div>
                  <h2 className="card__title">Asset register</h2>
                  <p className="card__subtitle">
                    Every device we own, with its user, location and purchase details.
                  </p>
                </div>
                <button type="button" className="btn btn--primary" onClick={() => setFormState({})}>
                  + Add asset
                </button>
              </div>

              <AssetToolbar
                filters={filters}
                onChange={onFiltersChange}
                departments={departments}
                resultCount={visibleAssets.length}
                totalCount={sourceAssets.length}
                onExport={() => exportCsv('asset-register', REGISTER_CSV_COLUMNS, visibleAssets)}
              />

              <BulkActionBar
                count={selected.length}
                matchingCount={visibleAssets.length}
                cleanableCount={cleanableSelection.length}
                onSelectAllMatching={() => setSelectedIds(new Set(visibleAssets.map((asset) => asset.id)))}
                onClear={clearSelection}
                onAssign={() => setBulkAction('assign')}
                onUnassign={handleBulkUnassign}
                onRecordClean={() => setBulkAction('clean')}
                onDelete={() => setBulkAction('delete')}
              />

              <AssetTable
                assets={assignedPager.pageItems}
                sort={sort}
                onSortChange={setSort}
                variant="full"
                onViewDetails={setDetailsTarget}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
              <Pagination {...assignedPager} label="the asset register" />
            </section>

            <section className="card">
              <div className="card__header">
                <div>
                  <h2 className="card__title">Unassigned Assets</h2>
                  <p className="card__subtitle">
                    Nobody is recorded as using these — spare kit, or waiting to be issued.
                  </p>
                </div>
                <span className="pill">{unassignedAssets.length}</span>
              </div>

              <AssetTable
                assets={unassignedPager.pageItems}
                sort={sort}
                onSortChange={setSort}
                variant="full"
                onViewDetails={setDetailsTarget}
                emptyMessage="Nothing spare — every asset in this view has a user."
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
              <Pagination {...unassignedPager} label="the unassigned list" />
            </section>
          </>
        )}

      </main>

      <footer className="app-footer">
        <span>
          Cleaning cycle defaults to 6 months. Status: Overdue (past due) · Due Soon (within 30 days) · OK (more than 30 days).
        </span>
      </footer>

      {formState ? (
        <AssetFormModal
          asset={formState.asset}
          prefill={formState.prefill}
          assetRefExists={assetRefExists}
          departments={departments}
          users={users}
          specOptions={specOptions}
          onClose={() => {
            setFormState(null);
            backToDetails();
          }}
          onSubmit={(values) =>
            formState.asset ? handleUpdate(formState.asset, values) : handleCreate(values)
          }
        />
      ) : null}

      {detailsTarget ? (
        <AssetDetailsModal
          asset={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onEdit={(asset) => openFromDetails(asset, (item) => setFormState({ asset: item }))}
          onDelete={(asset) => openFromDetails(asset, setPendingDelete)}
        />
      ) : null}

      {cleaningTarget ? (
        <RecordCleanModal
          asset={cleaningTarget}
          onClose={() => setCleaningTarget(null)}
          onSubmit={handleRecordClean}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete asset"
          message={`Delete ${pendingDelete.asset_ref} (${pendingDelete.owner_name ?? 'unassigned'})? This removes it for everyone and cannot be undone.`}
          confirmLabel="Delete asset"
          onConfirm={handleDelete}
          onCancel={() => {
            setPendingDelete(null);
            backToDetails();
          }}
        />
      ) : null}

      {bulkAction === 'assign' ? (
        <AssignUserModal
          count={selected.length}
          users={users}
          onClose={() => setBulkAction(null)}
          onSubmit={(owner) =>
            runBulk(
              () => bulkAssign(selected.map((asset) => asset.id), owner),
              (count) => `${count} asset${count === 1 ? '' : 's'} assigned to ${owner}.`
            )
          }
        />
      ) : null}

      {bulkAction === 'clean' ? (
        <BulkCleanModal
          count={cleanableSelection.length}
          onClose={() => setBulkAction(null)}
          onSubmit={(values) =>
            runBulk(
              () => bulkRecordClean(cleanableSelection.map((asset) => asset.id), values),
              (count) => `Clean recorded for ${count} asset${count === 1 ? '' : 's'}.`
            )
          }
        />
      ) : null}

      {bulkAction === 'delete' ? (
        <ConfirmDialog
          title={`Delete ${selected.length} asset${selected.length === 1 ? '' : 's'}`}
          message={`This removes ${selected.map((asset) => asset.asset_ref).slice(0, 8).join(', ')}${selected.length > 8 ? ` and ${selected.length - 8} more` : ''} for everyone. It cannot be undone.`}
          confirmLabel={`Delete ${selected.length}`}
          onConfirm={() =>
            runBulk(
              () => bulkDelete(selected.map((asset) => asset.id)),
              (count) => `${count} asset${count === 1 ? '' : 's'} deleted.`
            )
          }
          onCancel={() => setBulkAction(null)}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
