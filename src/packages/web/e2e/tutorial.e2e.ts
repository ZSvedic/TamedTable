// #TutorialMode — browser-level E2E tests for the Tours panel.
// These catch UI bugs (z-index, Driver.js interactions) that the Cucumber
// @web suite cannot see because it drives WebController directly, no DOM.
import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/TamedTable/app/');
  await page.getByRole('button', { name: 'Tours' }).waitFor();
});

/** Scoped to the TutorialPanel element so Driver.js popover text doesn't collide. */
function panel(page: Page) {
  return page.getByTestId('tutorial-panel');
}

/** Open the Tours panel and click a tour — clicking an option starts it. */
async function startTour(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name: 'Tours' }).click();
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
  await page.getByRole('button', { name: 'Tours' }).click();
  const p = panel(page);
  await expect(p.getByRole('option', { name: 'Filter by Country' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Count customers per country' })).toBeAttached();
  await expect(p.getByRole('option', { name: /Left join/ })).toBeAttached();
  await expect(p.getByRole('option', { name: /Split FullName/ })).toBeAttached();
  await expect(p.getByRole('option', { name: /Drop duplicates/ })).toBeAttached();
});

test('clicking a tour starts it at the first stop', async ({ page }) => {
  await startTour(page, 'Filter by Country');
  // Filter by Country: load → query → terminal = 3 stops.
  await expect(progress(page)).toHaveText('1 of 3');
});

test('Next advances to the second stop', async ({ page }) => {
  await startTour(page, 'Filter by Country');
  await expect(progress(page)).toHaveText('1 of 3');

  await nextBtn(page).click();

  await expect(progress(page)).toHaveText('2 of 3');
  // There is no Previous button — the tour only moves forward.
  await expect(page.locator('.driver-popover-prev-btn')).toBeHidden();
});

test('Next works for the Left join tour', async ({ page }) => {
  await startTour(page, /Left join/);
  // Left join: load → query → terminal = 3 stops (the lookup fixture loads
  // implicitly with the query; verification steps are dropped).
  await expect(progress(page)).toHaveText('1 of 3');

  await nextBtn(page).click();

  await expect(progress(page)).toHaveText('2 of 3');
});

test('Cancel exits the tour and starting it again restarts it', async ({ page }) => {
  await startTour(page, 'Filter by Country');
  await expect(progress(page)).toHaveText('1 of 3');

  // Esc cancels the tour (Driver.js default). The popover goes away and the
  // app returns to the empty state — the panel reopens only on Finish/Done.
  await page.keyboard.press('Escape');
  await expect(page.locator('.driver-popover')).toBeHidden();

  // Starting the tour again restarts from the first stop.
  await startTour(page, 'Filter by Country');
  await expect(progress(page)).toHaveText('1 of 3');
});

test('Arrow-right advances; there is no ← key', async ({ page }) => {
  await startTour(page, 'Filter by Country');
  await expect(progress(page)).toHaveText('1 of 3');

  await page.keyboard.press('ArrowRight');
  await expect(progress(page)).toHaveText('2 of 3');

  // ← does nothing: the tour never steps back.
  await page.keyboard.press('ArrowLeft');
  await expect(progress(page)).toHaveText('2 of 3');
});

test('Escape key cancels the tour', async ({ page }) => {
  await startTour(page, 'Filter by Country');
  await expect(progress(page)).toHaveText('1 of 3');

  await page.keyboard.press('Escape');
  await expect(page.locator('.driver-popover')).toBeHidden();
  // The tour owned the engine, so cancelling returns to the empty state.
  await expect(page.getByText('What table can I tame?')).toBeVisible();
});
