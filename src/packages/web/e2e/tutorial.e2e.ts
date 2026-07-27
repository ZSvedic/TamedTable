// #TutorialMode — browser-level E2E tests for the Tours panel.
// These catch UI bugs (z-index, Driver.js interactions) that the Cucumber
// @web suite cannot see because it drives WebController directly, no DOM.
import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/TamedTable/app/');
  await page.getByRole('button', { name: 'Tours', exact: true }).waitFor();
});

/** Scoped to the TutorialPanel element so Driver.js popover text doesn't collide. */
function panel(page: Page) {
  return page.getByTestId('tutorial-panel');
}

/** Open the Tours panel and click a tour — clicking an option starts it. */
async function startTour(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name: 'Tours', exact: true }).click();
  await panel(page).getByRole('option', { name }).click();
}

/** The tour runs in the shared gherkin-tour popover (the slide-over panel is
 *  closed during a tour). Driver.js's own footer holds the progress text and a
 *  single forward button — Next on a step, Done on the terminal stop. There is
 *  no Previous button. */
function progress(page: Page) {
  return page.locator('.driver-popover-progress-text');
}
function nextBtn(page: Page) {
  return page.locator('.driver-popover-next-btn');
}

test('Tours button opens the panel with scenario names', async ({ page }) => {
  await page.getByRole('button', { name: 'Tours', exact: true }).click();
  const p = panel(page);
  // One showcase tour per homepage section (Load/save has none).
  await expect(p.getByRole('option', { name: 'Clean 25,000 rows for cents' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Clean up a messy customer list' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Enrich a purchase ledger' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Classify a support inbox' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Audit an order sheet' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Handle feedback in five languages' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Shape a quarterly sales report' })).toBeAttached();
});

test('clicking a tour starts it at the first stop', async ({ page }) => {
  await startTour(page, 'Clean up a messy customer list');
  // Clean up showcase: load → 4 queries → terminal = 6 stops.
  await expect(progress(page)).toHaveText('1 of 6');
});

test('Next advances to the second stop', async ({ page }) => {
  await startTour(page, 'Clean up a messy customer list');
  await expect(progress(page)).toHaveText('1 of 6');

  await nextBtn(page).click();

  await expect(progress(page)).toHaveText('2 of 6');
  // There is no Previous button — the tour only moves forward.
  await expect(page.locator('.driver-popover-prev-btn')).toBeHidden();
});

test('Next works for the tour with a hidden lookup step', async ({ page }) => {
  await startTour(page, 'Shape a quarterly sales report');
  // Be exact showcase: load → 5 queries → terminal = 7 stops (the lookup
  // fixture loads implicitly before the tour; verification steps are dropped).
  await expect(progress(page)).toHaveText('1 of 7');

  await nextBtn(page).click();

  await expect(progress(page)).toHaveText('2 of 7');
});

test('the voice showcase tour replays whole, key-free', async ({ page }) => {
  await startTour(page, 'Handle feedback in five languages');
  // Process language showcase: load → voice → 4 queries → terminal = 7 stops.
  // The voice step plays its clip before the request fires; each later stop
  // waits for the previous replayed request, so the walk is click → assert.
  await expect(progress(page)).toHaveText('1 of 7');
  for (let n = 2; n <= 7; n++) {
    await nextBtn(page).click();
    await expect(progress(page)).toHaveText(`${n} of 7`, { timeout: 20_000 });
  }
  await expect(page.locator('.driver-popover')).toContainText('Voilà');
});

// #LazyExec — the Lazy AI execution tour: load the 25k-row sample, take the
// shuffled one-click load, preview a page, show the estimate dialog, and
// decline it with "Not yet" — nothing runs, all key-free from the cassette,
// and the tour ends with no dialog left open.
test('the Lazy AI execution tour replays whole, key-free', async ({ page }) => {
  await startTour(page, 'Clean 25,000 rows for cents');
  // Lazy showcase: load → load-shuffled → query → open-estimate →
  // decline-estimate = 5 stops + terminal = 6. Each stop's action fires on
  // the Next that leaves it.
  await expect(progress(page)).toHaveText('1 of 6');
  await nextBtn(page).click(); // load → the large-file dialog appears
  await expect(progress(page)).toHaveText('2 of 6', { timeout: 20_000 });
  await expect(page.locator('[data-tt-largefile-dialog]')).toBeVisible();
  await nextBtn(page).click(); // load-shuffled resolves it
  await expect(progress(page)).toHaveText('3 of 6', { timeout: 20_000 });
  await nextBtn(page).click(); // the AI step previews the visible page
  await expect(progress(page)).toHaveText('4 of 6', { timeout: 60_000 });
  // The readout appears once the page has evaluated from the cassette.
  await expect(page.locator('[data-tt-readout]')).toContainText('of 25,000 rows evaluated', { timeout: 30_000 });
  await nextBtn(page).click(); // open-estimate raises the dialog
  await expect(progress(page)).toHaveText('5 of 6', { timeout: 20_000 });
  await expect(page.locator('[data-tt-runall-dialog]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-tt-est-rows]')).toContainText('24,900');
  await nextBtn(page).click(); // decline-estimate closes it — the finale
  await expect(progress(page)).toHaveText('6 of 6', { timeout: 20_000 });
  await expect(page.locator('[data-tt-runall-dialog]')).toBeHidden();
  await expect(page.locator('.driver-popover')).toContainText('Voilà');
});

test('Cancel exits the tour and starting it again restarts it', async ({ page }) => {
  await startTour(page, 'Clean up a messy customer list');
  await expect(progress(page)).toHaveText('1 of 6');

  // Esc cancels the tour (Driver.js default). The popover goes away and the
  // app returns to the empty state — the panel reopens only on Finish/Done.
  await page.keyboard.press('Escape');
  await expect(page.locator('.driver-popover')).toBeHidden();

  // Starting the tour again restarts from the first stop.
  await startTour(page, 'Clean up a messy customer list');
  await expect(progress(page)).toHaveText('1 of 6');
});

test('Arrow-right advances; there is no ← key', async ({ page }) => {
  await startTour(page, 'Clean up a messy customer list');
  await expect(progress(page)).toHaveText('1 of 6');

  await page.keyboard.press('ArrowRight');
  await expect(progress(page)).toHaveText('2 of 6');

  // ← does nothing: the tour never steps back.
  await page.keyboard.press('ArrowLeft');
  await expect(progress(page)).toHaveText('2 of 6');
});

test('Escape key cancels the tour', async ({ page }) => {
  await startTour(page, 'Clean up a messy customer list');
  await expect(progress(page)).toHaveText('1 of 6');

  await page.keyboard.press('Escape');
  await expect(page.locator('.driver-popover')).toBeHidden();
  // The tour owned the engine, so cancelling returns to the empty state.
  await expect(page.getByText('What table can I tame?')).toBeVisible();
});
