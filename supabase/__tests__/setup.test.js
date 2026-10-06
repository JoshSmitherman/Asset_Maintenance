import { beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, rows, signInAs } from './harness';

const TECH = { id: '00000000-0000-0000-0000-0000000000a1', email: 'tech@example.com' };

/** The date in the UK right now, as the database should see it. */
function londonToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
}

describe('setup.sql', () => {
  let db;
  beforeAll(async () => {
    db = await freshDatabase();
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
});
