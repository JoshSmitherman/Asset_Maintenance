import { useEffect, useState } from 'react';
import RepairForm from './RepairForm';
import AttachmentList from './AttachmentList';
import { formatCurrency } from '../lib/constants';
import { formatDate } from '../lib/dates';
import { displayNameFromEmail } from '../lib/accountName';
import { repairSummary } from '../lib/repairs';

/**
 * The asset's Repairs tab: every in-house fix, newest first, with its parts,
 * cost and any receipts or photos. Logging or editing a repair swaps the list
 * for the form, in place.
 */
export default function AssetRepairs({ repairs, files, isAdmin, readOnly, onToast, onEditingChange }) {
  const [editing, setEditing] = useState(null); // null | 'new' | repair
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  // The details window hides its own buttons while the form is open, and
  // brings them back if the tab is left mid-edit.
  useEffect(() => {
    onEditingChange?.(Boolean(editing));
  }, [editing, onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);

  if (editing) {
    return (
      <RepairForm
        repair={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={async (values) => {
          await repairs.saveRepair(values, editing === 'new' ? null : editing);
          onToast?.({ tone: 'success', message: editing === 'new' ? 'Repair logged.' : 'Repair updated.' });
          setEditing(null);
        }}
      />
    );
  }

  if (repairs.error) {
    return <div className="alert alert--error" role="alert"><span>{repairs.error}</span></div>;
  }

  const { count, total } = repairSummary(repairs.repairs);

  const remove = async (repair) => {
    setBusy(true);
    try {
      await repairs.deleteRepair(repair);
      setConfirmDelete(null);
      onToast?.({ tone: 'success', message: 'Repair deleted.' });
    } catch (caught) {
      onToast?.({ tone: 'error', message: caught.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="repairs">
      <div className="repairs__head">
        <p className="repairs__summary">
          {repairs.loading && count === 0
            ? 'Loading repairs…'
            : count === 0
              ? 'No repairs recorded.'
              : `${count} repair${count === 1 ? '' : 's'} · ${formatCurrency(total)} spent on parts`}
        </p>
        {readOnly ? null : (
          <button type="button" className="btn btn--primary btn--small" onClick={() => setEditing('new')}>
            + Log a repair
          </button>
        )}
      </div>

      <ol className="repairs__list">
        {repairs.repairs.map((repair) => (
          <li key={repair.id} className="repair">
            <div className="repair__head">
              <div>
                <p className="repair__fault">{repair.fault}</p>
                <p className="repair__meta">
                  {formatDate(repair.repaired_on)} · fixed by{' '}
                  {repair.fixed_by_email ? displayNameFromEmail(repair.fixed_by_email) : 'someone no longer on the team'}
                </p>
              </div>
              <strong className="repair__total">{formatCurrency(repair.total_cost) ?? '£0.00'}</strong>
            </div>

            {repair.parts?.length ? (
              <table className="repair__parts">
                <tbody>
                  {repair.parts.map((part, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={index}>
                      <td>{part.part}</td>
                      <td className="repair__part-cost">{formatCurrency(part.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="repair__no-parts">No parts replaced.</p>
            )}

            {repair.notes ? <p className="repair__notes">{repair.notes}</p> : null}

            <AttachmentList
              attachments={files.attachments.filter((file) => file.repair_id === repair.id)}
              onUpload={(file) => files.upload(file, { repairId: repair.id })}
              onRemove={files.remove}
              onOpen={files.linkFor}
              isAdmin={isAdmin}
              readOnly={readOnly}
              uploadLabel="Attach a receipt or photo"
              emptyMessage="No receipts or photos."
            />

            {readOnly ? null : (
              <div className="repair__actions">
                <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(repair)}>
                  Edit
                </button>
                {isAdmin ? (
                  confirmDelete === repair.id ? (
                    <>
                      <span className="repair__confirm-text">Delete this repair and its files?</span>
                      <button
                        type="button"
                        className="btn btn--danger-ghost btn--small"
                        onClick={() => remove(repair)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => setConfirmDelete(null)}
                        disabled={busy}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--small"
                      onClick={() => setConfirmDelete(repair.id)}
                    >
                      Delete
                    </button>
                  )
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
