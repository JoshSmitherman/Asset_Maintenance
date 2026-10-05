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

  test('a plain user retires a laptop instead of deleting it', async ({ page }) => {
    const state = await mockSupabase(page, { role: 'user' });
    await page.goto('/');
    await signIn(page);
    await gotoAssets(page);
    await page.getByRole('button', { name: /view details for LAP-001/i }).click();

    const dialog = page.getByRole('dialog');
    // Deleting is for admins; everyone else retires.
    await expect(dialog.getByRole('button', { name: /delete asset/i })).toHaveCount(0);
    await dialog.getByRole('button', { name: /^retire$/i }).click();

    const retire = page.getByRole('dialog');
    await retire.getByLabel(/reason/i).selectOption('Beyond repair');
    await retire.getByLabel(/data has been wiped/i).check();
    await retire.getByLabel(/wiped by/i).selectOption('user-456');
    await retire.getByRole('button', { name: /retire asset/i }).click();

    await expect(page.getByText(/LAP-001 retired/)).toBeVisible();
    expect(state.assets.find((asset) => asset.id === 'a1')).toMatchObject({
      retired_reason: 'Beyond repair',
      data_wiped: true,
      data_wiped_by: 'user-456'
    });

    // Off the register, kept under Retired.
    await expect(page.getByRole('button', { name: /view details for LAP-001/i })).toHaveCount(0);
    await page.getByRole('button', { name: /^show$/i }).click();
    await expect(page.getByRole('cell', { name: 'LAP-001', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Beyond repair', exact: true })).toBeVisible();
  });

  test('logs an in-house repair with itemised parts and a receipt', async ({ page }) => {
    const state = await mockSupabase(page, { role: 'user' });
    await page.goto('/');
    await signIn(page);
    await gotoAssets(page);
    await page.getByRole('button', { name: /view details for LAP-001/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: /repairs/i }).click();
    await expect(dialog.getByText('No repairs recorded.')).toBeVisible();
    await dialog.getByRole('button', { name: /log a repair/i }).click();

    // Fixed by whoever logs it, unless changed.
    await expect(dialog.getByLabel(/fixed by/i)).toHaveValue('user-123');
    await dialog.getByLabel(/what was wrong/i).fill('Battery would not hold charge');
    await dialog.getByLabel(/^part 1$/i).fill('Battery');
    await dialog.getByLabel(/cost of part 1/i).fill('45.50');
    await dialog.getByRole('button', { name: /add a part/i }).click();
    await dialog.getByLabel(/^part 2$/i).fill('Screws');
    await dialog.getByLabel(/cost of part 2/i).fill('1.20');
    await expect(dialog.getByText('£46.70')).toBeVisible();
    await dialog.getByRole('button', { name: /^log repair$/i }).click();

    await expect(dialog.getByText(/1 repair · £46\.70 spent on parts/)).toBeVisible();
    expect(state.repairs[0]).toMatchObject({
      asset_id: 'a1',
      fault: 'Battery would not hold charge',
      fixed_by: 'user-123',
      parts: [{ part: 'Battery', cost: 45.5 }, { part: 'Screws', cost: 1.2 }]
    });

    // A receipt on the repair itself.
    await dialog.locator('.repair input[type="file"]').setInputFiles({
      name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 receipt')
    });
    await expect(dialog.getByRole('button', { name: 'receipt.pdf', exact: true })).toBeVisible();
    expect(state.uploads[0]).toMatch(/^a1\/repairs\/rep-1\/.+-receipt\.pdf$/);
    expect(state.attachments[0]).toMatchObject({ asset_id: 'a1', repair_id: 'rep-1', file_name: 'receipt.pdf' });
  });

  test('attaches an invoice to the asset, and refuses a program', async ({ page }) => {
    const state = await mockSupabase(page, { role: 'user' });
    await page.goto('/');
    await signIn(page);
    await gotoAssets(page);
    await page.getByRole('button', { name: /view details for LAP-001/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: /files/i }).click();
    const input = dialog.locator('input[type="file"]');

    await input.setInputFiles({ name: 'setup.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
    await expect(dialog.getByRole('alert')).toContainText(/not a photo or a PDF/);
    expect(state.uploads).toHaveLength(0);

    await input.setInputFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    await expect(dialog.getByRole('button', { name: 'invoice.pdf', exact: true })).toBeVisible();
    expect(state.uploads[0]).toMatch(/^a1\/[^/]+-invoice\.pdf$/);
  });

  test('an admin can delete; the delete reaches the database', async ({ page }) => {
    const state = await mockSupabase(page, { role: 'admin' });
    await page.goto('/');
    await signIn(page);
    await gotoAssets(page);
    await page.getByRole('button', { name: /view details for DSK-010/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete asset/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete asset/i }).click();

    await expect(page.getByText(/DSK-010 deleted/)).toBeVisible();
    expect(state.assets.map((asset) => asset.id)).toEqual(['a1']);
  });

  test('reports what one person holds', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await signIn(page);
    await page.getByRole('navigation', { name: /sections/i }).getByRole('button', { name: 'Reports' }).click();
    await page.getByRole('navigation', { name: /reports/i }).getByRole('button', { name: /^by person/i }).click();

    await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Bob' })).toBeVisible();
    await page.getByLabel(/^person$/i).selectOption('Bob');
    await expect(page.getByRole('cell', { name: 'DSK-010', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'LAP-001', exact: true })).toHaveCount(0);
  });

  test('a starred report is remembered, and the page opens on it', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await signIn(page);
    const sections = page.getByRole('navigation', { name: /sections/i });
    await sections.getByRole('button', { name: 'Reports' }).click();

    const menu = page.getByRole('navigation', { name: /^reports$/i });
    await menu.getByRole('button', { name: /add ‘due this month’ to favourites/i }).click();
    await expect(menu.getByRole('heading', { name: 'Favourites' })).toBeVisible();

    await page.reload();
    await sections.getByRole('button', { name: 'Reports' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Due this month' })).toBeVisible();
    await expect(menu.getByRole('button', { name: /remove ‘due this month’ from favourites/i }).first())
      .toHaveAttribute('aria-pressed', 'true');
  });
});

