// #TutorialMode — browser-level E2E tests for the Tutorial panel.
// These catch UI bugs (z-index, Driver.js interactions) that the Cucumber
// @web suite cannot see because it drives WebController directly, no DOM.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/TamedTable/app/');
  await page.getByRole('button', { name: 'Tutorial' }).waitFor();
});

/** Scoped to the TutorialPanel element so Driver.js popover text doesn't collide. */
function panel(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  return page.getByTestId('tutorial-panel');
}

/** The tour runs in the shared gherkin-tour popover (the slide-over panel is
 *  closed during a tour). Driver.js's own footer holds the progress text and a
 *  single forward button — Next on a step, Done on the terminal stop. There is
 *  no Previous button. */
function progress(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  return page.locator('.driver-popover-progress-text');
}
function nextBtn(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  return page.locator('.driver-popover-next-btn');
}

test('Tutorial button opens the panel with scenario names', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  const p = panel(page);
  await expect(p.getByRole('option', { name: 'Filter by Country' })).toBeAttached();
  await expect(p.getByRole('option', { name: 'Count customers per country' })).toBeAttached();
  await expect(p.getByRole('option', { name: /Left join/ })).toBeAttached();
  await expect(p.getByRole('option', { name: /Split FullName/ })).toBeAttached();
  await expect(p.getByRole('option', { name: /Drop duplicates/ })).toBeAttached();
});

test('Play starts at the first stop', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  // Filter by Country: load → query → terminal = 3 stops.
  await expect(progress(page)).toHaveText('1 of 3');
});

test('Next advances to the second stop', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(progress(page)).toHaveText('1 of 3');

  await nextBtn(page).click();

  await expect(progress(page)).toHaveText('2 of 3');
  // There is no Previous button — the tour only moves forward.
  await expect(page.locator('.driver-popover-prev-btn')).toBeHidden();
});

test('Next works for the Left join tutorial', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Left join enriches each customer with ISO and Region');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  // Left join: load → load-lookup → query → terminal = 4 stops.
  await expect(progress(page)).toHaveText('1 of 4');

  await nextBtn(page).click();

  await expect(progress(page)).toHaveText('2 of 4');
});

test('Cancel exits the tour and Play restarts it', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(progress(page)).toHaveText('1 of 3');

  // Esc cancels the tour (Driver.js default); the panel returns to the picker.
  await page.keyboard.press('Escape');
  await expect(panel(page).getByRole('button', { name: 'Play' })).toBeVisible();

  // Play again restarts from the first stop.
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(progress(page)).toHaveText('1 of 3');
});

test('Arrow-right advances; there is no ← key', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(progress(page)).toHaveText('1 of 3');

  await page.keyboard.press('ArrowRight');
  await expect(progress(page)).toHaveText('2 of 3');

  // ← does nothing: the tour never steps back.
  await page.keyboard.press('ArrowLeft');
  await expect(progress(page)).toHaveText('2 of 3');
});

test('Escape key cancels the tutorial', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(progress(page)).toHaveText('1 of 3');

  await page.keyboard.press('Escape');
  await expect(panel(page).getByRole('button', { name: 'Play' })).toBeVisible();
});
