import { supabase } from './supabaseClient';

/**
 * Calls one of this project's Supabase Edge Functions (supabase/functions)
 * and returns its JSON, or throws an Error whose message a person can act on.
 *
 * The functions are deployed separately from the website, so "not deployed
 * yet" is an expected state and gets its own message rather than a stack of
 * network jargon.
 */
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data;

  const response = error.context;
  if (response && typeof response.status === 'number') {
    if (response.status === 404) throw new Error(notDeployed(name));
    let message = null;
    try {
      message = (await response.clone().json())?.error ?? null;
    } catch {
      // Not JSON: fall through to the generic message.
    }
    if (message) throw new Error(message);
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    throw new Error(`The ${name} function failed (HTTP ${response.status}).`);
  }

  // No response at all: usually the function does not exist, which some
  // browsers report as a CORS or network failure.
  throw new Error(notDeployed(name));
}

function notDeployed(name) {
  return (
    `The "${name}" function could not be reached. It may not be deployed yet - ` +
    'see "Edge Functions" in the README.'
  );
}
