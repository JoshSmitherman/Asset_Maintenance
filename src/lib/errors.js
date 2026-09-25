/** Turn Postgres/PostgREST errors into something an IT technician can act on. */
export function describeDatabaseError(error, context = {}) {
  if (!error) return 'Something went wrong. Please try again.';

  const code = error.code;
  const message = error.message || '';

  if (code === '23505' || message.includes('assets_asset_ref_unique_idx')) {
    return `Asset Ref "${context.assetRef ?? ''}" already exists. Asset References must be unique.`;
  }
  if (message.includes('assets_clean_record_complete')) {
    return 'Enter both Date Cleaned and Cleaned By, or leave both blank.';
  }
  if (message.includes('assets_device_type_valid')) {
    return 'Device Type must be Laptop or Desktop.';
  }
  if (message.includes('assets_cleaned_by_valid')) {
    return 'Cleaned By must be one of the configured initials.';
  }
  if (message.includes('assets_interval_range')) {
    return 'Cleaning interval must be between 1 and 60 months.';
  }
  if (message.includes('Date Cleaned cannot be in the future')) {
    return 'Date Cleaned cannot be in the future.';
  }
  // PostgREST cannot see the table at all. Either the database was never set
  // up, or its schema cache is stale - both are setup problems, and the raw
  // wording ("in the schema cache") sends people looking in the wrong place.
  if (code === 'PGRST205' || code === '42P01' || message.includes('schema cache')) {
    return (
      'The database tables are missing. Run supabase/setup.sql in the Supabase ' +
      'SQL Editor, then reload this page. If you have already run it, the schema ' +
      "cache may be stale - run: notify pgrst, 'reload schema';"
    );
  }
  if (code === '42501' || message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to do that. Try signing out and back in.';
  }
  if (code === 'PGRST301' || message.toLowerCase().includes('jwt')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Cannot reach the database. Check your connection and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}
