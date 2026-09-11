import { useState } from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (caught) {
      setError(caught.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={busy ? () => {} : onCancel} size="sm">
      <div className="modal__body">
        <p className="confirm-message">{message}</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
      <footer className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === 'danger' ? 'btn btn--danger' : 'btn btn--primary'}
          onClick={handleConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </footer>
    </Modal>
  );
}
