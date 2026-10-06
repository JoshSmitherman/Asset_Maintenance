// Runs supabase/setup.sql in PGlite (Postgres compiled to WebAssembly, in
// process, nothing to install) with just enough of Supabase's auth and
// storage schemas stubbed for it to load. Lets the tests check what the
// database itself enforces - triggers, constraints, row-level security -
// rather than trusting the front end's copy of the rules.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SETUP_SQL = fs
  .readFileSync(path.join(here, '..', 'setup.sql'), 'utf8')
  // pgcrypto is built into PGlite's gen_random_uuid already.
  .replace(/create extension if not exists pgcrypto;/i, '');

const STUBS = `
create role authenticated; create role anon; create role service_role;
create schema auth; create schema storage;
create table auth.users (
  id uuid primary key, email text, created_at timestamptz default now(),
  raw_user_meta_data jsonb, raw_app_meta_data jsonb, last_sign_in_at timestamptz,
  deleted_at timestamptz, banned_until timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt', true), ''), '{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text,
  owner uuid, metadata jsonb);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as
  $$ select string_to_array(name, '/') $$;
`;

/** A fresh database with setup.sql applied (twice, to prove it re-runs). */
export async function freshDatabase() {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(SETUP_SQL);
  await db.exec(SETUP_SQL);
  return db;
}

/** Acts as a signed-in account: auth.uid() and auth.jwt() answer for them. */
export async function signInAs(db, { id, email }) {
  await signOut(db);
  await db.query(`insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing`, [id, email]);
  await db.query(`select set_config('request.uid', $1, false), set_config('request.jwt', $2, false)`, [
    id,
    JSON.stringify({ sub: id, email, role: 'authenticated' })
  ]);
}

/** Nobody signed in: how the SQL Editor runs. */
export async function signOut(db) {
  await db.query(`select set_config('request.uid', '', false), set_config('request.jwt', '', false)`);
}

/** Puts someone on the members list, as the SQL Editor would. */
export async function addMember(db, { email, access = 'editor', department = 'Technical Support', full_name = null }) {
  const uid = (await db.query(`select current_setting('request.uid', true) as uid, current_setting('request.jwt', true) as jwt`)).rows[0];
  await signOut(db);
  await db.query(
    `insert into public.members (email, access, department, full_name) values ($1, $2, $3, $4)
     on conflict (email) do update set access = excluded.access, department = excluded.department, active = true`,
    [email, access, department, full_name]
  );
  await db.query(`select set_config('request.uid', $1, false), set_config('request.jwt', $2, false)`, [uid.uid ?? '', uid.jwt ?? '']);
}

/** Runs one statement as the authenticated role, so row-level security applies. */
export async function asUser(db, sql, params = []) {
  await db.exec('set role authenticated');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}

export async function rows(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}
