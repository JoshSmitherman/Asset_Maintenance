-- =====================================================================
-- Migration 001: general asset management
--
-- Run this ONCE in the Supabase SQL Editor, AFTER schema.sql.
-- (schema.sql uses "create table if not exists", so re-running it does NOT
--  add these columns to an existing table - this file is how they arrive.)
--
-- Adds:  location, purchase_cost, purchase_date
-- Widens: device_type, beyond Laptop/Desktop
-- Changes: cleaning status is now derived from device type. Only Laptops and
--          Desktops carry a cleaning status; everything else reads
--          "Not Tracked" and is inventory-only.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Device types: allow the full hardware estate, not just computers.
-- ---------------------------------------------------------------------
alter table public.assets drop constraint if exists assets_device_type_valid;
alter table public.assets add constraint assets_device_type_valid check (
  device_type in (
    'Laptop', 'Desktop', 'Monitor', 'Docking Station',
    'Phone', 'Tablet', 'Printer', 'Peripheral', 'Other'
  )
);

-- ---------------------------------------------------------------------
-- 2. New asset-management columns. All nullable: existing rows predate
--    them and we should not invent values for them.
-- ---------------------------------------------------------------------
alter table public.assets add column if not exists location      text;
alter table public.assets add column if not exists purchase_cost numeric(12, 2);
alter table public.assets add column if not exists purchase_date date;

comment on column public.assets.purchase_cost is 'Purchase cost. numeric(12,2), never floating point, so totals do not drift.';

alter table public.assets drop constraint if exists assets_location_valid;
alter table public.assets add constraint assets_location_valid check (
  location is null or location in ('Remote', 'Hybrid', 'Office', 'Warehouse')
);

alter table public.assets drop constraint if exists assets_purchase_cost_valid;
alter table public.assets add constraint assets_purchase_cost_valid check (
  purchase_cost is null or purchase_cost >= 0
);

create index if not exists assets_location_idx      on public.assets (location);
create index if not exists assets_purchase_date_idx on public.assets (purchase_date);

-- ---------------------------------------------------------------------
-- 3. Status now depends on device type.
--    A monitor is tracked for inventory but never appears in the cleaning
--    rota, so it must not be counted as "Never Cleaned".
--    The old two-argument asset_status() is left in place for compatibility.
-- ---------------------------------------------------------------------
create or replace function public.asset_status(
  p_device_type    text,
  p_date_cleaned   date,
  p_next_clean_due date
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when p_device_type not in ('Laptop', 'Desktop')         then 'Not Tracked'
    when p_date_cleaned is null or p_next_clean_due is null then 'Never Cleaned'
    when p_next_clean_due < current_date                    then 'Overdue'
    when p_next_clean_due <= current_date + 30              then 'Due Soon'
    else 'OK'
  end;
$$;

-- ---------------------------------------------------------------------
-- 4. Rebuild the view.
--    It selects a.*, so the new columns shift the column order - that makes
--    "create or replace view" fail. It has to be dropped and recreated, and
--    dropping a view also drops its grants, so those are re-applied below.
-- ---------------------------------------------------------------------
drop view if exists public.assets_with_status;

create view public.assets_with_status
with (security_invoker = on) as
select
  a.*,
  public.asset_status(a.device_type, a.date_cleaned, a.next_clean_due) as status,
  (a.next_clean_due - current_date)                                    as days_until_due
from public.assets a;

comment on view public.assets_with_status is 'assets + derived status/days_until_due. Read-only surface for the app.';

revoke all on public.assets_with_status from anon;
grant select on public.assets_with_status to authenticated;
grant execute on function public.asset_status(text, date, date) to authenticated;

-- Check the result:
-- select status, count(*) from public.assets_with_status group by status order by 1;
