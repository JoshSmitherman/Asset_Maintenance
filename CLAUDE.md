# IT Hardware Maintenance Tracker

React + Vite front end on GitHub Pages, Supabase (Postgres, Auth, Edge
Functions) behind it. See README.md for setup and structure.

## Release notes - update them with every change

The app has a Release Notes page (click the version next to the title). Keep
it current without being asked:

- **Any change people using the app could notice** - a feature, a fix, a
  wording or layout change - adds an entry in the same commit, at the top of
  `RELEASES` in `src/lib/releaseNotes.js`. Group items by the page they
  affect (Dashboard, Assets, Cleaning, Reports, Admin, General) and mark each
  `added`, `changed`, `fixed` or `removed`. Write for the people using the
  app, not developers: what they will see, in plain words.
- **Bump the version** in `package.json` and `package-lock.json` (both the
  top-level `version` and `packages[""].version`) to match the new entry.
  A test fails if `package.json` and the latest release disagree.
  - Patch (2.2.0 -> 2.2.1): fixes and small tweaks only.
  - Minor (2.2.0 -> 2.3.0): anything new or noticeably different.
  - Major: only when asked.
- **Several changes before a deploy** can share one release: add to the
  top entry while its version has not reached `main` yet, rather than
  creating a new version for each commit.
- Behind-the-scenes work (tests, CI, refactors, docs) gets no entry.

CI warns on a push to `main` that changes `src/` without touching the
release notes.

## Before pushing

- `npm test` (Vitest) and `npm run build` must pass.
- `npm run test:e2e` runs Playwright against a mocked Supabase; in a sandbox
  with a preinstalled Chromium set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
- Database changes go in `supabase/setup.sql`, which must stay safe to re-run
  on an existing database; say in the summary that it needs running.
- Everything must stay free to run: GitHub Pages and the Supabase Free plan,
  no paid APIs.
