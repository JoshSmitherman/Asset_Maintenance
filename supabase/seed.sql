-- =====================================================================
-- Sample data for testing. Run AFTER schema.sql, in the Supabase SQL Editor.
-- Dates are relative to today, so the seed always produces a realistic mix of
-- Overdue / Due Soon / OK / Never Cleaned rows whenever you run it.
--
-- Re-runnable: rows with an existing Asset Ref are skipped.
-- To remove the sample data later:  delete from public.assets where asset_ref like 'SEED-%';
-- =====================================================================

insert into public.assets
  (asset_ref, device_type, owner_name, department, date_cleaned, cleaned_by, cleaning_interval_months, notes)
values
  -- ---- Overdue (cleaned well over 6 months ago) ----
  ('SEED-LAP-001', 'Laptop',  'Hannah Price',    'Finance',    (current_date - 320), 'AL', 6, 'Fan noise reported before last clean.'),
  ('SEED-DSK-002', 'Desktop', 'Ravi Patel',      'Operations', (current_date - 265), 'BB', 6, null),
  ('SEED-LAP-003', 'Laptop',  'Owen Whitfield',  'Sales',      (current_date - 210), 'JS', 6, 'Field laptop - heavy dust exposure.'),
  ('SEED-DSK-004', 'Desktop', 'Workshop Bench 1','Facilities', (current_date - 130), 'RC', 3, 'Short 3-month cycle: workshop environment.'),

  -- ---- Due Soon (next clean falls inside the next 30 days) ----
  ('SEED-LAP-005', 'Laptop',  'Grace Nolan',     'HR',         (current_date - 170), 'TM', 6, null),
  ('SEED-DSK-006', 'Desktop', 'Marcus Adeyemi',  'Finance',    (current_date - 160), 'AL', 6, 'Second monitor cable replaced at last visit.'),
  ('SEED-LAP-007', 'Laptop',  'Priya Shah',      'IT',         (current_date - 100), 'BB', 4, 'Loan laptop, 4-month cycle.'),

  -- ---- OK (more than 30 days remaining) ----
  ('SEED-LAP-008', 'Laptop',  'Tom Fletcher',    'Sales',      (current_date -  20), 'JS', 6, null),
  ('SEED-DSK-009', 'Desktop', 'Reception PC',    'Facilities', (current_date -  45), 'RC', 6, 'Keyboard deep-cleaned.'),
  ('SEED-LAP-010', 'Laptop',  'Sofia Marino',    'Marketing',  (current_date -   5), 'TM', 6, null),
  ('SEED-DSK-011', 'Desktop', 'Build Server Ops','IT',         (current_date -  60), 'AL', 12, 'Server room unit, annual cycle.'),

  -- ---- Never cleaned (no Date Cleaned recorded) ----
  ('SEED-LAP-012', 'Laptop',  'New Starter - Legal', 'Legal',  null, null, 6, 'Issued last week, not yet in the cleaning rota.'),
  ('SEED-DSK-013', 'Desktop', 'Meeting Room 2',  'Facilities', null, null, 6, null),
  ('SEED-LAP-014', 'Laptop',  'Chloe Bennett',   'Marketing',  null, null, 6, 'Transferred from the old asset register.')
on conflict (upper(btrim(asset_ref))) do nothing;

-- Quick sanity check of what the app will display:
-- select status, count(*) from public.assets_with_status group by status order by 1;
