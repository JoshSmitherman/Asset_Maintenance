import { test, expect } from '@playwright/test';
import { mockSupabase, signIn, gotoAssets } from './support.js';

test.describe('Hardware Maintenance Tracker — end to end (mocked Supabase)', () => {
  test('shows the login screen to an unauthenticated visitor', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /hardware maintenance tracker/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('signs in and lists assets with their computed status', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await signIn(page);

    // The login card is replaced by the app shell + data.
    await expect(page.getByText('LAP-001')).toBeVisible();
    await expect(page.getByText('DSK-010')).toBeVisible();
    // Overdue (past due date) and Never Cleaned (no clean record) both surface.
    await expect(page.getByText('Overdue').first()).toBeVisible();
    await expect(page.getByText('Never Cleaned').first()).toBeVisible();
  });

  test('add-asset form enforces required fields before submitting', async ({ page }) => {
    const state = await mockSupabase(page);
    await page.goto('/');
    await signIn(page);
    await gotoAssets(page);

    await page.getByRole('button', { name: /add asset/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Submitting the empty form shows validation and inserts nothing.
    await dialog.getByRole('button', { name: /add asset/i }).click();
    await expect(dialog.getByText('Asset Ref is required.')).toBeVisible();
    expect(state.inserted).toHaveLength(0);
  });

  test('creates a valid asset and posts it to the backend', async ({ page }) => {
    const state = await mockSupabase(page);
    await page.goto('/');
    await signIn(page);
    await gotoAssets(page);

    await page.getByRole('button', { name: /add asset/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/asset ref/i).fill('LAP-999');
    // User and Department are dropdowns of names already on the register, so a
    // new one arrives through "Add new".
    await dialog.getByLabel(/^user$/i).selectOption('__add_new__');
    await dialog.getByLabel(/^user$/i).fill('Dana');
    await dialog.getByLabel(/department/i).selectOption('__add_new__');
    await dialog.getByLabel(/department/i).fill('IT');

    // The specification lives on the second tab.
    await dialog.getByRole('tab', { name: /specification/i }).click();
    await dialog.getByLabel(/^ram$/i).selectOption('16 GB');
    await dialog.getByLabel(/^brand$/i).selectOption('Dell');

    await dialog.getByRole('button', { name: /add asset/i }).click();

    await expect.poll(() => state.inserted.length).toBe(1);
    expect(state.inserted[0]).toMatchObject({
      asset_ref: 'LAP-999',
      device_type: 'Laptop',
      owner_name: 'Dana',
      spec_ram: '16 GB',
      spec_brand: 'Dell'
    });
  });

  test('shows who has had an asset on its History tab', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await signIn(page);
    await gotoAssets(page);
    await page.getByRole('button', { name: /view details for LAP-001/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: /history/i }).click();
    await expect(dialog.getByRole('heading', { name: /who has had it/i })).toBeVisible();
    await expect(dialog.getByLabel(/^Carol,/)).toBeVisible();
    await expect(dialog.getByText('Assigned to Carol')).toBeVisible();
    await expect(dialog.getByText('Cleaned by AL')).toBeVisible();
  });

  test('only an admin sees the Admin page and its accounts', async ({ page }) => {
    await mockSupabase(page, { role: 'admin' });
    await page.goto('/');
    await signIn(page);
    const nav = page.getByRole('navigation', { name: /sections/i });
    await nav.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByRole('cell', { name: 'colleague@example.com', exact: true })).toBeVisible();
  });

  test('a plain user has no Admin page', async ({ page }) => {
    await mockSupabase(page, { role: 'user' });
    await page.goto('/');
    await signIn(page);
    const nav = page.getByRole('navigation', { name: /sections/i });
    await expect(nav.getByRole('button', { name: 'Reports' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Admin' })).toHaveCount(0);
  });

  test('the version in the header opens the release notes', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await signIn(page);
    await page.getByRole('button', { name: /release notes/i }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Release Notes' })).toBeVisible();
    await page.getByLabel('Version', { exact: true }).selectOption('2.0.0');
    await expect(page.getByText('Bulk Actions, Cleaning History & Reports')).toBeVisible();
  });

  test('an asset link signs in, then opens that asset', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/?asset=lap-001');
    await signIn(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'LAP-001' })).toBeVisible();
    await expect(dialog.getByText(/\?asset=LAP-001/)).toBeVisible();
  });
});
