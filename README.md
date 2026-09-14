# IT Hardware Maintenance Tracker

A shared cleaning/maintenance register for a small internal IT support team.
Every signed-in technician sees and edits the same data, and the "when is this
due" logic lives in the database rather than in the browser.

- **Frontend:** React 18 + Vite, plain CSS, no UI framework to configure
- **Backend:** Supabase (Postgres + Auth + Realtime + Row Level Security)
- **Hosting:** GitHub Pages for the frontend, Supabase for the data

---

## What it does

**Dashboard** — total assets, overdue, due soon, never cleaned and OK. Each card
is a shortcut that filters the table below it.

**Needs attention** — everything that is overdue, never cleaned, or due within 30
days, most urgent first, with a one-click **Record clean** button that opens the
asset pre-filled with today's date.

**Asset register** — add, edit, delete and search assets; filter by device type,
department, cleaner and status; sort by any column; delete asks for confirmation
first.

**Asset fields** — Asset Ref, Device Type (Laptop/Desktop), Owner, Department,
Date Cleaned, Cleaned By (AL/BB/JS/RC/TM), Notes, Next Clean Due, Status, plus a
per-asset cleaning interval that defaults to 6 months.

### Business rules

| Rule | Where it is enforced |
| --- | --- |
| Next Clean Due = Date Cleaned + 6 months (per-asset override allowed) | `next_clean_due`, a **stored generated column** in Postgres |
| **OK** — more than 30 days remaining | `public.asset_status()` + the `assets_with_status` view |
| **Due Soon** — due within the next 30 days | same |
| **Overdue** — due date has passed (shown in red, row tinted) | same |
| **Never Cleaned** — no Date Cleaned recorded (flagged in red in the table, counted separately on the dashboard) | same |
| Asset Ref must be unique, ignoring case and surrounding spaces | unique index on `upper(btrim(asset_ref))` |
| Date Cleaned cannot be in the future | database trigger + form validation |
| Date Cleaned and Cleaned By must be given together | `assets_clean_record_complete` check constraint |
| Device Type / Cleaned By must be from the allowed lists | check constraints |
| `created_at`, `updated_at`, `updated_by` are recorded and cannot be forged by the client | `handle_asset_write()` trigger |
| Two people editing the same asset cannot silently overwrite each other | `version` column + optimistic concurrency check on update |

The browser recalculates status from the **stored** `next_clean_due` date so an
all-day-open tab stays correct past midnight, but it never decides what gets
saved — the database owns the dates and the constraints.

---

## Setup

### Prerequisites

- Node.js 20 or newer
- A GitHub account
- A Supabase account (the free tier is enough for a small team)

### 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> and select **New project**.
2. Give it a name (for example `it-hardware-tracker`), set a strong database
   password, choose the region closest to your team, and create the project.
3. Wait for provisioning to finish (about a minute).

### 2. Create the database schema

1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and
   select **Run**.
3. It should finish with "Success. No rows returned". The script is safe to run
   again if you need to re-apply it.

This creates the `assets` table, the `assets_with_status` view, indexes, all
constraints, the audit trigger, the Row Level Security policies, and enables
Realtime so open browser tabs update when a colleague saves a change.

Then run the migrations, in the same way and **in this order**. Each one is
safe to run again, and the app expects all of them:

| File | What it adds |
| --- | --- |
| [`supabase/migration-001-asset-management.sql`](supabase/migration-001-asset-management.sql) | General asset management: device types, location, purchase date and cost |
| [`supabase/migration-002-unassigned-assets.sql`](supabase/migration-002-unassigned-assets.sql) | Lets an asset have no user, so spare kit can be listed as unassigned |
| [`supabase/migration-003-device-specs.sql`](supabase/migration-003-device-specs.sql) | Hardware specification for computers and monitors |
| [`supabase/migration-004-cleaning-history.sql`](supabase/migration-004-cleaning-history.sql) | Append-only log of every clean, behind the Cleaning page's History tab |

### 3. (Optional) Load the sample data

Run [`supabase/seed.sql`](supabase/seed.sql) the same way. It inserts 14 sample
assets with dates relative to today, so you get a realistic mix of Overdue, Due
Soon, OK and Never Cleaned rows. Remove it later with:

```sql
delete from public.assets where asset_ref like 'SEED-%';
```

### 4. Create the team's user accounts

There is deliberately no self-service sign-up. Create each technician's account
yourself:

1. **Authentication → Users → Add user → Create new user**.
2. Enter their email and a password, and tick **Auto Confirm User** so they can
   sign in immediately.

Then close the door behind you:

3. **Authentication → Sign In / Providers → Email**: turn **Allow new users to
   sign up** OFF.

> This step matters. The anon key is embedded in the deployed JavaScript, and
> while that is by design (it only grants what your RLS policies allow), leaving
> public sign-ups enabled would let anyone who finds the key create an account
> and read your asset register.

### 5. Get your API credentials

**Project Settings → API** (or **API Keys**) gives you:

- **Project URL** → `VITE_SUPABASE_URL` (e.g. `https://abcdefghijkl.supabase.co`)
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

Never use the `service_role` key in this app — it bypasses Row Level Security.

### 6. Run it locally

```bash
git clone https://github.com/<your-user>/<your-repo>.git
cd <your-repo>
npm install
cp .env.example .env.local     # then fill in the two Supabase values
npm run dev
```

Open <http://localhost:5173> and sign in with an account you created in step 4.

Other commands:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

---

## Deploying to GitHub Pages

### 7. Push the code to GitHub

Run `npm install` first if you have not already — it creates `package-lock.json`,
which you should commit so the deployed build uses exactly the versions you
tested with.

```bash
git init
git add .
git commit -m "IT Hardware Maintenance Tracker"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

`.env` and `.env.local` are git-ignored, so your credentials are not committed.

### 8. Add the repository secrets

In the repository: **Settings → Secrets and variables → Actions → New repository
secret**. Add both:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Project URL from step 5 |
| `VITE_SUPABASE_ANON_KEY` | your anon/public key from step 5 |

The workflow fails with a clear message if either is missing.

### 9. Turn on GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

Then push to `main` (or run the **Deploy to GitHub Pages** workflow manually from
the Actions tab). The workflow in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) installs
dependencies, builds with your secrets injected, and publishes `dist/`.

Your app will be at `https://<your-user>.github.io/<your-repo>/`.

### 10. The Vite base path

A GitHub Pages *project* site is served from a subfolder
(`https://<user>.github.io/<repo>/`), so the built app must request its assets
from `/<repo>/` and not from `/`. Getting this wrong is the classic "blank page
with 404s for `/assets/index-xxxx.js`" symptom.

This project handles it for you:

- `vite.config.js` reads `base` from the `VITE_BASE_PATH` environment variable,
  defaulting to `/`.
- The deploy workflow works the value out automatically: `/<repo>/` for a normal
  repository, or `/` when the repository is named `<your-user>.github.io`.

You only need to set it yourself in two cases:

- **Custom domain** (e.g. `tracker.example.com`): the site is served from the
  domain root, so set `VITE_BASE_PATH` to `/`. Either add a `public/CNAME` file
  containing your domain and hard-code `base: '/'` in `vite.config.js`, or change
  the `Work out the Vite base path` step in the workflow to `echo "path=/"`.
- **Previewing production paths locally:** put `VITE_BASE_PATH=/<your-repo>/` in
  `.env.local`, then `npm run build && npm run preview`.

The workflow also copies `index.html` to `404.html` and adds `.nojekyll`, so deep
links and underscore-prefixed asset names behave on GitHub Pages.

### 11. Point Supabase at the deployed URL

**Authentication → URL Configuration → Site URL**: set it to
`https://<your-user>.github.io/<your-repo>/`. Email/password sign-in works
without this, but it keeps any future password-reset emails pointing at the right
place.

---

## Project structure

```
.
├── .github/workflows/deploy.yml   GitHub Pages build & deploy
├── public/favicon.svg
├── supabase/
│   ├── schema.sql                 tables, view, indexes, constraints, trigger, RLS
│   ├── migration-001-…            general asset management columns
│   ├── migration-002-…            unassigned assets
│   ├── migration-003-…            hardware specification columns
│   ├── migration-004-…            cleaning history log + trigger
│   └── seed.sql                   sample data for testing
├── src/
│   ├── components/
│   │   ├── AppShell.jsx           signed-in layout and all state wiring
│   │   ├── AssetDetailsModal.jsx  read-only view, with the specification tab
│   │   ├── BulkActionBar.jsx      actions for the ticked rows
│   │   ├── CleaningHistory.jsx    every clean recorded, newest first
│   │   ├── Pagination.jsx         page controls shared by every list
│   │   ├── ReportsPage.jsx        every report, and the only place CSVs are exported
│   │   ├── AssetFormModal.jsx     add/edit form + validation + live due-date preview
│   │   ├── AssetTable.jsx         sortable register
│   │   ├── AssetToolbar.jsx       search and filters
│   │   ├── AttentionPanel.jsx     overdue-first "needs attention" list
│   │   ├── ConfirmDialog.jsx      delete confirmation
│   │   ├── Header.jsx             branding, sync time, sign out
│   │   ├── LoginPage.jsx          Supabase email/password sign-in
│   │   ├── Modal.jsx              accessible modal shell
│   │   ├── StatsGrid.jsx          dashboard cards
│   │   ├── StatusBadge.jsx
│   │   └── Toast.jsx
│   ├── context/AuthContext.jsx    session state, signIn, signOut
│   ├── hooks/useAssets.js         fetching, realtime, create/update/delete
│   ├── lib/
│   │   ├── assetQueries.js        filtering, sorting, urgency ordering
│   │   ├── assetStatus.js         status rules (mirrors asset_status() in SQL)
│   │   ├── constants.js           dropdown values, thresholds, table names
│   │   ├── dates.js               timezone-safe date handling and formatting
│   │   ├── errors.js              database errors → plain English
│   │   └── supabaseClient.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── index.html
└── vite.config.js
```

---

## Customising

**Add or change the cleaners' initials or device types** — edit the lists in
`src/lib/constants.js` **and** the matching check constraints in
`supabase/schema.sql`:

```sql
alter table public.assets drop constraint assets_cleaned_by_valid;
alter table public.assets add constraint assets_cleaned_by_valid
  check (cleaned_by is null or cleaned_by in ('AL', 'BB', 'JS', 'RC', 'TM', 'NEW'));
```

**Change the default cleaning interval** — update
`DEFAULT_CLEANING_INTERVAL_MONTHS` in `src/lib/constants.js` and the column
default (`cleaning_interval_months integer not null default 6`). Individual
assets can already be put on their own cycle from the form.

**Change the "Due Soon" window** — update `DUE_SOON_WINDOW_DAYS` in
`src/lib/constants.js` and the `current_date + 30` in `public.asset_status()`.

**Restrict deletes to admins** — replace the delete policy in `schema.sql`:

```sql
drop policy "assets_delete_authenticated" on public.assets;
create policy "assets_delete_admins" on public.assets for delete to authenticated
  using (auth.jwt() ->> 'email' in ('alice@example.com', 'bob@example.com'));
```

---

## Testing

Automated tests run with no live Supabase project required.

```bash
npm test          # unit + component tests (Vitest), fast and offline
npm run test:watch  # the same, in watch mode
npm run test:e2e  # end-to-end browser tests (Playwright), Supabase mocked
```

- **Unit tests** (`src/lib/__tests__/`) cover the business logic that mirrors the
  database: date maths and month-end clamping, the Overdue/Due Soon/Never
  Cleaned/OK status machine, filtering/sorting, and the Postgres→human error
  translations.
- **Component tests** (`src/components/*.test.jsx`, jsdom) cover the login flow,
  the asset form's validation (required fields, duplicate refs, future clean
  dates), and the delete confirmation.
- **End-to-end tests** (`e2e/`) drive a real production build in Chromium with
  every Supabase call intercepted in the browser — login, listing assets with
  their computed status, and adding an asset.

CI (`.github/workflows/ci.yml`) runs all three on every push and pull request,
and the deploy workflow gates on the unit/component suite so a red build never
reaches GitHub Pages.

> **Playwright browsers:** CI installs Chromium automatically. If a local or
> sandboxed environment already ships a pinned Chromium, point Playwright at it
> with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:e2e` to skip
> the download.

---

## How concurrent use is handled

- Every write goes straight to Supabase; there is no local cache to get stale.
- Postgres Realtime pushes changes to every open tab, so colleagues' edits appear
  without a refresh. A 10-minute poll and a refresh-on-tab-focus cover the case
  where the socket drops.
- Updates are version-checked. If someone else saved the asset while you had the
  form open, your save is rejected with a clear message and the latest data is
  reloaded instead of silently overwriting their work.

---

## Troubleshooting

**"Configuration required" screen** — the build had no Supabase credentials. Add
`.env.local` locally, or the two repository secrets and re-run the workflow.

**Blank page on GitHub Pages, 404s for `/assets/...`** — the base path is wrong.
See step 10; check the workflow's *Work out the Vite base path* step output.

**"Incorrect email or password"** — the account may not be confirmed. In
Supabase, open the user and use **Confirm email**, or recreate them with **Auto
Confirm User** ticked.

**Rows do not appear, or writes fail with a permissions error** — make sure
`schema.sql` ran completely; the RLS policies are at the end of it. Signing out
and back in refreshes an expired token.

**Colleagues' changes do not appear live** — Realtime may not be enabled for the
table. Re-run the last section of `schema.sql`, or enable it in **Database →
Replication**. The app still refreshes on focus and every 10 minutes regardless.

**Dates look a day out** — they should not be: dates are handled as plain
calendar strings end to end, never as UTC timestamps.
