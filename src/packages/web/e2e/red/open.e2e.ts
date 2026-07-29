// #FileIO #RedInventory — BUG INVENTORY (expected to FAIL). Do not fix here.
//
// A sample opened from the Open ▸ "Open sample…" picker does not appear in the
// Open ▸ Recent submenu until the page is reloaded (or another file is opened).
// The URL, local-file, and drag-and-drop load paths add the file to Recent
// immediately; only the sample-picker path lags one load behind.
//
// Suspected cause (a guess): src/packages/web/src/controller-files.ts:326 —
// loadFromUrl() calls recentsStore.record() AFTER loadFromPicked() has already
// fired its last notify() (inside commitParsed), and no notify() follows the
// record. The sample picker (OpenSampleDialog) calls onPick(url) fire-and-forget
// then onClose() synchronously, so the only notify after the click lands before
// the async record — React never re-renders the menu with the new entry.
// openCsv/openDropped/openFlow all notify() in a finally AFTER record(), so they
// are fine.
//
// Spec (spec/behavior.md § Web UI): the Recent entry opens "a side panel beside
// the menu listing the last 5 successful loads, newest first". The file the user
// just opened is a successful load and must be listed.
import { test, expect } from '@playwright/test';

test('a sample opened from the picker appears in Recent immediately', async ({ page }) => {
  await page.goto('/TamedTable/app/');
  await page.getByRole('button', { name: 'Tours', exact: true }).waitFor();

  // Open a bundled sample through Open ▸ "Open sample…" → the sample picker.
  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Open sample…"]').click();
  const picker = page.locator('[data-tb-sample-dialog]');
  await picker.waitFor();
  await picker.locator('[data-tb-sample]', { hasText: 'customers-input.csv' }).first().click();
  await page.locator('[data-tv-cell]').first().waitFor({ timeout: 30_000 });

  // Without any reload, the just-opened sample must show under Open ▸ Recent.
  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Recent"]').hover();
  await expect(
    page.locator('[data-uk-menu-item]', { hasText: 'customers-input.csv' }),
  ).toBeVisible({ timeout: 3_000 });
});
