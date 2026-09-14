import { useState } from 'react';
import Modal from './Modal';
import ComboSelect from './ComboSelect';

/**
 * Hands a batch of assets to one person - the reverse of bulk unassign, and
 * what you need when someone leaves and their kit moves on.
 */
export default function AssignUserModal({ count, users, onSubmit, onClose }) {
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!owner.trim()) {
      setError('Choose who these are going to.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(owner.trim());
    } catch (caught) {
      setError(caught.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Assign ${count} asset${count === 1 ? '' : 's'}`}
      description="Every selected asset is recorded against this person. Nothing else changes."
      size="sm"
      onClose={busy ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal__body">
          <div className="field">
            <label className="field__label" htmlFor="bulk-owner">User</label>
            <ComboSelect
              id="bulk-owner"
              value={owner}
              options={users}
              onChange={(next) => {
                setOwner(next);
                setError(null);
              }}
              placeholder="Person, or a shared location"
              blankLabel="— Choose a user —"
              addLabel="+ Add someone new…"
              invalid={Boolean(error)}
              disabled={busy}
            />
            {error ? <span className="field__error">{error}</span> : null}
          </div>
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Assigning…' : `Assign ${count}`}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
