-- =====================================================================
-- 5 test devices covering the full asset register.
--
-- Run in the Supabase SQL Editor, AFTER schema.sql and
-- migration-001-asset-management.sql.
--
-- Deliberately varied, so every part of the app has something to show:
--
--   Status     one of each - Overdue, Due Soon, OK, Never Cleaned,
--              and Not Tracked (a monitor, which is inventory-only)
--   Types      Laptop, Desktop and Monitor
--   Cycles     the 6-month default plus a 3-month and a 12-month override
--   Locations  Office, Warehouse, Remote - and one left blank
--   Costs      three priced, one with no cost or purchase date recorded
--   Notes      present on some rows, absent on others
--
-- Cleaning dates are relative to today, so the statuses stay correct
-- whenever you run this. Purchase dates are fixed historical dates.
--
-- Re-runnable: rows with an existing Asset Ref are skipped.
-- To remove all of it later:
--   delete from public.assets where asset_ref like 'TEST-%';
-- =====================================================================

insert into public.assets
  (asset_ref, device_type, owner_name, department, location,
   purchase_cost, purchase_date, date_cleaned, cleaned_by,
   cleaning_interval_months, notes)
values
  -- OVERDUE - cleaned ~10 months ago on the standard 6-month cycle.
  ('TEST-LAP-101', 'Laptop',  'Hannah Price',   'Finance',    'Office',
   1249.00, date '2023-11-14', (current_date - 300), 'AL',
   6,  'Fan noise reported before the last clean.'),

  -- DUE SOON - short 3-month cycle, next clean falls inside 30 days.
  ('TEST-DSK-102', 'Desktop', 'Workshop Bench', 'Facilities', 'Warehouse',
   899.50,  date '2024-02-29', (current_date - 75),  'RC',
   3,  null),

  -- OK - cleaned recently, and on a 12-month cycle.
  -- Also the row with no cost or purchase date recorded.
  ('TEST-LAP-103', 'Laptop',  'Priya Shah',     'Sales',      'Remote',
   null,    null,              (current_date - 25),  'JS',
   12, 'Field laptop, annual deep clean only.'),

  -- NEVER CLEANED - in service, but no cleaning record yet.
  ('TEST-DSK-104', 'Desktop', 'Reception PC',   'Facilities', 'Office',
   749.00,  date '2022-06-30', null,                 null,
   6,  'Inherited from the old asset register.'),

  -- NOT TRACKED - a monitor: counted as an asset, never in the cleaning
  -- rota. Location deliberately left blank to show how gaps display.
  ('TEST-MON-105', 'Monitor', 'Marcus Adeyemi', 'Operations', null,
   189.99,  date '2025-01-20', null,                 null,
   6,  null)

on conflict (upper(btrim(asset_ref))) do nothing;

-- What the dashboard should show for these five:
--   select status, count(*) from public.assets_with_status
--   where asset_ref like 'TEST-%' group by status order by 1;
