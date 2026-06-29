// #MobileShell — browser-level E2E for the phone-width dock layout. At ≤768px
// the app drops the desktop toolbar+sidebar for an app bar, a table, and a
// bottom dock (menu · undo · keyboard · voice). These checks run the real app
// at a phone viewport and prove the dock shell renders, the empty page offers
// the three open actions, a sample loads through the picker, and the menu
// drawer and chat sheet open.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('the empty page offers the three open actions and the dock, not the desktop toolbar', async ({
  page,
}) => {
  await page.goto('/TamedTable/app/');

  // Empty page: brand line + the three first-class open actions.
  await expect(page.getByText('What table can I tame?')).toBeVisible();
  await expect(page.locator('[data-tv-open="Open sample…"]')).toBeVisible();
  await expect(page.locator('[data-tv-open="Open local…"]')).toBeVisible();
  await expect(page.locator('[data-tv-open="Open URL…"]')).toBeVisible();

  // The dock is present; the desktop toolbar is not.
  await expect(page.locator('[data-mb-dock]')).toBeVisible();
  await expect(page.locator('[data-tb-toolbar]')).toHaveCount(0);
});

test('the menu drawer opens with the toolbar actions even before a file loads', async ({ page }) => {
  await page.goto('/TamedTable/app/');
  // The menu button is the first dock control and stays live with no file.
  await page.locator('[data-mb-dock] button').first().click();
  await expect(page.locator('[data-mb-drawer]')).toBeVisible();
  await expect(page.locator('[data-mb-menu-item="Open sample…"]')).toBeVisible();
  await expect(page.locator('[data-mb-menu-item="Settings…"]')).toBeVisible();
  await expect(page.locator('[data-mb-menu-item="Tours…"]')).toBeVisible();
});

test('loading a sample fills the app bar and opens the chat sheet from the dock', async ({
  page,
}) => {
  await page.goto('/TamedTable/app/');

  // Open a bundled sample through the empty-page action → sample picker → pick.
  await page.locator('[data-tv-open="Open sample…"]').click();
  const picker = page.locator('[data-tb-sample-dialog]');
  await expect(picker).toBeVisible();
  await picker.locator('[data-tb-sample]', { hasText: 'customers-input.csv' }).first().click();

  // App bar now names the file; the table renders.
  await expect(page.locator('[data-mb-appbar]')).toContainText('customers-input.csv', {
    timeout: 30_000,
  });
  await expect(page.locator('[data-tv-cell]').first()).toBeVisible();

  // Keyboard button (third dock control) raises the chat composer sheet.
  await page.locator('[data-mb-dock] button').nth(2).click();
  await expect(page.locator('[data-mb-chat-sheet]')).toBeVisible();
  await expect(page.locator('#tutorial-chat-input')).toBeVisible();
});
