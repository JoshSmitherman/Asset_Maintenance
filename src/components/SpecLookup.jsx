import { useState } from 'react';
import { callFunction } from '../lib/edgeFunctions';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * "Look up specs online": sends the device name to the spec-lookup Edge
 * Function, which searches the web, and hands the result to the form. The
 * form fills only empty boxes, and everything stays editable.
 */
export default function SpecLookup({ deviceType, initialQuery, onFound, disabled }) {
  const [query, setQuery] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { tone, text }

  const lookUp = async () => {
    if (query.trim().length < 3) {
      setMessage({ tone: 'error', text: 'Enter the make and model, e.g. "Dell Latitude 5540".' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await callFunction('spec-lookup', { query: query.trim(), device_type: deviceType });
      if (!result?.found) {
        setMessage({ tone: 'error', text: 'Could not identify that device. Try the exact model name from its label.' });
        return;
      }
      const { filled, kept } = onFound(result.specs ?? {});
      const source = hostOf(result.source_url);
      const parts = [
        filled.length
          ? `Filled ${filled.length} field${filled.length === 1 ? '' : 's'} for ${result.matched_device}${source ? ` from ${source}` : ''}.`
          : `Found ${result.matched_device}, but there was nothing new to fill in.`,
        kept.length ? `Kept ${kept.length} value${kept.length === 1 ? '' : 's'} you had already entered.` : null,
        result.note,
        filled.length ? 'Check them before saving.' : null
      ];
      setMessage({ tone: 'ok', text: parts.filter(Boolean).join(' ') });
    } catch (caught) {
      setMessage({ tone: 'error', text: caught.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="spec-lookup field--full">
      <label className="field__label" htmlFor="spec_lookup_query">Look up specs online</label>
      <div className="spec-lookup__row">
        <input
          id="spec_lookup_query"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Enter here means "look it up", not "save the asset".
            if (event.key === 'Enter') {
              event.preventDefault();
              lookUp();
            }
          }}
          placeholder="Make and model, e.g. Dell Latitude 5540"
          disabled={disabled || busy}
        />
        <button type="button" className="btn btn--brand-light" onClick={lookUp} disabled={disabled || busy}>
          {busy ? 'Searching…' : 'Look up'}
        </button>
      </div>
      {message ? (
        <p className={message.tone === 'error' ? 'field__error' : 'spec-lookup__result'} role="status">
          {message.text}
        </p>
      ) : (
        <span className="field__hint">Searches the web and fills in the empty boxes below. You can edit anything it finds.</span>
      )}
    </div>
  );
}
