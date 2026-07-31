// #WebUI — browser-driven happy-path journeys against the PRODUCTION build.
// These complement the tutorial/mobile/formats/sql specs by covering the
// Open / Save / Grid / Undo-redo / Settings surfaces end to end with real
// clicks, typing, and drags — the layer the DOM-less @web Cucumber profile
// cannot exercise. Everything here is expected to PASS; the bug inventory
// lives under e2e/red/.
import { test, expect, type Page } from '@playwright/test';

async function boot(page: Page): Promise<void> {
  await page.goto('/TamedTable/app/');
  await page.getByRole('button', { name: 'Tours', exact: true }).waitFor();
}
async function loadSample(page: Page, name: string): Promise<void> {
  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Open sample…"]').click();
  const picker = page.locator('[data-tb-sample-dialog]');
  await picker.waitFor();
  await picker.locator('[data-tb-sample]', { hasText: name }).first().click();
  await page.locator('[data-tv-cell]').first().waitFor({ timeout: 30_000 });
}
async function editCell(page: Page, cell: string, value: string): Promise<void> {
  await page.locator(`[data-tv-cell="${cell}"]`).dblclick();
  const input = page.locator('[data-tv-edit]');
  await input.waitFor();
  await input.fill(value);
  await input.press('Enter');
}
function undo(page: Page) { return page.getByRole('button', { name: /Undo/ }); }
function redo(page: Page) { return page.getByRole('button', { name: /Redo/ }); }
async function openColMenu(page: Page, col: string): Promise<void> {
  await page.locator(`[data-tv-menu="${col}"]`).click();
}

// ── Open ─────────────────────────────────────────────────────────────────
test.describe('Open', () => {
  test('the empty page offers the three open actions and the Tours link', async ({ page }) => {
    await boot(page);
    await expect(page.getByText('What table can I tame?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open sample…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open local…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open URL…' })).toBeVisible();
    await expect(page.getByText(/New here\? Check Tours/i)).toBeVisible();
  });

  test('a sample loads and starts a fresh thread', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await expect(page.locator('[data-cp-message]')).toHaveText(/Loaded customers-input\.csv — 20 rows, 6 columns\./);
  });

  test('opening a second table replaces the first and resets the thread', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await editCell(page, '0:Country', 'ZZZ');
    await loadSample(page, 'companies.csv');
    // A single message: the new load's line, nothing carried over.
    await expect(page.locator('[data-cp-message]')).toHaveText(/Loaded companies\.csv/);
    await expect(undo(page)).toBeDisabled();
  });

  test('a large file raises the sample dialog and paginates', async ({ page }) => {
    await boot(page);
    await page.locator('[data-uk-menubtn]').first().click();
    await page.locator('[data-uk-menu-item="Open sample…"]').click();
    await page.locator('[data-tb-sample-dialog]').waitFor();
    await page.locator('[data-tb-sample]', { hasText: 'performance-liked-videos.csv' }).first().click();
    const lf = page.locator('[data-tt-largefile-dialog]');
    await lf.waitFor();
    await lf.getByRole('button', { name: /original order/i }).click();
    await page.locator('[data-tv-cell]').first().waitFor({ timeout: 30_000 });
    // Page two starts at absolute row 100 (100-row pages).
    await page.locator('[data-tv-page="2"]').click();
    await expect(page.locator('[data-tv-cell]').first()).toHaveAttribute('data-tv-cell', /^100:/);
  });

  test('a sample opened from the picker appears in Recent immediately', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    // No reload: the just-opened sample is a successful load, so the menu must
    // already list it (the picker fires no notify of its own after the record).
    await page.locator('[data-uk-menubtn]').first().click();
    await page.locator('[data-uk-menu-item="Recent"]').hover();
    await expect(page.locator('[data-uk-menu-item]', { hasText: 'customers-input.csv' })).toBeVisible();
  });

  test('Recent lists a loaded sample after a reload', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await page.reload();
    await page.getByRole('button', { name: 'Tours', exact: true }).waitFor();
    await page.locator('[data-uk-menubtn]').first().click();
    await page.locator('[data-uk-menu-item="Recent"]').hover();
    await expect(page.locator('[data-uk-menu-item]', { hasText: 'customers-input.csv' })).toBeVisible();
  });
});

// ── Flow replay ──────────────────────────────────────────────────────────
test.describe('Flow replay', () => {
  test('a completed replay replies like a chat request, Report bug included', async ({ page }) => {
    // Force the <input type=file> fallback so the .flow picker is a filechooser.
    await page.addInitScript(() => {
      // @ts-expect-error optional browser API
      delete window.showOpenFilePicker;
    });
    await boot(page);
    await loadSample(page, 'customers-input.csv');

    // A deterministic recipe: a filter on the sample's own Country column.
    const flow = JSON.stringify({
      version: 2,
      source: 'customers-input.csv',
      spec: {
        table: 'customers-input.csv',
        columns: [{ id: 'ID' }, { id: 'Country' }],
        transformations: [{ kind: 'filter', pred: { js: "row.Country === 'USA'" } }],
      },
    });
    page.once('filechooser', async (fc) => {
      await fc.setFiles({ name: 'filter-usa.flow', mimeType: 'application/json', buffer: Buffer.from(flow) });
    });
    await page.locator('[data-uk-menubtn]').first().click();
    await page.locator('[data-uk-menu-item="Open .flow & run on current data…"]').click();

    const reply = page.locator('[data-cp-message="assistant"]', { hasText: 'Executed steps:' });
    await expect(reply).toBeVisible({ timeout: 15_000 });
    // A replay is a completed request, so its reply offers Report bug. The
    // action row sits beside the bubble, not inside it — scope to the block.
    await expect(reply.locator('xpath=..').locator('[data-cp-report]')).toBeVisible();
  });
});

// ── Save ─────────────────────────────────────────────────────────────────
test.describe('Save', () => {
  test.use({});
  test('Save is disabled until a table is loaded', async ({ page }) => {
    await boot(page);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await loadSample(page, 'customers-input.csv');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  });

  test('each format suggests the source stem plus its extension', async ({ page }) => {
    await page.addInitScript(() => {
      // Force the download fallback so the suggested name is observable.
      // @ts-expect-error optional browser API
      delete window.showOpenFilePicker;
      // @ts-expect-error optional browser API
      delete window.showSaveFilePicker;
    });
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    for (const [item, ext] of [['Save JSONL…', 'customers-input.jsonl'], ['Save CSV…', 'customers-input.csv']] as const) {
      const dl = page.waitForEvent('download');
      await page.locator('[data-uk-menubtn]').nth(1).click();
      await page.locator(`[data-uk-menu-item="${item}"]`).click();
      expect((await dl).suggestedFilename()).toBe(ext);
    }
  });

  test('Save as Python without a key refuses with a provider-named message', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await page.locator('[data-uk-menubtn]').nth(1).click();
    await page.locator('[data-uk-menu-item="Save recipe as Python…"]').click();
    await expect(page.getByText(/requires a Google API key/i)).toBeVisible();
  });
});

// ── Grid ─────────────────────────────────────────────────────────────────
test.describe('Grid', () => {
  test('inline edit is undoable and redoable', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await editCell(page, '0:Country', 'EDITED');
    await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('EDITED');
    await undo(page).click();
    await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');
    await redo(page).click();
    await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('EDITED');
  });

  test('an inline edit tints the cell and shows its was: tooltip at once', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    const cell = page.locator('[data-tv-cell="0:Country"]');
    await editCell(page, '0:Country', 'MARKME');
    await expect(cell).toHaveText('MARKME');
    // No other interaction may be needed to reveal the mark.
    await expect(cell).toHaveAttribute('data-tv-changed', '');
    await expect(cell).toHaveAttribute('title', /was: USA/);
  });

  // Regression 2026-07-31: the drop-target wrapper made the grid a
  // column-flex item, and without min-height: 0 a full page of rows grew the
  // document instead of scrolling inside the grid — the pagination bar sat
  // below the table, off screen (spec/packages/table-view/behavior.md).
  test('a full page of rows scrolls inside the grid — the pagination bar stays on screen', async ({ page }) => {
    await boot(page);
    await page.locator('[data-uk-menubtn]').first().click();
    await page.locator('[data-uk-menu-item="Open sample…"]').click();
    await page.locator('[data-tb-sample-dialog]').waitFor();
    await page.locator('[data-tb-sample]', { hasText: 'performance-liked-videos.csv' }).first().click();
    const lf = page.locator('[data-tt-largefile-dialog]');
    await lf.waitFor();
    await lf.getByRole('button', { name: /original order/i }).click();
    await page.locator('[data-tv-cell]').first().waitFor({ timeout: 30_000 });
    await expect(page.locator('[data-tv-range]')).toBeInViewport();
    const doc = await page.evaluate(() => ({
      scrollHeight: document.scrollingElement!.scrollHeight,
      clientHeight: document.scrollingElement!.clientHeight,
    }));
    expect(doc.scrollHeight).toBe(doc.clientHeight);
  });

  test('column drag-reorder is undoable', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    const order = () => page.locator('[data-tv-header]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tv-header')));
    expect(await order()).toEqual(['ID', 'FirstName', 'LastName', 'DOB', 'Country', 'Phone']);
    const h0 = await page.locator('[data-tv-header="ID"]').boundingBox();
    const h1 = await page.locator('[data-tv-header="FirstName"]').boundingBox();
    if (h0 && h1) {
      await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2);
      await page.mouse.down();
      await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2 + 3, { steps: 2 });
      await page.mouse.move(h0.x + 4, h0.y + h0.height / 2, { steps: 10 });
      await page.mouse.up();
    }
    await expect.poll(order).toEqual(['FirstName', 'ID', 'LastName', 'DOB', 'Country', 'Phone']);
    await undo(page).click();
    await expect.poll(order).toEqual(['ID', 'FirstName', 'LastName', 'DOB', 'Country', 'Phone']);
  });

  test('column resize changes nothing in history (view-only)', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await expect(undo(page)).toBeDisabled();
    const rz = page.locator('[data-tv-resize="Country"]').first();
    const b = await rz.boundingBox();
    if (b) {
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 60, b.y + b.height / 2, { steps: 6 });
      await page.mouse.up();
    }
    await expect(undo(page)).toBeDisabled();
  });

  test('filter narrows rows and survives an edit + undo (view state)', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    const countryCells = page.locator('[data-tv-cell$=":Country"]');
    await expect(countryCells).toHaveCount(20);
    await openColMenu(page, 'Country');
    await page.locator('[data-tv-menu-item="filter"]').click();
    const fi = page.locator('[data-tv-filter-input]');
    await fi.fill('USA');
    await fi.press('Enter');
    await expect(countryCells).toHaveCount(3);
    await expect(page.locator('[data-tv-filter-mark="Country"]')).toBeVisible();
    // Edit a still-visible cell, then undo — the view filter must persist.
    const firstPhone = (await page.locator('[data-tv-cell$=":Phone"]').first().getAttribute('data-tv-cell'))!;
    await editCell(page, firstPhone, '000');
    await undo(page).click();
    await expect(countryCells).toHaveCount(3);
    // Remove filter restores every row.
    await openColMenu(page, 'Country');
    await page.locator('[data-tv-menu-item="remove-filter"]').click();
    await expect(countryCells).toHaveCount(20);
  });

  test('delete column is a spec step: undoable and redoable', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    const order = () => page.locator('[data-tv-header]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tv-header')));
    await openColMenu(page, 'DOB');
    await page.locator('[data-tv-menu-item="delete"]').click();
    await expect.poll(order).toEqual(['ID', 'FirstName', 'LastName', 'Country', 'Phone']);
    await undo(page).click();
    await expect.poll(order).toEqual(['ID', 'FirstName', 'LastName', 'DOB', 'Country', 'Phone']);
    await redo(page).click();
    await expect.poll(order).toEqual(['ID', 'FirstName', 'LastName', 'Country', 'Phone']);
  });
});

// ── Settings ────────────────────────────────────────────────────────────
test.describe('Settings', () => {
  test('switching provider keeps the table on screen and confirms with a badge', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Anthropic', { exact: false }).first().click();
    await expect(page.getByText(/Saved/)).toBeVisible();
    await page.getByText('Close', { exact: true }).click();
    // The table is preserved across the model-switch rebuild.
    await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');
  });

  test('the Saved badge clears when the panel is reopened', async ({ page }) => {
    await boot(page);
    await loadSample(page, 'customers-input.csv');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Anthropic', { exact: false }).first().click();
    await expect(page.getByText(/Saved/)).toBeVisible();
    await page.getByText('Close', { exact: true }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText(/Saved/)).toHaveCount(0);
  });
});
