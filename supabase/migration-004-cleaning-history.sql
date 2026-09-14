-- =====================================================================
-- Migration 004: cleaning history
--
-- Run this ONCE in the Supabase SQL Editor, AFTER schema.sql and
-- migrations 001, 002 and 003.
--
-- Until now the register held only the LAST clean: recording a new one
-- overwrote the date and the initials, and the previous clean was gone. So
-- "how many machines did we clean in September" was an unanswerable
-- question. This adds an append-only log - one row per clean - written by a
-- trigger, so it cannot be forgotten by the app.
--
-- The existing date_cleaned values are copied in as each asset's first
-- history row, so the table is not empty on day one. Anything cleaned and
-- then re-cleaned before today is still lost: only the most recent clean
-- was ever stored.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The log.
--    asset_ref is copied in rather than looked up, so history survives an
--    asset being renamed or retired. Deleting an asset therefore keeps its
--    cleaning record, with asset_id set to null.
-- ---------------------------------------------------------------------
create table if not exists public.cleaning_log (
  id             uuid primary key default gen_random_uuid(),
  asset_id       uuid references public.assets(id) on delete set null,
  asset_ref      text not null,
  device_type    text,
  cleaned_on     date not null,
  cleaned_by     text not null,
  logged_at      timestamptz not null default now(),
  logged_by      uuid references auth.users(id),
  logged_by_email text
);

comment on table public.cleaning_log is 'Append-only record of every clean. Written by trigger, never by the app.';

-- One clean per asset per day per person: recording the same clean twice is
-- the same event, and this makes the backfill below safe to re-run.
create unique index if not exists cleaning_log_unique_event
  on public.cleaning_log (asset_id, cleaned_on, cleaned_by);

create index if not exists cleaning_log_cleaned_on_idx on public.cleaning_log (cleaned_on desc);
create index if not exists cleaning_log_asset_ref_idx  on public.cleaning_log (asset_ref);

-- ---------------------------------------------------------------------
-- 2. Write a row whenever a clean is recorded.
--    Fires only when the clean itself changes: editing an asset's location
--    or cost must not create a duplicate history entry.
-- ---------------------------------------------------------------------
create or replace function public.log_asset_clean()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.date_cleaned is null or new.cleaned_by is null then
    return null;
  end if;

  if tg_op = 'UPDATE'
     and new.date_cleaned is not distinct from old.date_cleaned
     and new.cleaned_by   is not distinct from old.cleaned_by then
    return null;
  end if;

  insert into public.cleaning_log
    (asset_id, asset_ref, device_type, cleaned_on, cleaned_by, logged_by, logged_by_email)
  values
    (new.id, new.asset_ref, new.device_type, new.date_cleaned, new.cleaned_by,
     auth.uid(), auth.jwt() ->> 'email')
  on conflict (asset_id, cleaned_on, cleaned_by) do nothing;

  return null;
end;
$$;

drop trigger if exists assets_log_clean on public.assets;
create trigger assets_log_clean
  after insert or update on public.assets
  for each row execute function public.log_asset_clean();

-- ---------------------------------------------------------------------
-- 3. Seed the log from what the register already holds.
-- ---------------------------------------------------------------------
insert into public.cleaning_log (asset_id, asset_ref, device_type, cleaned_on, cleaned_by)
select a.id, a.asset_ref, a.device_type, a.date_cleaned, a.cleaned_by
from public.assets a
where a.date_cleaned is not null and a.cleaned_by is not null
on conflict (asset_id, cleaned_on, cleaned_by) do nothing;

-- ---------------------------------------------------------------------
-- 4. Row Level Security.
--    The log is readable by signed-in users and written only by the
--    trigger above, which runs as its owner. Nobody edits or deletes
--    history through the app - that is the point of a log.
-- ---------------------------------------------------------------------
alter table public.cleaning_log enable row level security;

drop policy if exists "cleaning_log_select_authenticated" on public.cleaning_log;
create policy "cleaning_log_select_authenticated"
  on public.cleaning_log for select
  to authenticated
  using (true);

revoke all on public.cleaning_log from anon;
grant select on public.cleaning_log to authenticated;

-- Check the result:
-- select cleaned_on, asset_ref, cleaned_by from public.cleaning_log
--   order by cleaned_on desc limit 20;
