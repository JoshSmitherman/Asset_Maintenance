import { useEffect, useMemo, useRef, useState } from 'react';
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
import AdminPage from './AdminPage';
import RetireModal from './RetireModal';
import RetiredList from './RetiredList';
import ReleaseNotesPage from './ReleaseNotesPage';
import { CURRENT_VERSION } from '../lib/releaseNotes';
import { versionFromSearch } from '../lib/releaseLinks';
import { assetRefFromSearch, clearAssetFromAddress, findAssetByRef } from '../lib/assetLinks';
import { useAuth } from '../context/AuthContext';
import TabStrip from './TabStrip';
import Pagination from './Pagination';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import { useAssets } from '../hooks/useAssets';
import { useCleaningLog } from '../hooks/useCleaningLog';
import { useRepairs } from '../hooks/useRepairs';
import { DEFAULT_PAGE_SIZE, usePagination } from '../hooks/usePagination';
import { summariseAssets } from '../lib/assetStatus';
import { kitSummary, totalPurchaseValue } from '../lib/dashboardStats';
import { knownModels, specSuggestions } from '../lib/specs';
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
    allAssets,
    retiredAssets,
    loading,
    error,
    lastSyncedAt,
    refresh,
    createAsset,
    createAssets,
    updateAsset,
    recordClean,
    bulkAssign,
    bulkRenameModel,
    bulkRecordClean,
    bulkDelete,
    deleteAsset,
    retireAssets,
    restoreAsset,
    assetRefExists
  } = useAssets();

  const { isAdmin } = useAuth();
  // A shared release link (?v=2.6.0) opens straight on the Release Notes.
  const [page, setPage] = useState(() => (versionFromSearch() ? 'releases' : 'dashboard'));
  // Which release notes this browser has opened, so the header can flag a
  // newer version until it is looked at.
  const [seenVersion, setSeenVersion] = useState(() => {
    try {
      return window.localStorage.getItem('release-notes-seen');
    } catch {
      return null;
    }
  });
  const openReleaseNotes = () => {
    goToPage('releases');
    setSeenVersion(CURRENT_VERSION);
    try {
      window.localStorage.setItem('release-notes-seen', CURRENT_VERSION);
    } catch {
      // Storage blocked: the marker comes back on reload, which is harmless.
    }
  };
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState({ ...DEFAULT_SORT });
  const [formState, setFormState] = useState(null); // { asset?, prefill? }
  const [cleaningTarget, setCleaningTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  // An NFC tag or QR code opens the app at ?asset=AST-0076: once the register
  // has loaded, show that asset's details, as if its eye button were clicked.
  const linkedAssetHandled = useRef(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [retireTarget, setRetireTarget] = useState(null); // { assets: [...], fromBulk }
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
  // Every repair, for the reports; only fetched while they are open.
  const allRepairs = useRepairs({ enabled: page === 'reports' });

  useEffect(() => {
    if (linkedAssetHandled.current || loading) return;
    const ref = assetRefFromSearch();
    if (!ref) return;
    linkedAssetHandled.current = true;
    const linked = findAssetByRef(allAssets, ref);
    if (linked) {
      setPage('assets');
      setDetailsTarget(linked);
      clearAssetFromAddress();
    } else {
      clearAssetFromAddress();
      setToast({ tone: 'error', message: `No asset ${ref} on the register. It may have been renamed or deleted.` });
    }
  }, [loading, allAssets]);

  const detailsAsset = detailsTarget
    ? allAssets.find((asset) => asset.id === detailsTarget.id) ?? detailsTarget
    : null;

  // Retired kit follows the same search and filters as the register.
  const visibleRetired = useMemo(() => filterAssets(retiredAssets, filters), [retiredAssets, filters]);

  const summary = useMemo(() => summariseAssets(assets), [assets]);
  const departments = useMemo(() => uniqueDepartments(assets), [assets]);
  const users = useMemo(() => uniqueUsers(assets), [assets]);
  const totalValue = useMemo(() => totalPurchaseValue(assets), [assets]);
  const kit = useMemo(() => kitSummary(assets), [assets]);
  // Spec dropdowns offer what is already on the register as well as the
  // built-in suggestions, so the lists grow with the fleet.
  const specOptions = useMemo(() => specSuggestions(assets), [assets]);
  // Specs of every model already recorded, so another of the same can copy them.
  const specMemory = useMemo(() => knownModels(assets), [assets]);

  // The cleaning section only ever sees laptops and desktops.
  const cleaningAssets = useMemo(
    () => assets.filter((asset) => isCleaningTracked(asset.device_type)),
    [assets]
  );
  const attentionCount = useMemo(
    () => cleaningAssets.filter((asset) => ATTENTION_STATUSES.includes(asset.status)).length,
    [cleaningAssets]
  );

  // The queue opens on what needs doing; "All" shows every laptop and
  // desktop. A status picked on the dashboard always searches them all.
  const [queueScope, setQueueScope] = useState('attention');
  const queueAssets = useMemo(
    () =>
      queueScope === 'attention'
        ? cleaningAssets.filter((asset) => ATTENTION_STATUSES.includes(asset.status))
        : cleaningAssets,
    [cleaningAssets, queueScope]
  );

  const sourceAssets = page === 'cleaning' ? queueAssets : assets;

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
    setDetailsTarget(allAssets.find((asset) => asset.id === returnToDetails) ?? null);
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
    setReturnToDetails(null);
    setToast({ tone: 'success', message: `Clean recorded for ${asset.asset_ref}.` });
  };

  const handleDelete = async () => {
    const asset = pendingDelete;
    await deleteAsset(asset.id);
    setPendingDelete(null);
    setReturnToDetails(null);
    setToast({ tone: 'success', message: `Asset ${asset.asset_ref} deleted.` });
  };

  const handleRetire = async (values) => {
    const { assets: targets, fromBulk } = retireTarget;
    const count = await retireAssets(targets.map((asset) => asset.id), values);
    setRetireTarget(null);
    setReturnToDetails(null);
    if (fromBulk) clearSelection();
    setToast({
      tone: 'success',
      message:
        targets.length === 1
          ? `${targets[0].asset_ref} retired. It is kept under Retired on the Assets page.`
          : `${count} assets retired. They are kept under Retired on the Assets page.`
    });
  };

  const handleRestore = async (asset) => {
    try {
      await restoreAsset(asset.id);
      setToast({ tone: 'success', message: `${asset.asset_ref} restored to the register.` });
    } catch (caught) {
      setToast({ tone: 'error', message: caught.message });
    }
  };

  return (
    <div className="app">
      {/* Header and nav stick as one block so they cannot pin to the same
          offset and overlap each other. */}
      <div className="app-chrome">
        <Header
          lastSyncedAt={lastSyncedAt}
          onOpenReleaseNotes={openReleaseNotes}
          hasUnseenRelease={seenVersion !== CURRENT_VERSION}
        />
        <AppNav
          page={page}
          onChange={goToPage}
          counts={{ cleaning: attentionCount }}
          showAdmin={isAdmin}
        />
      </div>

      <main className="container">
        {error ? (
          <div className="alert alert--error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn--small" onClick={refresh}>Retry</button>
          </div>
        ) : null}

        {page === 'releases' ? (
          <ReleaseNotesPage />
        ) : page === 'admin' && isAdmin ? (
          <AdminPage onToast={setToast} specMemory={specMemory} onMergeModels={bulkRenameModel} />
        ) : loading ? (
          <p className="empty-state">Loading assets…</p>
        ) : page === 'dashboard' ? (
          <>
            <StatsGrid
              summary={summary}
              kit={kit}
              totalValue={totalValue}
              onSelectType={(deviceType) => {
                setFilters({ ...EMPTY_FILTERS, deviceType });
                goToPage('assets');
              }}
              onSelectStatus={(status) => {
                setFilters({ ...EMPTY_FILTERS, status });
                setQueueScope('all');
                setCleaningTab('queue');
                goToPage('cleaning');
              }}
            />

            <Dashboard assets={assets} />

            <AttentionPanel
              assets={cleaningAssets}
              onRecordClean={setCleaningTarget}
              onOpenQueue={() => {
                setFilters({ ...EMPTY_FILTERS });
                setQueueScope('attention');
                setCleaningTab('queue');
                goToPage('cleaning');
              }}
            />
          </>
        ) : page === 'reports' ? (
          <ReportsPage
            assets={assets}
            retiredAssets={retiredAssets}
            repairs={allRepairs.repairs}
            repairsLoading={allRepairs.loading}
            repairsError={allRepairs.error}
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
                <div className="queue-scope">
                  <div className="segmented" role="group" aria-label="Which machines to list">
                    {[
                      { id: 'attention', label: `Needs attention (${attentionCount})` },
                      { id: 'all', label: `All laptops and desktops (${cleaningAssets.length})` }
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`segmented__option${queueScope === option.id ? ' segmented__option--active' : ''}`}
                        aria-pressed={queueScope === option.id}
                        onClick={() => {
                          setQueueScope(option.id);
                          clearSelection();
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <AssetToolbar
                  filters={filters}
                  onChange={onFiltersChange}
                  departments={departments}
                  resultCount={visibleAssets.length}
                  totalCount={sourceAssets.length}
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
                  onRetire={() => setRetireTarget({ assets: selected, fromBulk: true })}
                  onDelete={isAdmin ? () => setBulkAction('delete') : undefined}
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
                onRetire={() => setRetireTarget({ assets: selected, fromBulk: true })}
                onDelete={isAdmin ? () => setBulkAction('delete') : undefined}
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

            <RetiredList
              assets={visibleRetired}
              onViewDetails={setDetailsTarget}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </>
        )}

      </main>

      <footer className="app-footer">
        <span>
          Cleaning cycle defaults to 6 months (12 for laptops); new kit is first due a year after purchase. Status: Overdue (past due) · Due Soon (within 30 days) · OK (more than 30 days).
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
          specMemory={specMemory}
          onClose={() => {
            setFormState(null);
            backToDetails();
          }}
          onSubmit={(values) =>
            formState.asset ? handleUpdate(formState.asset, values) : handleCreate(values)
          }
        />
      ) : null}

      {detailsAsset ? (
        <AssetDetailsModal
          asset={detailsAsset}
          isAdmin={isAdmin}
          onToast={setToast}
          onClose={() => setDetailsTarget(null)}
          onEdit={(asset) => openFromDetails(asset, (item) => setFormState({ asset: item }))}
          onDelete={isAdmin ? (asset) => openFromDetails(asset, setPendingDelete) : undefined}
          onRecordClean={(asset) => openFromDetails(asset, setCleaningTarget)}
          onRetire={(asset) => openFromDetails(asset, (item) => setRetireTarget({ assets: [item] }))}
          onRestore={handleRestore}
        />
      ) : null}

      {retireTarget ? (
        <RetireModal
          assets={retireTarget.assets}
          onSubmit={handleRetire}
          onClose={() => {
            setRetireTarget(null);
            backToDetails();
          }}
        />
      ) : null}

      {cleaningTarget ? (
        <RecordCleanModal
          asset={cleaningTarget}
          onClose={() => {
            setCleaningTarget(null);
            backToDetails();
          }}
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
