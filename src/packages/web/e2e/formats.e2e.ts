// #IoFormats #DuckDB: browser-level E2E for binary file loading. The Cucumber
// @web suite loads these formats through node-api in Node; only the real browser
// build exercises duckdb-wasm (Parquet, via registerFileBuffer) and apache-arrow
// (Arrow). Each format is loaded from its bundled sample via the Open URL dialog
// and a known cell is checked, proving the bytes parsed correctly client-side.
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173/TamedTable/app';

for (const { label, file } of [
  { label: 'Parquet', file: 'customers-input.parquet' },
  { label: 'Arrow', file: 'customers-input.arrow' },
]) {
  test(`${label} loads in the browser and renders the table`, async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-uk-menubtn]').first().click();
    await page.locator('[data-uk-menu-item="Open URL…"]').click();
    const dialog = page.locator('[data-tb-dialog]');
    await dialog.locator('[data-tb-url-input]').fill(`${BASE}/samples/${file}`);
    await dialog.getByRole('button', { name: 'Load' }).click();

    // Row 1 (0-indexed) is "Canada" in the fixture: a value parsed straight out
    // of the binary file, so a match proves the client-side reader worked.
    await expect(page.locator('[data-tv-cell="1:Country"]')).toHaveText('Canada', {
      timeout: 60_000,
    });
    await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');
  });
}

test('Save data writes a real Parquet in the browser (hyparquet-writer)', async ({ page }) => {
  // Drop the File System Access API so the save takes the download fallback,
  // which we can capture. (Loading here goes through the URL dialog, not the
  // file picker, so this doesn't affect the open path.)
  await page.addInitScript(() => {
    // BrowserFilePort.hasFileSystemAccess keys on showOpenFilePicker; removing it
    // forces the download fallback for both open and save.
    // @ts-expect-error - removing an optional browser API for the test
    delete window.showOpenFilePicker;
    // @ts-expect-error - removing an optional browser API for the test
    delete window.showSaveFilePicker;
  });
  await page.goto('/TamedTable/app/');
  // Load the Parquet sample.
  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Open URL…"]').click();
  const dialog = page.locator('[data-tb-dialog]');
  await dialog.locator('[data-tb-url-input]').fill(`${BASE}/samples/customers-input.parquet`);
  await dialog.getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('[data-tv-cell="1:Country"]')).toHaveText('Canada', { timeout: 60_000 });

  // Save Parquet: headless Chromium lacks the File System Access API, so this
  // takes the download fallback. Capture the bytes and check the Parquet magic.
  const dl = page.waitForEvent('download');
  await page.locator('[data-uk-menubtn]').nth(1).click();
  await page.locator('[data-uk-menu-item="Save Parquet…"]').click();
  const download = await dl;
  expect(download.suggestedFilename()).toMatch(/\.parquet$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const bytes = Buffer.concat(chunks);
  // A Parquet file starts and ends with the 4-byte "PAR1" magic.
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('PAR1');
  expect(bytes.subarray(-4).toString('latin1')).toBe('PAR1');
});
