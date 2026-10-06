# Orbit

Orbit is the IT asset management site for a small internal IT support team:
every device, who has it, and when it was last cleaned or repaired. (The
GitHub repository is still called `Asset_Maintenance`, so the live address
ends `/Asset_Maintenance/`.)

It is a shared cleaning/maintenance register.
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

**Asset register** — add, edit, retire and search assets; filter by device type,
department, cleaner and status; sort by any column. Only admins can delete, and
delete asks for confirmation first.

**Retiring** — kit at the end of its life is retired rather than deleted: it
leaves the register, the cleaning queue and the dashboard but keeps its record,
repairs and files, with the date, the reason and who wiped its data. Retired kit
is listed, folded away, at the bottom of the Assets page; an admin can restore it.

**Asset fields** — Asset Ref, Device Type (Laptop/Desktop), Owner, Department,
Date Cleaned, Cleaned By (AL/BB/JS/RC/TM), Notes, Next Clean Due, Status, plus a
per-asset cleaning interval that defaults to 6 months (12 for a laptop).

**Specification** — brand, model, processor and so on for computers and
monitors. Adding an asset walks you from Details to Specification with a
**Next** button. Type a make and model the register already has - or pick one
from **Copy specs from a model you already have** - and its specification is
copied into the empty boxes, so the second Latitude 5540 takes seconds. It
learns from your own register as it grows; nothing is sent anywhere.

**Asset history** — each asset's **History** tab shows who has had it as a bar
(one stretch per person, as wide as they held it) above a timeline of every
move, department or location change, clean and its purchase.

**Repairs** — each asset's **Repairs** tab logs in-house fixes: what was wrong,
who fixed it, when, and each part replaced with its cost, totalled for you.

**Files** — invoices, receipts and photos on an asset or on one of its repairs,
kept in a private Supabase Storage bucket (the Free plan's 1 GB): a file only
opens for someone signed in, through a link that lasts two minutes.

**Admin** — admins get an **Admin** page to add accounts, reset passwords,
remove people and make others admins (needs the `admin-users` Edge Function).
Admins are also the only ones who can delete an asset or a repair, or restore
retired kit.

### Business rules

| Rule | Where it is enforced |
| --- | --- |
| Next Clean Due = Date Cleaned + interval (6 months; 12 for laptops; per-asset override allowed) | `next_clean_due`, a **stored generated column** in Postgres |
| Never cleaned but purchased: first clean is due 12 months after the Purchase Date | same column |
| **OK** — more than 30 days remaining | `public.asset_status()` + the `assets_with_status` view |
| **Due Soon** — due within the next 30 days | same |
| **Overdue** — due date has passed (shown in red, row tinted) | same |
| **Never Cleaned** — no Date Cleaned and no Purchase Date, so no due date (flagged in red in the table, counted separately on the dashboard) | same |
| Asset Ref must be unique, ignoring case and surrounding spaces | unique index on `upper(btrim(asset_ref))` |
| Date Cleaned cannot be in the future | database trigger + form validation |
| Date Cleaned and Cleaned By must be given together | `assets_clean_record_complete` check constraint |
| Device Type must be from the allowed list | check constraint |
| `created_at`, `updated_at`, `updated_by` are recorded and cannot be forged by the client | `handle_asset_write()` trigger |
| Two people editing the same asset cannot silently overwrite each other | `version` column + optimistic concurrency check on update |
| Every change to an asset is recorded with its old and new value, and so are deletes and repairs | `log_asset_change()`, `log_asset_delete()` and `log_repair_change()` triggers into `asset_events` |
| Only company accounts can sign in; only members see anything; viewers cannot change anything | `orbit_company_email_only` trigger, `members` table and `can_view()` / `can_edit()` in every policy |
| Only admins manage people, nobody changes their own access, there is always an admin | `members` policies and `handle_member_write()` trigger |
| Only admins can delete an asset or a repair; anyone else's delete matches nothing | `assets_delete_admin` / `repairs_delete_admin` policies |
| Retired kit always says when and why; only an admin can restore it | `assets_retirement_complete` check + `handle_asset_write()` trigger |
| A repair's total is the sum of its parts, worked out by the database | `handle_repair_write()` trigger |
| Who fixed a repair, or wiped a drive, is a real account; the email is looked up, not trusted | same triggers, from `auth.users` |
| Files are photos or PDFs up to 10 MB, kept under their own asset's folder | `attachments_file_valid` check + the private `asset-files` bucket |
| A file can be removed by whoever added it, or an admin | `attachments` and `storage.objects` policies |

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
2. Give it a name (for example `orbit`), set a strong database
   password, choose the region closest to your team, and create the project.
3. Wait for provisioning to finish (about a minute).

### 2. Create the database

1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/setup.sql`](supabase/setup.sql) and
   select **Run**. It should finish with "Success. No rows returned".

That one script is the whole database: tables, the status logic, history,
people and access, Row Level Security, file storage and Realtime. It is safe to
run again at any time, and running it again is also how an existing database is
updated - it adds whatever is missing and changes nothing else.

> The files in `supabase/history/` are how older databases were built. **Never
> run them** - they would undo security added since, and they stop themselves if
> you try.

> **Upgrading a live Orbit to 2.10 (company sign-in)?** Order matters, or
> people are locked out:
> 1. Run `setup.sql` in the SQL Editor. The live site keeps working, and
>    everyone with an account is put on the members list (in Technical
>    Support, as an editor; old admins stay admins).
> 2. Merge to `main` so the new site deploys.
> 3. Redeploy the `admin-users` Edge Function (see [Edge Functions](#edge-functions)).
> 4. Set up Microsoft sign-in (step 5a), then check everyone's department and
>    access under **Admin → People & access**.

### 3. (Optional) Load sample data - test projects only

Run [`supabase/seed.sql`](supabase/seed.sql) the same way. It inserts sample
assets with dates relative to today. Remove them later with:

```sql
delete from public.assets where asset_ref like 'SEED-%';
```

### 4. Who can use Orbit

Orbit is for the company only, with three locks:

1. **Company accounts only.** Sign-in accounts can only be made for the email
   domains in `public.allowed_email_domains` (`adaro.net`). Add another domain
   with `insert into public.allowed_email_domains values ('example.com');`.
2. **Members only.** Signing in is not enough: every table checks the person is
   on the members list, which only admins change (Admin → People & access).
   Removing someone, or switching them off, stops them straight away.
3. **Access levels.** Each member has a department (Customer Service, Technical
   Support, Developer, Credit Control, Finance, Exec) and a level:
   **View only** (sees everything, changes nothing), **Can edit** (adds, edits,
   cleans, repairs, retires) or **Admin** (also deletes, restores retired kit
   and manages people). Technical Support start on Can edit, everyone else on
   View only.

**The first admin.** Sign in once (see step 6 for Microsoft sign-in, or make a
password account under **Authentication → Users → Add user**, ticking **Auto
Confirm User**), then run `setup.sql` again: if nobody is an admin, the oldest
account becomes one. To make a particular person admin from the SQL Editor:

```sql
insert into public.members (email, department, access)
values ('you@adaro.net', 'Technical Support', 'admin')
on conflict (email) do update set access = 'admin', active = true;
```

**Everyone else** signs in with Microsoft and presses **Ask for access**; an
admin lets them in from **Admin → People & access**. Or the admin adds them
first with **Give someone access**, and they just sign in.

**Supabase settings to check** (Authentication → Sign In / Providers):

- **Allow new users to sign up: ON** - Microsoft sign-in needs it to create a
  person's account the first time. It is safe: only company addresses can get
  an account, and an account sees nothing until an admin adds the person.
- **Allow anonymous sign-ins: OFF.**
- **Email → Confirm email: ON** (the default).

### 5a. Microsoft (Microsoft 365) sign-in

Free on both sides. Needs someone who can register apps in the company's
Microsoft Entra ID (Azure AD) - usually IT.

1. **Entra admin centre → App registrations → New registration.**
   - Name: `Orbit`.
   - Supported account types: **Accounts in this organizational directory only
     (single tenant)**. This is required, not optional: it is what keeps it to
     Adaro accounts, and the Tenant URL in step 3 must name the Adaro tenant
     (never `common`).
   - Redirect URI: **Web**, `https://<project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows the exact address on its Azure provider page).
2. On the new app: copy the **Application (client) ID** and the **Directory
   (tenant) ID**. Under **Certificates & secrets → New client secret**, copy the
   secret's **Value** (it is shown once; it expires, so note the date).
3. **Supabase → Authentication → Sign In / Providers → Azure**: turn it on,
   paste the client ID and secret, and set **Azure Tenant URL** to
   `https://login.microsoftonline.com/<tenant-id>`. Save.
4. **Authentication → URL Configuration**: **Site URL**
   `https://<your-user>.github.io/<your-repo>/`, and add the same address
   under **Redirect URLs** (plus `http://localhost:5173/` for local work).

People's Microsoft email must match the one on the members list, which it will
for normal Microsoft 365 accounts (`first.last@adaro.net`).

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
git commit -m "Orbit"
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

**Authentication → URL Configuration**: set **Site URL** to
`https://<your-user>.github.io/<your-repo>/` and add it under **Redirect URLs**.
Microsoft sign-in returns people here, so it must match.

---

## Edge Functions

One small function, [`admin-users`](supabase/functions/admin-users/index.ts),
handles the few things that need Supabase's service-role key, which must never
be in the browser: setting a password for someone who cannot use Microsoft
sign-in, and removing their sign-in. Everything else on the Admin page works
without it. It checks the caller is an admin on the members list every time.

**Deploy from the dashboard (no tools needed):** **Edge Functions → Deploy a
new function → Via Editor** (or open `admin-users` if it is already there),
name it exactly `admin-users`, replace the code with the file's contents, and
**Deploy**. Leave **Verify JWT** on. It needs no secrets.

**Or with the Supabase CLI:**

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy admin-users
```

## Backups

The Supabase Free plan has no backups you can download, so
[`.github/workflows/backup.yml`](.github/workflows/backup.yml) takes one every
night: the database's structure, data and roles, encrypted (this repository is
public) and kept for 30 days under **Actions → Backup → the run → Artifacts**.
The same job keeps the free project from pausing after a week of quiet.

To turn it on, a repository admin adds two secrets (**Settings → Secrets and
variables → Actions**):

- `SUPABASE_DB_URL` - **Supabase → Connect → Session pooler** connection
  string, with the database password filled in.
- `BACKUP_PASSPHRASE` - a long passphrase. Keep it in the team's password
  manager: without it a backup cannot be opened.

**To restore** (into a new, empty Supabase project is safest):

```bash
gpg --decrypt orbit-backup-YYYY-MM-DD.tar.gz.gpg > backup.tar.gz
tar -xzf backup.tar.gz
psql "<new project's connection string>" -f backup/roles.sql -f backup/schema.sql \
  -c "SET session_replication_role = replica" -f backup/data.sql
```

Attached files (photos, invoices) live in Supabase Storage and are not in the
nightly copy; download them from **Storage → asset-files** if needed.

GitHub stops scheduled jobs in a public repository after 60 days with no
commits; a push, or running the workflow by hand, starts it again.

## What it costs

Nothing, on these free tiers:

| Part | Free allowance | Orbit's use |
| --- | --- | --- |
| GitHub Pages and Actions | Free for a public repository | Hosts the site, runs tests and backups |
| Supabase Free plan | 500 MB database, 1 GB files, 5 GB data out a month, 50,000 monthly users | Thousands of assets fit comfortably |
| Microsoft sign-in | Included with Microsoft 365 | Company sign-in |

Things to keep an eye on: **Storage** (1 GB - mostly photos and PDFs) and
**data out** (each open tab reloads the register when someone changes it). Both
are shown under **Supabase → Settings → Usage**. A project with no activity for
a week is paused; the nightly backup job prevents that. Supabase's limits
change from time to time; check <https://supabase.com/pricing>.

---

## Project structure

```
.
├── .github/workflows/deploy.yml   GitHub Pages build & deploy
├── .github/workflows/release.yml  tags each deployed version, publishes its notes
├── CHANGELOG.md                   release notes, generated - do not edit
├── scripts/                       changelog and release-notes generators
├── public/favicon.svg
├── supabase/
│   ├── setup.sql                  the whole database in one script (new projects)
│   ├── setup.sql                  the whole database, safe to re-run
│   ├── __tests__/                 runs setup.sql in PGlite and tests its rules
│   ├── history/                   how older databases were built - never run
│   ├── functions/admin-users/     Edge Function behind the Admin page
│   └── seed.sql                   sample data for testing
├── src/
│   ├── components/
│   │   ├── AdminPage.jsx          accounts and roles (admins only)
│   │   ├── AppShell.jsx           signed-in layout and all state wiring
│   │   ├── AssetDetailsModal.jsx  read-only view: details, specification, history
│   │   ├── AssetHistory.jsx       who-has-had-it bar and event timeline
│   │   ├── ReleaseNotesPage.jsx   what changed in each version
│   │   ├── SpecMemory.jsx         copies specs from models already on the register
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
│   ├── context/AuthContext.jsx    session state, signIn, signOut, isAdmin
│   ├── hooks/useAssets.js         fetching, realtime, create/update/delete
│   ├── hooks/useAssetHistory.js   one asset's changes and cleans
│   ├── lib/
│   │   ├── assetHistory.js        history rows → custody bar and timeline
│   │   ├── assetQueries.js        filtering, sorting, urgency ordering
│   │   ├── edgeFunctions.js       calling the Edge Functions, with plain errors
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

**Release notes** — click the version number next to the title to read them.
For each new release, add an entry at the top of
[`src/lib/releaseNotes.js`](src/lib/releaseNotes.js) (grouped by page, each
change marked added, changed, fixed or removed) and set the same version in
`package.json`; a test fails if the two disagree. The header shows a **New**
marker until someone has opened the latest notes. [`CLAUDE.md`](CLAUDE.md) makes
this part of every change, and CI warns on a push to `main` that changes the
app without touching the notes. The same notes are kept in
[`CHANGELOG.md`](CHANGELOG.md) (regenerate it with `npm run changelog`; a test
fails if it drifts), and once a new version deploys, the Release workflow tags
the deployed commit and publishes it as a
[GitHub Release](https://github.com/JoshSmitherman/Asset_Maintenance/releases).

**Add a device type or department** — edit the list in `src/lib/constants.js`
(device types) or `src/lib/access.js` (departments) **and** the matching check
constraint in `supabase/setup.sql`, then run `setup.sql` again. Cleaners are
the team's editors and admins, so they need no list.

**Change the default cleaning interval** — update
`DEFAULT_CLEANING_INTERVAL_MONTHS` in `src/lib/constants.js` and the column
default (`cleaning_interval_months integer not null default 6`). Individual
assets can already be put on their own cycle from the form.

**Change the "Due Soon" window** — update `DUE_SOON_WINDOW_DAYS` in
`src/lib/constants.js` and the `+ 30` in `public.asset_status()`.

**Who can delete** — only admins, by the `assets_delete_admin` policy in
`setup.sql`. Everyone else retires kit, which keeps the record.

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

**"You need access to Orbit"** — the person is signed in but not on the members
list (or is switched off). An admin adds them under **Admin → People & access**.

**"Orbit is only for Adaro accounts"** after Microsoft sign-in — they signed in
with a personal Microsoft account, or the domain is missing from
`public.allowed_email_domains`.

**"Microsoft sign-in has not been switched on yet"** — the Azure provider is off
in Supabase; see step 5a.

**Rows do not appear, or writes fail with a permissions error** — check the
person's access level on the People & access page, and that `setup.sql` ran
completely. Signing out and back in refreshes an expired session.

**Colleagues' changes do not appear live** — Realtime may not be enabled for the
table. Run `setup.sql` again, or enable it in **Database →
Replication**. The app still refreshes on focus and every 10 minutes regardless.

**Dates look a day out** — they should not be: dates are handled as plain
calendar strings end to end, never as UTC timestamps.
