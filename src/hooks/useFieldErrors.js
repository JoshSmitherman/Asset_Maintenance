import { useEffect, useRef } from 'react';

/**
 * Makes a form's error messages reach screen readers: each box with an
 * error is marked invalid and pointed at its message (the `.field__error`
 * beside it). Errors are keyed by the box's id, as every form here does.
 * When a submit fails, focus moves to the first box with a problem, so
 * nobody is left looking for what went wrong.
 */
export function useFieldErrors(formRef, errors, { focusOnChange = true, ids = null } = {}) {
  // Only a new problem moves focus - not one being cleared as someone types.
  const previous = useRef(new Set());
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    for (const element of form.querySelectorAll('[aria-invalid="true"][data-error-linked]')) {
      element.removeAttribute('aria-invalid');
      element.removeAttribute('data-error-linked');
      const describedBy = (element.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter((id) => id && !id.endsWith('-error-msg'))
        .join(' ');
      if (describedBy) element.setAttribute('aria-describedby', describedBy);
      else element.removeAttribute('aria-describedby');
    }

    let first = null;
    const current = new Set(Object.keys(errors ?? {}).filter((key) => errors[key]));
    const added = [...current].some((key) => !previous.current.has(key));
    previous.current = current;
    for (const [key, message] of Object.entries(errors ?? {})) {
      if (!message) continue;
      const element = form.querySelector(`#${CSS.escape(ids?.[key] ?? key)}`);
      if (!element) continue;
      first ??= element;
      element.setAttribute('aria-invalid', 'true');
      element.setAttribute('data-error-linked', 'true');
      const note = element.closest('.field')?.querySelector('.field__error');
      if (note) {
        note.id = `${element.id}-error-msg`;
        const describedBy = new Set((element.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
        describedBy.add(note.id);
        element.setAttribute('aria-describedby', [...describedBy].join(' '));
      }
    }
    if (focusOnChange && added && first) first.focus();
  // ids is a fixed map per form; leaving it out of the list is deliberate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formRef, errors, focusOnChange]);
}
