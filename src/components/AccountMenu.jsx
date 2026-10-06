import { useEffect, useId, useRef, useState } from 'react';
import { displayNameFromEmail, initialsFor } from '../lib/accountName';
import { accessLabel } from '../lib/access';

/**
 * Who is signed in, and the things only they do: change their password and
 * sign out. One badge with their initials in the header; everything else
 * waits in the menu it opens.
 */
export default function AccountMenu({
  email,
  fullName,
  department,
  access,
  isAdmin,
  hasPassword = true,
  onChangePassword,
  onSignOut,
  signingOut
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const name = fullName?.trim() || displayNameFromEmail(email);
  const initials = initialsFor(name);

  // Close on a click elsewhere or Escape, handing focus back to the badge.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Up and Down move between the menu's actions, as in any menu.
  const onMenuKeyDown = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
  };

  const choose = (action) => {
    setOpen(false);
    action();
  };

  return (
    <div className="account" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="account__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${name}`}
        title={email}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account__avatar" aria-hidden="true">{initials}</span>
        <span className="account__caret" aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div
          className="account__menu"
          id={menuId}
          role="menu"
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
          onBlur={(event) => {
            // Tabbing out of the menu closes it, as clicking elsewhere does.
            if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
          }}
        >
          <div className="account__who">
            <span className="account__avatar account__avatar--large" aria-hidden="true">{initials}</span>
            <div className="account__identity">
              <span className="account__name">{name}</span>
              <span className="account__email">{email}</span>
              <span className={`account__role${isAdmin ? ' account__role--admin' : ''}`}>
                {[department, accessLabel(access)].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
          {/* Microsoft sign-in has no Orbit password to change. */}
          {hasPassword ? (
            <>
              <div className="account__divider" role="separator" />
              <button type="button" role="menuitem" className="account__item" onClick={() => choose(onChangePassword)}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="account__icon">
                  <circle cx="8" cy="15" r="4" />
                  <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
                </svg>
                Change password
              </button>
            </>
          ) : null}
          <div className="account__divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="account__item account__item--danger"
            onClick={() => choose(onSignOut)}
            disabled={signingOut}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="account__icon">
              <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />
            </svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
