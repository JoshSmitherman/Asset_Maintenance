# Security & QA review

Static review of the codebase and database schema. No live/production system was
tested — findings are from reading `src/**` and `supabase/**`. Ordered
worst-first. Nothing here is a critical, exploitable-by-anonymous-users hole; the
app is well built.

## Findings

### 1. All authenticated users have full read/write/delete on every asset — by design, confirm it's intended
**Severity:** informational (design decision) · **File:** `supabase/schema.sql`

Row Level Security is enabled, but all four policies are `using (true)` /
`with check (true)` for the `authenticated` role. Any signed-in technician can
read, edit, and **delete every asset**, with no per-owner or per-role scoping.

The README states this is intentional for a small shared IT team, and the schema
ships a commented-out example of an admin-only delete policy. This is a
legitimate choice — it just deserves a conscious sign-off rather than being the
default. If delete should be restricted, uncomment and fill in:

```sql
using (auth.jwt() ->> 'email' in ('alice@example.com', 'bob@example.com'));
```

Anonymous access is correctly denied (`revoke all ... from anon`).

### 2. `esbuild`/`vite` dev-server advisory (npm audit: 1 high, 1 moderate)
**Severity:** low in practice · **Where:** dev dependencies only

`npm audit` reports GHSA-67mh-4wv8-2f99 (esbuild dev server can be reached by any
website). It affects the **local dev server only** and is not present in the
static bundle deployed to GitHub Pages, so production is unaffected. Resolving it
requires a Vite major upgrade (`vite@5 → 8`), which is a breaking change worth
scheduling on its own rather than rushing.

### 3. Schema drift: `schema.sql` allows only Laptop/Desktop, app allows 9 types
**Severity:** setup/data-integrity bug (not a vulnerability) · **Files:**
`supabase/schema.sql`, `supabase/migration-001-asset-management.sql`,
`src/lib/constants.js`

`schema.sql` still constrains `device_type in ('Laptop','Desktop')`, while
`migration-001` widens it to nine types and `src/lib/constants.js` offers all
nine in the UI. A fresh install that runs **only** `schema.sql` will reject any
Monitor/Phone/Tablet/etc. with a CHECK violation. Fold the migration into
`schema.sql` (or document that both must be run, in order) so a clean setup
matches the app.

### 4. LoginPage has an unreachable validation branch
**Severity:** trivial (dead code) · **File:** `src/components/LoginPage.jsx`

The email/password inputs are `required` and the `<form>` has no `noValidate`, so
the browser's native validation blocks an empty submit before `handleSubmit`
runs. The custom `"Enter your email address and password."` message can never
appear. Harmless; either add `noValidate` to rely on the custom message, or drop
the redundant check. (Documented by a test in `LoginPage.test.jsx`.)

## Things that are done well (verified, no action needed)

- **No XSS surface in rendering** — no `dangerouslySetInnerHTML` / `innerHTML`
  anywhere; React escapes all asset fields (refs, owner, notes) on output.
- **`SECURITY DEFINER` trigger is hardened** — `handle_asset_write()` pins
  `search_path`, so it can't be hijacked via a malicious schema on the path.
- **Client can't forge audit data** — `created_at`, `created_by`, `updated_by`,
  and `version` are stamped by the trigger from `auth.uid()`, not the payload.
- **View respects caller RLS** — `assets_with_status` uses
  `security_invoker = on`, so reads through the view still enforce policies.
- **Optimistic concurrency** — updates are gated on `version`, preventing silent
  lost updates between concurrent editors.
- **Secrets hygiene** — only the anon key is shipped (safe by design); the
  `.env.example` explicitly warns never to use the service_role key, and the
  deploy workflow fails fast if the secrets are missing.

## What this review did NOT cover

Runtime penetration testing — whether RLS actually holds when the anon key hits
the PostgREST API directly, auth brute-force/lockout behaviour, and real session
handling — requires a live (ideally staging) Supabase instance and was out of
scope here.
