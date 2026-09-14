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
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import { useAssets } from '../hooks/useAssets';
import { summariseAssets } from '../lib/assetStatus';
import { totalPurchaseValue } from '../lib/dashboardStats';
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
    updateAsset,
    recordClean,
    deleteAsset,
    assetRefExists
  } = useAssets();

  const [page, setPage] = useState('dashboard');
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState({ ...DEFAULT_SORT });
  const [formState, setFormState] = useState(null); // { asset?, prefill? }
  const [cleaningTarget, setCleaningTarget] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const summary = useMemo(() => summariseAssets(assets), [assets]);
  const departments = useMemo(() => uniqueDepartments(assets), [assets]);
  const users = useMemo(() => uniqueUsers(assets), [assets]);
  const totalValue = useMemo(() => totalPurchaseValue(assets), [assets]);

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

  const goToPage = (next) => {
    setPage(next);
    // Each page has its own natural order: urgency for the queue, asset
    // reference for the register.
    setSort(next === 'cleaning' ? { key: 'status', direction: 'asc' } : { ...DEFAULT_SORT });
  };

  const handleCreate = async (values) => {
    await createAsset(values);
    setFormState(null);
    setToast({ tone: 'success', message: `Asset ${values.asset_ref.trim()} added.` });
  };

  const handleUpdate = async (asset, values) => {
    await updateAsset(asset.id, asset.version, values);
    setFormState(null);
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
        ) : page === 'cleaning' ? (
          /* The work queue: what needs doing, most urgent first. Creating and
             editing assets lives on the register, not here. */
          <section className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Cleaning queue</h2>
                <p className="card__subtitle">
                  Laptops and desktops, most urgent first. Record a clean straight from the list.
                </p>
              </div>
              <span className={`pill${attentionCount ? ' pill--overdue' : ''}`}>{attentionCount}</span>
            </div>

            <AssetToolbar
              filters={filters}
              onChange={setFilters}
              departments={departments}
              resultCount={visibleAssets.length}
              totalCount={sourceAssets.length}
            />

            <AssetTable
              assets={visibleAssets}
              sort={sort}
              onSortChange={setSort}
              variant="cleaning"
              onRecordClean={setCleaningTarget}
            />
          </section>
        ) : (
          /* The register: everything owned, and what we know about it. */
          <>
            {unassignedAssets.length > 0 ? (
              <section className="card">
                <div className="card__header">
                  <div>
                    <h2 className="card__title">Unassigned devices</h2>
                    <p className="card__subtitle">
                      Nobody is recorded as using these — spare kit, or waiting to be issued.
                    </p>
                  </div>
                  <span className="pill">{unassignedAssets.length}</span>
                </div>

                <AssetTable
                  assets={unassignedAssets}
                  sort={sort}
                  onSortChange={setSort}
                  variant="full"
                  onEdit={(asset) => setFormState({ asset })}
                  onDelete={(asset) => setPendingDelete(asset)}
                />
              </section>
            ) : null}

            <section className="card">
              <div className="card__header">
                <div>
                  <h2 className="card__title">Asset register</h2>
                  <p className="card__subtitle">
                    Every device we own, with its user, location and purchase details.
                  </p>
                </div>
              </div>

              <AssetToolbar
                filters={filters}
                onChange={setFilters}
                departments={departments}
                onAddAsset={() => setFormState({})}
                resultCount={visibleAssets.length}
                totalCount={sourceAssets.length}
              />

              <AssetTable
                assets={assignedAssets}
                sort={sort}
                onSortChange={setSort}
                variant="full"
                onEdit={(asset) => setFormState({ asset })}
                onDelete={(asset) => setPendingDelete(asset)}
              />
            </section>
          </>
        )}

      </main>

      <footer className="app-footer">
        <span>
          Cleaning cycle defaults to 6 months. Status: Overdue (past due) · Due Soon (within 30 days) · OK (more than 30 days).
        </span>
      </footer>

      {/* Suggestions for the department and user fields in the asset form. */}
      <datalist id="department-options">
        {departments.map((department) => <option key={department} value={department} />)}
      </datalist>

      <datalist id="user-options">
        {users.map((user) => <option key={user} value={user} />)}
      </datalist>

      {formState ? (
        <AssetFormModal
          asset={formState.asset}
          prefill={formState.prefill}
          assetRefExists={assetRefExists}
          onClose={() => setFormState(null)}
          onSubmit={(values) =>
            formState.asset ? handleUpdate(formState.asset, values) : handleCreate(values)
          }
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
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
