import { useEffect, useRef } from 'react';

export default function Modal({ title, description, onClose, children, size = 'md' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('no-scroll');
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            {description ? <p className="modal__description">{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
