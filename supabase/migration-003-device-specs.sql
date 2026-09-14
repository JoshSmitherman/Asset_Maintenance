-- =====================================================================
-- Migration 003: hardware specifications
--
-- Run this ONCE in the Supabase SQL Editor, AFTER schema.sql,
-- migration-001-asset-management.sql and migration-002-unassigned-assets.sql.
--
-- Adds the specification recorded against computers and monitors: what the
-- machine is, what is inside it, and the bits that only a laptop has. Every
-- column is optional - an asset with no specification filled in is still a
-- perfectly good register entry.
--
-- Which columns apply to which device type is decided by the app
-- (src/lib/specs.js), not by the database: the database only stores what it
-- is given and checks it is sane.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The specification columns.
--    Laptops and desktops use brand/model/processor/ram/storage; laptops
--    add screen size, battery and charger; monitors use screen size,
--    resolution and the port counts.
-- ---------------------------------------------------------------------
alter table public.assets add column if not exists spec_brand        text;
alter table public.assets add column if not exists spec_model        text;
alter table public.assets add column if not exists spec_processor    text;
alter table public.assets add column if not exists spec_ram          text;
alter table public.assets add column if not exists spec_storage      text;
alter table public.assets add column if not exists spec_screen_size  text;
alter table public.assets add column if not exists spec_battery_type text;
alter table public.assets add column if not exists spec_charger_type text;
alter table public.assets add column if not exists spec_resolution   text;
alter table public.assets add column if not exists spec_hdmi_ports   smallint;
alter table public.assets add column if not exists spec_dp_ports     smallint;

comment on column public.assets.spec_model is 'Model or variant name, e.g. "Latitude 5540".';

-- ---------------------------------------------------------------------
-- 2. Sanity checks.
--    A blank is stored as NULL (the app sends null, never ""), and nothing
--    is long enough to break the layout. Port counts are small whole
--    numbers; 6 is well beyond any monitor we are likely to buy.
-- ---------------------------------------------------------------------
alter table public.assets drop constraint if exists assets_spec_text_sane;
alter table public.assets add constraint assets_spec_text_sane check (
      (spec_brand        is null or (btrim(spec_brand)        <> '' and length(spec_brand)        <= 60))
  and (spec_model        is null or (btrim(spec_model)        <> '' and length(spec_model)        <= 60))
  and (spec_processor    is null or (btrim(spec_processor)    <> '' and length(spec_processor)    <= 60))
  and (spec_ram          is null or (btrim(spec_ram)          <> '' and length(spec_ram)          <= 60))
  and (spec_storage      is null or (btrim(spec_storage)      <> '' and length(spec_storage)      <= 60))
  and (spec_screen_size  is null or (btrim(spec_screen_size)  <> '' and length(spec_screen_size)  <= 60))
  and (spec_battery_type is null or (btrim(spec_battery_type) <> '' and length(spec_battery_type) <= 60))
  and (spec_charger_type is null or (btrim(spec_charger_type) <> '' and length(spec_charger_type) <= 60))
  and (spec_resolution   is null or (btrim(spec_resolution)   <> '' and length(spec_resolution)   <= 60))
);

alter table public.assets drop constraint if exists assets_spec_ports_sane;
alter table public.assets add constraint assets_spec_ports_sane check (
      (spec_hdmi_ports is null or (spec_hdmi_ports between 0 and 6))
  and (spec_dp_ports   is null or (spec_dp_ports   between 0 and 6))
);

-- ---------------------------------------------------------------------
-- 3. Normalise blanks to NULL on write.
--    Same treatment notes and owner_name already get, so a form that
--    submits "" cannot trip the constraints above. The rest of the
--    function is unchanged from migration-002.
-- ---------------------------------------------------------------------
create or replace function public.handle_asset_write()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  new.asset_ref  := btrim(new.asset_ref);
  new.owner_name := nullif(btrim(coalesce(new.owner_name, '')), '');
  new.department := btrim(new.department);
  new.notes      := nullif(btrim(coalesce(new.notes, '')), '');

  new.spec_brand        := nullif(btrim(coalesce(new.spec_brand, '')), '');
  new.spec_model        := nullif(btrim(coalesce(new.spec_model, '')), '');
  new.spec_processor    := nullif(btrim(coalesce(new.spec_processor, '')), '');
  new.spec_ram          := nullif(btrim(coalesce(new.spec_ram, '')), '');
  new.spec_storage      := nullif(btrim(coalesce(new.spec_storage, '')), '');
  new.spec_screen_size  := nullif(btrim(coalesce(new.spec_screen_size, '')), '');
  new.spec_battery_type := nullif(btrim(coalesce(new.spec_battery_type, '')), '');
  new.spec_charger_type := nullif(btrim(coalesce(new.spec_charger_type, '')), '');
  new.spec_resolution   := nullif(btrim(coalesce(new.spec_resolution, '')), '');

  if new.date_cleaned is not null and new.date_cleaned > current_date then
    raise exception 'Date Cleaned cannot be in the future (%).', new.date_cleaned
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
    new.version    := 1;
  else
    -- Preserve creation audit data regardless of what the client sent.
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.version    := old.version + 1;
  end if;

  new.updated_at       := now();
  new.updated_by       := auth.uid();
  new.updated_by_email := coalesce(auth.jwt() ->> 'email', new.updated_by_email);

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Rebuild the read view.
--    "select a.*" freezes the column list at the moment the view is
--    created, so new columns do NOT appear in an existing view. It has to
--    be dropped and recreated, and dropping a view also drops its grants,
--    so those are re-applied. Same definition as migration-001.
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

-- Check the result - every spec column should be listed:
-- select column_name from information_schema.columns
--   where table_name = 'assets_with_status' and column_name like 'spec_%'
--   order by column_name;
