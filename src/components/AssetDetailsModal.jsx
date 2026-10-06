import { useState } from 'react';
import Modal from './Modal';
import TabStrip from './TabStrip';
import StatusBadge from './StatusBadge';
import AssetHistory from './AssetHistory';
import AssetRepairs from './AssetRepairs';
import AssetFiles from './AssetFiles';
import { useAssetHistory } from '../hooks/useAssetHistory';
import { useRepairs } from '../hooks/useRepairs';
import { useAttachments } from '../hooks/useAttachments';
import { formatCurrency, isCleaningTracked } from '../lib/constants';
import { describeDayOffset, formatDate, formatTimestamp } from '../lib/dates';
import { SPEC_FIELDS, hasSpecs, specsFor } from '../lib/specs';
import { assetLink } from '../lib/assetLinks';
import { isRetired } from '../lib/assetStatus';
import { displayNameFromEmail } from '../lib/accountName';

function Row({ label, children }) {
  return (
    <div className="detail">
      <dt className="detail__label">{label}</dt>
      <dd className="detail__value">{children}</dd>
    </div>
  );
}

const EMPTY = <span className="cell-muted">—</span>;

/** This asset's own address, to write onto an NFC tag or turn into a QR code. */
function TagLink({ assetRef }) {
  const link = assetLink(assetRef);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard (an older browser, or not allowed): select the text so
      // it can be copied by hand.
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('tag-link-text'));
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  };

  return (
    <div className="tag-link">
      <code id="tag-link-text" className="tag-link__url">{link}</code>
      <button type="button" className="btn btn--ghost btn--small" onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <span className="field__hint tag-link__hint">
        Write this onto an NFC tag (or a QR code) on the device: tapping it opens these details.
      </span>
    </div>
  );
}

/**
 * Read-only view of one asset, reached from the register's eye button. Editing
 * and deleting are launched from here rather than crowding every table row
 * with buttons.
 */
/** What was recorded when the kit was retired, above everything else. */
function RetiredBanner({ asset }) {
  return (
    <div className="retired-banner" role="note">
      <strong className="retired-banner__title">
        Retired {formatDate(asset.retired_on)} — {asset.retired_reason}
      </strong>
      {asset.retired_notes ? <p className="retired-banner__note">{asset.retired_notes}</p> : null}
      <p className="retired-banner__meta">
        {asset.data_wiped
          ? `Data wiped by ${asset.data_wiped_by_email ? displayNameFromEmail(asset.data_wiped_by_email) : 'someone no longer on the team'}.`
          : 'No data wipe recorded.'}
        {asset.retired_by_email ? ` Retired by ${displayNameFromEmail(asset.retired_by_email)}.` : ''}
      </p>
    </div>
  );
}

export default function AssetDetailsModal({
  asset,
  isAdmin = false,
  canEdit = true,
  onEdit,
  onDelete,
  onRecordClean,
  onRetire,
  onRestore,
  onToast,
  onClose
}) {
  const retired = isRetired(asset);
  // Retired kit is out of the cleaning rota, so there is nothing to record.
  const tracked = isCleaningTracked(asset.device_type) && !retired;
  const specKeys = specsFor(asset.device_type);
  const [tab, setTab] = useState('details');
  const [writingRepair, setWritingRepair] = useState(false);

  // Only computers and monitors have a specification; every asset has a
  // history.
  const showSpecs = hasSpecs(asset.device_type);
  const activeTab = !showSpecs && tab === 'specs' ? 'details' : tab;
  const history = useAssetHistory(asset.id, { enabled: activeTab === 'history' });
  // Repairs and files are read together: each repair shows its own files,
  // and the Files tab says which repair a file came from.
  const repairsOrFiles = activeTab === 'repairs' || activeTab === 'files';
  const repairs = useRepairs({ assetId: asset.id, enabled: repairsOrFiles });
  const files = useAttachments({ assetId: asset.id, enabled: repairsOrFiles });

  return (
    <Modal
      title={asset.asset_ref}
      description={`${asset.device_type}${asset.owner_name ? ` · ${asset.owner_name}` : ' · Unassigned'}`}
      onClose={onClose}
      // A repair half-written in the Repairs tab is not lost to a stray Escape.
      confirmDiscard={writingRepair}
    >
      <TabStrip
        tabs={[
          { id: 'details', label: 'Details' },
          ...(showSpecs ? [{ id: 'specs', label: 'Specification' }] : []),
          { id: 'repairs', label: 'Repairs' },
          { id: 'files', label: 'Files' },
          { id: 'history', label: 'History' }
        ]}
        active={activeTab}
        onChange={setTab}
      />

      <div
        className="modal__body"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'history' ? (
          <AssetHistory asset={asset} {...history} />
        ) : activeTab === 'repairs' ? (
          // Retired kit is out of use: its repairs and files are kept to read.
          <AssetRepairs
            repairs={repairs}
            files={files}
            isAdmin={isAdmin}
            readOnly={retired || !canEdit}
            onToast={onToast}
            onEditingChange={setWritingRepair}
          />
        ) : activeTab === 'files' ? (
          <AssetFiles files={files} repairs={repairs.repairs} isAdmin={isAdmin} readOnly={retired || !canEdit} />
        ) : activeTab === 'specs' ? (
          <dl className="detail-list">
            {specKeys.map((key) => (
              <Row key={key} label={SPEC_FIELDS[key].label}>
                {asset[key] === null || asset[key] === undefined || asset[key] === ''
                  ? EMPTY
                  : String(asset[key])}
              </Row>
            ))}
          </dl>
        ) : (
          <>
          {retired ? <RetiredBanner asset={asset} /> : null}
          <dl className="detail-list">
            <Row label="Asset Ref">{asset.asset_ref}</Row>
            <Row label="Device type">{asset.device_type}</Row>
            <Row label="User">
              {asset.owner_name ?? <span className="cell-unassigned">Unassigned</span>}
            </Row>
            <Row label="Department">{asset.department}</Row>
            <Row label="Location">{asset.location ?? EMPTY}</Row>
            <Row label="Serial number">{asset.serial_number ?? EMPTY}</Row>
            <Row label="Purchase date">
              {asset.purchase_date ? formatDate(asset.purchase_date) : EMPTY}
            </Row>
            <Row label="Purchase cost">{formatCurrency(asset.purchase_cost) ?? EMPTY}</Row>

            <Row label="Status">
              <StatusBadge status={asset.status} />
            </Row>

            {tracked ? (
              <>
                <Row label="Date cleaned">
                  {asset.date_cleaned ? (
                    formatDate(asset.date_cleaned)
                  ) : (
                    <span className="cell-flag">Never cleaned</span>
                  )}
                </Row>
                <Row label="Cleaned by">{asset.cleaned_by ?? EMPTY}</Row>
                <Row label="Cleaning interval">{asset.cleaning_interval_months} months</Row>
                <Row label="Next clean due">
                  {asset.next_clean_due ? (
                    <>
                      {formatDate(asset.next_clean_due)}{' '}
                      <span className="cell-muted">({describeDayOffset(asset.daysUntilDue)})</span>
                    </>
                  ) : (
                    EMPTY
                  )}
                </Row>
              </>
            ) : (
              <Row label="Cleaning">
                <span className="cell-muted">
                  {retired
                    ? 'Not tracked — retired kit has left the cleaning rota.'
                    : 'Not tracked — only laptops and desktops are in the cleaning rota.'}
                </span>
              </Row>
            )}

            <Row label="Notes">{asset.notes ?? EMPTY}</Row>
            <Row label="Tag link"><TagLink assetRef={asset.asset_ref} /></Row>
            <Row label="Last updated">
              <span className="cell-block">{formatTimestamp(asset.updated_at)}</span>
              <span className="cell-muted cell-block">{asset.updated_by_email || 'unknown user'}</span>
            </Row>
          </dl>
          </>
        )}
      </div>

      {/* No Close button: the header's x does that, and repeating it here only
          crowded the two actions that actually change something. */}
      {writingRepair ? null : (
      <footer className="modal__footer modal__footer--split">
        {/* Deleting cannot be undone, so it is for admins; everyone else
            retires kit, which keeps the record and can be reversed. */}
        {isAdmin && onDelete ? (
          <button type="button" className="btn btn--danger-ghost" onClick={() => onDelete(asset)}>
            Delete asset
          </button>
        ) : (
          <span />
        )}
        <div className="modal__footer-group">
          {retired ? (
            isAdmin && onRestore ? (
              <button type="button" className="btn btn--ghost" onClick={() => onRestore(asset)}>
                Restore
              </button>
            ) : null
          ) : onRetire ? (
            <button type="button" className="btn btn--ghost" onClick={() => onRetire(asset)}>
              Retire
            </button>
          ) : null}
          {tracked && onRecordClean ? (
            <button type="button" className="btn btn--brand-light" onClick={() => onRecordClean(asset)}>
              Record clean
            </button>
          ) : null}
          {onEdit ? (
            <button type="button" className="btn btn--primary" onClick={() => onEdit(asset)}>
              Edit details
            </button>
          ) : null}
        </div>
      </footer>
      )}
    </Modal>
  );
}
