// #MobileShell — browser-level E2E for the phone-width dock layout. At ≤768px
// the app drops the desktop toolbar+sidebar for an app bar, a frozen-header
// table, and a five-action bottom dock (Menu · Undo · History · Type · Speak).
// The Cucumber @web suite drives WebController with no DOM, so the responsive
// switch, the dock, the menu drawer, the History/Type sheets, and the tour
// running on a phone can only be seen here.
import { test, expect } from '@playwright/test';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

test.describe('phone width', () => {
  test.use({ viewport: PHONE });

  test('the empty page offers the three open actions and the dock, not the desktop toolbar', async ({
    page,
  }) => {
    await page.goto('/TamedTable/app/');

    await expect(page.getByText('What table can I tame?')).toBeVisible();
    await expect(page.locator('[data-mob-open="Open sample…"]')).toBeVisible();
    await expect(page.locator('[data-mob-open="Open local…"]')).toBeVisible();
    await expect(page.locator('[data-mob-open="Open URL…"]')).toBeVisible();

    // The dock is present (Menu live, data actions disabled); the toolbar is not.
    await expect(page.locator('[data-mob-dock=""]')).toBeVisible();
    await expect(page.locator('[data-mob-dock="menu"]')).toBeEnabled();
    await expect(page.locator('[data-mob-dock="type"]')).toBeDisabled();
    await expect(page.locator('[data-tb-toolbar=""]')).toHaveCount(0);
  });

  test('the menu drawer opens with the toolbar actions even before a file loads', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-mob-dock="menu"]').click();
    await expect(page.locator('[data-mob-drawer=""]')).toBeVisible();
    await expect(page.locator('[data-mob-menu-item="Open sample…"]')).toBeVisible();
    await expect(page.locator('[data-mob-menu-item="Settings…"]')).toBeVisible();
    await expect(page.locator('[data-mob-menu-item="Tours…"]')).toBeVisible();
  });

  test('loading a sample fills the app bar and opens the Type composer from the dock', async ({
    page,
  }) => {
    await page.goto('/TamedTable/app/');

    // Open a bundled sample through the empty-page action → sample picker → pick.
    await page.locator('[data-mob-open="Open sample…"]').click();
    const picker = page.locator('[data-tb-sample-dialog]');
    await expect(picker).toBeVisible();
    await picker.locator('[data-tb-sample]', { hasText: 'customers-input.csv' }).first().click();

    // App bar now names the file; the table renders.
    await expect(page.locator('[data-mob-appbar=""]')).toContainText('customers-input.csv', {
      timeout: 30_000,
    });
    await expect(page.locator('[data-mob-cell]').first()).toBeVisible();

    // Type button raises the composer sheet with the chat input.
    await page.locator('[data-mob-dock="type"]').click();
    await expect(page.locator('[data-mob-sheet="keyboard"]')).toBeVisible();
    await expect(page.locator('#tutorial-chat-input')).toBeVisible();
  });

  test('a tour runs on mobile: the spotlight advances and the Type sheet opens for the chat step', async ({
    page,
  }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-mob-dock="menu"]').click();
    await page.locator('[data-mob-menu-item="Tours…"]').click();

    // The shared TutorialPanel — same overlay as desktop. Clicking a tour starts it.
    await page.getByTestId('tutorial-panel').getByRole('option', { name: 'Filter by Country' }).click();

    const progress = page.locator('.driver-popover-progress-text');
    await expect(progress).toHaveText('1 of 3');

    // Step 1 (load) loads the sample; step 2 is the chat step.
    await page.locator('.driver-popover-next-btn').click();
    await expect(progress).toHaveText('2 of 3');
    await expect(page.locator('#tutorial-table-view')).toBeVisible();

    // The shell opens the Type sheet so the spotlight lands on the visible
    // composer, prefilled with the tour's query.
    await expect(page.locator('[data-mob-sheet="keyboard"]')).toBeVisible();
    await expect(page.locator('#tutorial-chat-input')).not.toHaveValue('');
  });
});

test.describe('desktop width', () => {
  test.use({ viewport: DESKTOP });

  test('shows the toolbar, not the dock', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await expect(page.locator('[data-tb-toolbar=""]')).toBeVisible();
    await expect(page.locator('[data-mob-dock=""]')).toHaveCount(0);
  });
});
