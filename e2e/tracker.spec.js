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
    await dialog.getByLabel(/^user$/i).fill('Dana');
    await dialog.getByLabel(/department/i).fill('IT');
    await dialog.getByRole('button', { name: /add asset/i }).click();

    await expect.poll(() => state.inserted.length).toBe(1);
    expect(state.inserted[0]).toMatchObject({ asset_ref: 'LAP-999', device_type: 'Laptop', owner_name: 'Dana' });
  });
});
