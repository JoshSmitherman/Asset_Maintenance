import { useMemo, useState } from 'react';
import Header from './Header';
import AppNav from './AppNav';
import StatsGrid from './StatsGrid';
import Dashboard from './Dashboard';
import AttentionPanel from './AttentionPanel';
import AssetToolbar from './AssetToolbar';
import AssetTable from './AssetTable';
import AssetFormModal from './AssetFormModal';
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
  uniqueDepartments,
  uniqueUsers
} from '../lib/assetQueries';
import { ATTENTION_STATUSES, isCleaningTracked } from '../lib/constants';
import { todayIso } from '../lib/dates';

export default function AppShell() {
  const {
    assets,
    loading,
    refreshing,
    error,
    lastSyncedAt,
    refresh,
    createAsset,
    updateAsset,
    deleteAsset,
    assetRefExists
  } = useAssets();

  const [page, setPage] = useState('dashboard');
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState({ ...DEFAULT_SORT });
  const [formState, setFormState] = useState(null); // { asset?, prefill? }
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

  const visibleAssets = useMemo(
    () => sortAssets(filterAssets(sourceAssets, filters), sort),
    [sourceAssets, filters, sort]
  );

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
        <Header onRefresh={refresh} refreshing={refreshing} lastSyncedAt={lastSyncedAt} />
        <AppNav page={page} onChange={setPage} counts={{ cleaning: attentionCount }} />
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
                setPage(status === 'all' ? 'assets' : 'cleaning');
              }}
              totalValue={totalValue}
            />

            <Dashboard assets={assets} />

            <AttentionPanel
              assets={cleaningAssets}
              onRecordClean={(asset) =>
                setFormState({ asset, prefill: { date_cleaned: todayIso() } })
              }
            />
          </>
        ) : (
          <>
            {page === 'cleaning' ? (
              <AttentionPanel
                assets={cleaningAssets}
                onRecordClean={(asset) =>
                  setFormState({ asset, prefill: { date_cleaned: todayIso() } })
                }
              />
            ) : null}

            <section className="card">
              <div className="card__header">
                <div>
                  <h2 className="card__title">
                    {page === 'cleaning' ? 'Cleaning register' : 'All assets'}
                  </h2>
                  <p className="card__subtitle">
                    {page === 'cleaning'
                      ? 'Laptops and desktops only, showing the fields that matter for a cleaning round.'
                      : 'The full inventory, including location and purchase details.'}
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
                assets={visibleAssets}
                sort={sort}
                onSortChange={setSort}
                variant={page === 'cleaning' ? 'cleaning' : 'full'}
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

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete asset"
          message={`Delete ${pendingDelete.asset_ref} (${pendingDelete.owner_name})? This removes it for everyone and cannot be undone.`}
          confirmLabel="Delete asset"
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
