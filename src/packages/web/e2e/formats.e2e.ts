// #IoFormats #DuckDB — browser-level E2E for binary file loading. The Cucumber
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
    await page.locator('button[title="Open a CSV or JSONL file from a URL"]').click();
    const dialog = page.locator('[data-tb-dialog]');
    await dialog.locator('[data-tb-url-input]').fill(`${BASE}/samples/${file}`);
    await dialog.getByRole('button', { name: 'Load' }).click();

    // Row 1 (0-indexed) is "Canada" in the fixture — a value parsed straight out
    // of the binary file, so a match proves the client-side reader worked.
    await expect(page.locator('[data-tv-cell="1:Country"]')).toHaveText('Canada', {
      timeout: 60_000,
    });
    await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');
  });
}
