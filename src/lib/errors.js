// Turns Postgres, PostgREST and network errors into something the person
// using the app can act on. Raw database wording never reaches the screen
// unless it was written for people (the triggers' own messages are).

const NETWORK = /failed to fetch|networkerror|network request failed|load failed|fetch failed|connection (terminated|refused|reset)|timeout|timed out|503|502|504/i;

/** Duplicate-key errors, by the unique index or constraint that fired. */
function describeDuplicate(message, context) {
  if (message.includes('asset_ref') || (!message && (context.assetRef || context.batch))) {
    const ref = context.assetRef ? `"${context.assetRef}" ` : '';
    return context.batch
      ? `One of those Asset Refs is already on the register (or used twice in this batch). Asset Refs must be unique - check them and try again.`
      : `Asset Ref ${ref}is already on the register. Asset Refs must be unique.`;
  }
  if (message.includes('members') || message.includes('email')) {
    return 'That person already has access.';
  }
  return 'That would create a duplicate of something that already exists.';
}

export function describeDatabaseError(error, context = {}) {
  if (!error) return 'Something went wrong. Please try again.';

  const code = error.code;
  const message = String(error.message || '');
  const lower = message.toLowerCase();

  if (code === '23505' || message.includes('_unique')) return describeDuplicate(message, context);
  if (message.includes('assets_clean_record_complete')) {
    return 'Enter both Date Cleaned and Cleaned By, or leave both blank.';
  }
  if (message.includes('assets_device_type_valid')) {
    return 'Choose a Device Type from the list.';
  }
  if (message.includes('assets_cleaned_by_valid')) {
    return 'Choose who cleaned it from the list.';
  }
  if (message.includes('assets_interval_range')) {
    return 'Cleaning interval must be between 1 and 60 months.';
  }
  if (code === '22003' || lower.includes('numeric field overflow') || lower.includes('out of range')) {
    return 'One of the numbers is too large. Check the cost.';
  }
  if (code === '22007' || code === '22008' || lower.includes('invalid input syntax for type date')) {
    return 'One of the dates is not a real date. Check it and try again.';
  }
  if (code === '22001' || lower.includes('value too long')) {
    return 'One of the boxes has too much text in it. Shorten it and try again.';
  }
  // The database's own refusals (raised by its triggers) are written for
  // people: let them through. Constraint failures say "violates ..." and are
  // translated above or below instead.
  if ((code === 'P0001' || code === '23514' || !code) && message && !lower.includes('violates') && /^[A-Z]/.test(message) && message.endsWith('.')) {
    // "(2026-10-07)" on the end is for the logs; people know what they typed.
    if (!NETWORK.test(message)) return message.replace(/ \(\d{4}-\d{2}-\d{2}\)\.$/, '.');
  }
  // PostgREST cannot see the table at all. Either the database was never set
  // up, or its schema cache is stale - both are setup problems, and the raw
  // wording ("in the schema cache") sends people looking in the wrong place.
  if (code === 'PGRST205' || code === '42P01' || code === '42883' || lower.includes('schema cache')) {
    return (
      'The database needs updating. An admin should run supabase/setup.sql in the ' +
      'Supabase SQL Editor, then reload this page.'
    );
  }
  if (message.includes('assets_retirement_complete')) {
    return 'Choose why the asset is being retired.';
  }
  if (message.includes('attachments_file_valid')) {
    return 'That file cannot be attached. Use a photo or a PDF of 10 MB or less.';
  }
  if (code === '23503') {
    return 'Something this refers to no longer exists - it may have just been deleted. Reload and try again.';
  }
  if (code === '23514') {
    return 'Some of the details are not allowed. Check the highlighted boxes and try again.';
  }
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'You do not have permission to do that. If you think you should, ask an admin.';
  }
  if (code === 'PGRST301' || code === 'PGRST303' || lower.includes('jwt')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (NETWORK.test(message) || error.name === 'TypeError') {
    return 'Cannot reach the database. Check your internet connection and try again.';
  }
  if (code && /^(08|53|57|58|XX)/.test(code)) {
    return 'The database is having trouble right now. Wait a moment and try again.';
  }
  return message && message.length < 160 && !/[_{}]/.test(message)
    ? message
    : 'Something went wrong. Please try again, and tell IT if it keeps happening.';
}
