-- =====================================================================
-- Migration 002: allow unassigned assets
--
-- Run this ONCE in the Supabase SQL Editor, AFTER schema.sql and
-- migration-001-asset-management.sql.
--
-- Until now every asset had to name a user. Kit sitting in a cupboard or
-- waiting to be issued had to be given a placeholder like "Spare", which
-- made it indistinguishable from a real assignment. After this, the User
-- field can be left blank and those devices are listed separately as
-- unassigned.
--
-- "Blank" is stored as NULL, never as an empty string, so there is exactly
-- one way to represent "nobody has this".
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The User field becomes optional.
-- ---------------------------------------------------------------------
alter table public.assets alter column owner_name drop not null;

-- The old constraint rejected blanks outright. The new one still rejects a
-- string of spaces, but permits NULL as a deliberate "unassigned".
alter table public.assets drop constraint if exists assets_owner_not_blank;
alter table public.assets add constraint assets_owner_not_blank check (
  owner_name is null or btrim(owner_name) <> ''
);

-- ---------------------------------------------------------------------
-- 2. Normalise a blank User to NULL on write.
--    Without this, a form that submits "" would trip the constraint above
--    instead of being understood as unassigned. Same treatment notes
--    already get. The rest of the function is unchanged from schema.sql.
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
-- 3. Tidy up any placeholder values already in the register.
--    Commented out deliberately: run it only if these are the words your
--    team used for "nobody", and check the SELECT first.
-- ---------------------------------------------------------------------
-- select asset_ref, owner_name from public.assets
--   where lower(btrim(owner_name)) in ('spare', 'unassigned', 'n/a', 'none', '-');
--
-- update public.assets set owner_name = null
--   where lower(btrim(owner_name)) in ('spare', 'unassigned', 'n/a', 'none', '-');

-- How many are unassigned now:
-- select count(*) from public.assets where owner_name is null;
