import { useEffect } from 'react';
import CloseIcon from './CloseIcon';

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onDismiss, toast.tone === 'error' ? 8000 : 4000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.tone ?? 'success'}`} role="status" aria-live="polite">
      <span>{toast.message}</span>
      <button type="button" className="icon-button icon-button--light" onClick={onDismiss} aria-label="Dismiss">
        <CloseIcon />
      </button>
    </div>
  );
}
