// #TutorialMode — browser-level E2E tests for the Tutorial panel.
// These catch UI bugs (z-index, Driver.js interactions) that the Cucumber
// @web suite cannot see because it drives WebController directly, no DOM.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/TamedTable/');
  await page.getByRole('button', { name: 'Tutorial' }).waitFor();
});

/** Scoped to the TutorialPanel element so Driver.js popover text doesn't collide. */
function panel(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  return page.getByTestId('tutorial-panel');
}

/** Prev/Next/close buttons live in the Driver.js popover, not the panel footer. */
function popoverBtn(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never, name: string | RegExp) {
  return page.locator('.driver-popover').getByRole('button', { name });
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

test('Play starts at step 1', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 4');
});

test('Next advances to step 2 without closing the tutorial', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 4');

  // Next button is now in the Driver.js popover, not the panel footer.
  await popoverBtn(page, 'Next →').click();

  // Must show step 2 — not collapsed back to the picker or closed.
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 2 of 4');
});

test('Next works for the Left join tutorial', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Left join enriches each customer with ISO and Region');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 6');

  await popoverBtn(page, 'Next →').click();

  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 2 of 6');
});

test('Cancel exits the tour and Play restarts it', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 4');

  // Cancel via the Driver.js popover close button.
  await page.locator('.driver-popover-close-btn').click();
  // After cancel, panel returns to picker.
  await expect(panel(page).getByRole('button', { name: 'Play' })).toBeVisible();

  // Play again restarts from step 1.
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 4');
});

test('Arrow-key navigation advances and retreats steps', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 4');

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 2 of 4');

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 4');
});

test('Escape key cancels the tutorial', async ({ page }) => {
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await page.locator('select').selectOption('Filter by Country');
  await panel(page).getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('tutorial-step')).toHaveText('Step 1 of 4');

  await page.keyboard.press('Escape');
  await expect(panel(page).getByRole('button', { name: 'Play' })).toBeVisible();
});
