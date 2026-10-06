import { useEffect, useId, useRef } from 'react';
import CloseIcon from './CloseIcon';

// Open dialogs, innermost last. Escape and Tab belong to the innermost one,
// so a confirmation over a form closes on its own without taking the form
// with it.
const openDialogs = [];

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * A dialog over the page. Keyboard focus moves into it, stays inside it
 * (Tab wraps round), and goes back to whatever opened it on close.
 *
 * `confirmDiscard`: when true, closing (Escape, the backdrop or ×) asks
 * before throwing away what has been typed.
 */
export default function Modal({ title, description, onClose, children, size = 'md', confirmDiscard = false }) {
  const dialogRef = useRef(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  // The latest props, so the effect below runs once per dialog rather than
  // on every render - re-running it stole focus from the box being typed in.
  const latest = useRef({ onClose, confirmDiscard });
  latest.current = { onClose, confirmDiscard };

  const requestClose = () => {
    const { onClose: close, confirmDiscard: ask } = latest.current;
    if (ask && !window.confirm('Discard your changes? What you have typed will be lost.')) return;
    close();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    const opener = document.activeElement;
    openDialogs.push(id);
    document.body.classList.add('no-scroll');

    const dialog = dialogRef.current;
    // Start where the form says (autoFocus), else on the dialog itself.
    if (!dialog?.contains(document.activeElement)) dialog?.focus();

    const onKeyDown = (event) => {
      if (openDialogs[openDialogs.length - 1] !== id) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const all = [...dialog.querySelectorAll(FOCUSABLE)];
      // Only what is on screen; if nothing reports a size (some test
      // browsers), all of it.
      const shown = all.filter((el) => el.getClientRects().length > 0);
      const items = shown.length > 0 ? shown : all;
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openDialogs.indexOf(id);
      if (index !== -1) openDialogs.splice(index, 1);
      if (openDialogs.length === 0) document.body.classList.remove('no-scroll');
      // Back to where the person was, if it is still on the page.
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [id]);

  // Close only when a click both starts and ends on the backdrop itself.
  // Using mousedown alone closed the dialog when the user grabbed a scrollbar
  // or dragged a selection out of the form.
  const pressStartedOnBackdrop = useRef(false);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressStartedOnBackdrop.current && event.target === event.currentTarget) requestClose();
        pressStartedOnBackdrop.current = false;
      }}
    >
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title" id={titleId}>{title}</h2>
            {description ? <p className="modal__description" id={descriptionId}>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={requestClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
