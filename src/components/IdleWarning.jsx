import Modal from './Modal';
import { describeIdleLimit } from '../lib/idle';

/** "Still there?" - shown a couple of minutes before the idle sign-out. */
export default function IdleWarning({ secondsLeft, onStay, onSignOut }) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  return (
    <Modal title="Still there?" onClose={onStay} size="sm">
      <div className="modal__body">
        <p className="confirm-message">
          You have not done anything in Orbit for nearly {describeIdleLimit()}, so you will be signed
          out in{' '}
          <strong className="idle-countdown" aria-live="polite">
            {minutes}:{seconds}
          </strong>
          .
        </p>
        <p className="field__hint">Anything you have saved is safe. Unsaved changes in an open form would be lost.</p>
      </div>
      <footer className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onSignOut}>Sign out now</button>
        <button type="button" className="btn btn--primary" onClick={onStay} autoFocus>
          Stay signed in
        </button>
      </footer>
    </Modal>
  );
}
