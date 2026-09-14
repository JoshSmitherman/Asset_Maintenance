import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { formatCurrency, isCleaningTracked } from '../lib/constants';
import { describeDayOffset, formatDate, formatTimestamp } from '../lib/dates';

function Row({ label, children }) {
  return (
    <div className="detail">
      <dt className="detail__label">{label}</dt>
      <dd className="detail__value">{children}</dd>
    </div>
  );
}

const EMPTY = <span className="cell-muted">—</span>;

/**
 * Read-only view of one asset, reached from the register's eye button. Editing
 * and deleting are launched from here rather than crowding every table row
 * with buttons.
 */
export default function AssetDetailsModal({ asset, onEdit, onDelete, onClose }) {
  const tracked = isCleaningTracked(asset.device_type);

  return (
    <Modal
      title={asset.asset_ref}
      description={`${asset.device_type}${asset.owner_name ? ` · ${asset.owner_name}` : ' · Unassigned'}`}
      onClose={onClose}
    >
      <div className="modal__body">
        <dl className="detail-list">
          <Row label="Asset Ref">{asset.asset_ref}</Row>
          <Row label="Device type">{asset.device_type}</Row>
          <Row label="User">
            {asset.owner_name ?? <span className="cell-unassigned">Unassigned</span>}
          </Row>
          <Row label="Department">{asset.department}</Row>
          <Row label="Location">{asset.location ?? EMPTY}</Row>
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
                Not tracked — only laptops and desktops are in the cleaning rota.
              </span>
            </Row>
          )}

          <Row label="Notes">{asset.notes ?? EMPTY}</Row>
          <Row label="Last updated">
            <span className="cell-block">{formatTimestamp(asset.updated_at)}</span>
            <span className="cell-muted cell-block">{asset.updated_by_email || 'unknown user'}</span>
          </Row>
        </dl>
      </div>

      {/* No Close button: the header's x does that, and repeating it here only
          crowded the two actions that actually change something. */}
      <footer className="modal__footer modal__footer--split">
        <button type="button" className="btn btn--danger-ghost" onClick={() => onDelete(asset)}>
          Delete asset
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onEdit(asset)}>
          Edit details
        </button>
      </footer>
    </Modal>
  );
}
