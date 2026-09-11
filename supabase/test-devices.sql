-- =====================================================================
-- 5 test devices. Run AFTER schema.sql, in the Supabase SQL Editor.
--
-- Dates are relative to today, so this always produces the same spread of
-- statuses whenever you run it:
--   2 x Overdue, 1 x Due Soon, 1 x OK, 1 x Never Cleaned
--
-- Re-runnable: rows with an existing Asset Ref are skipped.
-- To remove these later:  delete from public.assets where asset_ref like 'TEST-%';
-- =====================================================================

insert into public.assets
  (asset_ref, device_type, owner_name, department, date_cleaned, cleaned_by, cleaning_interval_months, notes)
values
  -- Overdue: cleaned ~10 months ago on the standard 6-month cycle.
  ('TEST-LAP-001', 'Laptop',  'Hannah Price',     'Finance',    (current_date - 300), 'AL',  6, 'Fan noise reported before the last clean.'),

  -- Due Soon: next clean falls inside the next 30 days.
  ('TEST-DSK-002', 'Desktop', 'Ravi Patel',       'Operations', (current_date - 165), 'BB',  6, null),

  -- OK: cleaned recently, plenty of time remaining.
  ('TEST-LAP-003', 'Laptop',  'Tom Fletcher',     'Sales',      (current_date -  30), 'JS',  6, 'Keyboard and vents done.'),

  -- Never Cleaned: no cleaning record at all (date and cleaner both blank).
  ('TEST-DSK-004', 'Desktop', 'Meeting Room 2',   'Facilities', null,                 null,  6, 'New unit, not yet in the cleaning rota.'),

  -- Overdue via a custom short cycle: 3 months, not the 6-month default.
  ('TEST-DSK-005', 'Desktop', 'Workshop Bench 1', 'IT',         (current_date - 100), 'RC',  3, 'Dusty workshop environment, 3-month cycle.')

on conflict (upper(btrim(asset_ref))) do nothing;

-- Check what the app will display:
-- select status, count(*) from public.assets_with_status group by status order by 1;
