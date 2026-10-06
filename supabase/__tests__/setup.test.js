import { beforeAll, describe, expect, it } from 'vitest';
import { addMember, asUser, freshDatabase, rows, signInAs, signOut } from './harness';

const TECH = { id: '00000000-0000-0000-0000-0000000000a1', email: 'tech@adaro.net' };
const VIEWER = { id: '00000000-0000-0000-0000-0000000000b2', email: 'cs.person@adaro.net' };
const ADMIN = { id: '00000000-0000-0000-0000-0000000000c3', email: 'boss@adaro.net' };
const STRANGER = { id: '00000000-0000-0000-0000-0000000000d4', email: 'new.starter@adaro.net' };

/** The date in the UK right now, as the database should see it. */
function londonToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
}

describe('setup.sql', () => {
  let db;
  beforeAll(async () => {
    db = await freshDatabase();
    await addMember(db, { email: TECH.email, access: 'editor' });
    await addMember(db, { email: VIEWER.email, access: 'viewer', department: 'Customer Service' });
    await addMember(db, { email: ADMIN.email, access: 'admin', department: 'Exec' });
    await signInAs(db, TECH);
  }, 60000);

  const addLaptop = async (ref, extra = {}) => {
    const cols = { asset_ref: ref, device_type: 'Laptop', department: 'IT', cleaning_interval_months: 6, ...extra };
    const keys = Object.keys(cols);
    const [row] = await rows(
      db,
      `insert into public.assets (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
      Object.values(cols)
    );
    return row;
  };
  const logFor = (id) =>
    rows(db, `select cleaned_on::text, cleaned_by from public.cleaning_log where asset_id = $1 order by cleaned_on`, [id]);

  it('runs twice on the same database without error', () => {
    // freshDatabase applies it twice; reaching here is the test.
    expect(db).toBeTruthy();
  });

  it("works out today's date in the UK, not UTC", async () => {
    const [{ today }] = await rows(db, `select public.today_local()::text as today`);
    expect(today).toBe(londonToday());
  });

  it("accepts a clean dated today in the UK", async () => {
    const asset = await addLaptop('TZ-1', { date_cleaned: londonToday(), cleaned_by: 'AL' });
    expect(asset.date_cleaned).toBeTruthy();
  });

  it('correcting a clean fixes its log entry instead of adding another', async () => {
    const asset = await addLaptop('LOG-1', { date_cleaned: '2026-01-10', cleaned_by: 'AL' });
    await db.query(`update public.assets set date_cleaned = '2026-01-09' where id = $1`, [asset.id]);
    await db.query(`update public.assets set cleaned_by = 'BB' where id = $1`, [asset.id]);
    expect(await logFor(asset.id)).toEqual([{ cleaned_on: '2026-01-09', cleaned_by: 'BB' }]);
  });

  it('a later clean is a new entry in the log', async () => {
    const asset = await addLaptop('LOG-2', { date_cleaned: '2026-01-10', cleaned_by: 'AL' });
    await db.query(`update public.assets set date_cleaned = '2026-03-01', cleaned_by = 'BB' where id = $1`, [asset.id]);
    expect(await logFor(asset.id)).toEqual([
      { cleaned_on: '2026-01-10', cleaned_by: 'AL' },
      { cleaned_on: '2026-03-01', cleaned_by: 'BB' }
    ]);
  });

  it('clearing a clean removes it from the log', async () => {
    const asset = await addLaptop('LOG-3', { date_cleaned: '2026-01-10', cleaned_by: 'AL' });
    await db.query(`update public.assets set date_cleaned = null, cleaned_by = null where id = $1`, [asset.id]);
    expect(await logFor(asset.id)).toEqual([]);
  });

  it('editing something else does not touch the log', async () => {
    const asset = await addLaptop('LOG-4', { date_cleaned: '2026-01-10', cleaned_by: 'AL' });
    await db.query(`update public.assets set notes = 'new charger' where id = $1`, [asset.id]);
    expect(await logFor(asset.id)).toEqual([{ cleaned_on: '2026-01-10', cleaned_by: 'AL' }]);
  });

  it('refuses a clean dated in the future', async () => {
    await expect(addLaptop('FUT-1', { date_cleaned: '2999-01-01', cleaned_by: 'AL' })).rejects.toThrow(
      /cannot be in the future/
    );
  });

  it('stamps who changed an asset, whatever the client sends', async () => {
    const asset = await addLaptop('STAMP-1');
    await db.query(`update public.assets set updated_by_email = 'someone@else.com', version = 99 where id = $1`, [asset.id]);
    const [row] = await rows(db, `select updated_by_email, version from public.assets where id = $1`, [asset.id]);
    expect(row).toEqual({ updated_by_email: TECH.email, version: 2 });
  });

  describe('who can do what', () => {
    const count = async (user, sql) => {
      await signInAs(db, user);
      const result = await asUser(db, sql);
      await signInAs(db, TECH);
      return result.rows;
    };

    it('refuses sign-in accounts outside the company', async () => {
      await expect(
        db.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'someone@gmail.com')`)
      ).rejects.toThrow(/only for company accounts/);
    });

    it('never locks out an existing account when its row is saved again', async () => {
      await db.exec(`alter table auth.users disable trigger orbit_company_email_only`);
      await db.query(`insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000f00d', 'old@gmail.com')`);
      await db.exec(`alter table auth.users enable trigger orbit_company_email_only`);
      // A sign-in updates the row, email included but unchanged.
      await db.query(`update auth.users set email = email, last_sign_in_at = now() where email = 'old@gmail.com'`);
      await expect(
        db.query(`update auth.users set email = 'other@gmail.com' where email = 'old@gmail.com'`)
      ).rejects.toThrow(/only for company accounts/);
    });

    it('shows a signed-in company account that is not a member nothing at all', async () => {
      await addLaptop('SEEN-1');
      expect(await count(STRANGER, `select id from public.assets`)).toEqual([]);
      expect(await count(STRANGER, `select * from public.team_members()`)).toEqual([]);
    });

    it('lets a viewer read but not change anything', async () => {
      const asset = await addLaptop('VIEW-1');
      expect((await count(VIEWER, `select id from public.assets where asset_ref = 'VIEW-1'`)).length).toBe(1);
      await signInAs(db, VIEWER);
      const updated = await asUser(db, `update public.assets set notes = 'hacked' where id = '${asset.id}' returning id`);
      expect(updated.rows).toEqual([]);
      await expect(
        asUser(db, `insert into public.assets (asset_ref, device_type, department) values ('V-2', 'Laptop', 'IT')`)
      ).rejects.toThrow(/row-level security/);
      await signInAs(db, TECH);
    });

    it('lets an editor change kit but not delete it', async () => {
      const asset = await addLaptop('EDIT-1');
      await signInAs(db, TECH);
      const updated = await asUser(db, `update public.assets set notes = 'ok' where id = '${asset.id}' returning id`);
      expect(updated.rows).toHaveLength(1);
      const deleted = await asUser(db, `delete from public.assets where id = '${asset.id}' returning id`);
      expect(deleted.rows).toEqual([]);
    });

    it('lets only admins manage people, and keeps at least one admin', async () => {
      await signInAs(db, TECH);
      await expect(
        asUser(db, `insert into public.members (email, department, access) values ('x@adaro.net', 'Finance', 'admin')`)
      ).rejects.toThrow(/row-level security/);

      await signInAs(db, ADMIN);
      await asUser(db, `insert into public.members (email, department) values ('New.Person@adaro.net', 'Finance')`);
      const [added] = await rows(db, `select email, access from public.members where email = 'new.person@adaro.net'`);
      expect(added).toEqual({ email: 'new.person@adaro.net', access: 'viewer' });
      await expect(
        asUser(db, `insert into public.members (email, department) values ('friend@gmail.com', 'Finance')`)
      ).rejects.toThrow(/Only company email addresses/);
      await expect(
        asUser(db, `update public.members set access = 'editor' where email = '${ADMIN.email}'`)
      ).rejects.toThrow(/at least one admin/);
      await signInAs(db, TECH);
    });

    it('cuts someone off the moment they are switched off', async () => {
      await addLaptop('CUT-1');
      await addMember(db, { email: 'leaver@adaro.net', access: 'editor' });
      const leaver = { id: '00000000-0000-0000-0000-0000000000e5', email: 'leaver@adaro.net' };
      expect((await count(leaver, `select id from public.assets`)).length).toBeGreaterThan(0);
      await signOut(db);
      await db.query(`update public.members set active = false where email = 'leaver@adaro.net'`);
      expect(await count(leaver, `select id from public.assets`)).toEqual([]);
    });

    it('lets a non-member ask for access, and an admin see the request', async () => {
      await signInAs(db, STRANGER);
      const [{ request_access: result }] = (await asUser(db, `select public.request_access('New Starter')`)).rows;
      expect(result).toBe('requested');
      expect((await count(ADMIN, `select email from public.access_requests`)).map((r) => r.email)).toContain(STRANGER.email);
      expect(await count(VIEWER, `select email from public.access_requests`)).toEqual([]);
    });
  });

  describe('history', () => {
    it('records every changed field, with before and after', async () => {
      const asset = await addLaptop('HIST-1', { purchase_cost: 900 });
      await db.query(`update public.assets set purchase_cost = 850, serial_number = 'SN123' where id = $1`, [asset.id]);
      const [event] = await rows(
        db,
        `select details from public.asset_events where asset_id = $1 and event_type = 'edited'`,
        [asset.id]
      );
      expect(event.details.fields.purchase_cost).toEqual({ from: 900, to: 850 });
      expect(event.details.fields.serial_number).toEqual({ from: null, to: 'SN123' });
    });

    it('keeps a record of a deleted asset and who deleted it', async () => {
      const asset = await addLaptop('GONE-1');
      await db.query(`delete from public.assets where id = $1`, [asset.id]);
      const [event] = await rows(
        db,
        `select asset_ref, actor_email from public.asset_events where event_type = 'deleted' and asset_ref = 'GONE-1'`
      );
      expect(event).toEqual({ asset_ref: 'GONE-1', actor_email: TECH.email });
    });

    it('never takes "wiped by" from the browser', async () => {
      const asset = await addLaptop('WIPE-1');
      await db.query(
        `update public.assets set retired_on = '2026-01-01', retired_reason = 'End of life', data_wiped = true,
           data_wiped_by = null, data_wiped_by_email = 'someone.else@adaro.net' where id = $1`,
        [asset.id]
      );
      const [row] = await rows(db, `select data_wiped_by_email from public.assets where id = $1`, [asset.id]);
      expect(row.data_wiped_by_email).toBeNull();
    });
  });
});
