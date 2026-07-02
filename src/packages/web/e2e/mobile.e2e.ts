// #MobileShell — browser-level E2E for the phone-width dock layout. At ≤768px
// the app drops the desktop toolbar+sidebar for an app bar, a frozen-header
// table, and a five-action bottom dock (Menu · Undo · History · Type · Speak).
// The Cucumber @web suite drives WebController with no DOM, so the responsive
// switch, the dock, the menu drawer, the History/Type sheets, and the tour
// running on a phone can only be seen here.
import { test, expect } from '@playwright/test';
import { NARROW_MAX_WIDTH } from '../src/hooks/useIsNarrow.ts';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

/** How far the document (or an element) scrolls past its own width — > 0 means
 *  horizontal overflow, which a mobile-friendly layout must never have. */
async function overflow(page: import('@playwright/test').Page): Promise<{ doc: number; bar: number }> {
  return page.evaluate(() => {
    const el = document.documentElement;
    const bar = document.querySelector('[data-tb-toolbar=""]');
    return {
      doc: el.scrollWidth - el.clientWidth,
      bar: bar ? bar.scrollWidth - bar.clientWidth : 0,
    };
  });
}

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

    // The terminal "Voilà" step highlights the table, as on desktop — not the
    // app bar (the filename/pager strip on top).
    await page.locator('.driver-popover-next-btn').click();
    await expect(progress).toHaveText('3 of 3');
    await expect(page.locator('.driver-popover')).toContainText('Voilà');
    await expect(page.locator('#tutorial-table-view')).toHaveClass(/driver-active-element/);
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

// #Toolbar — the medium band between the phone breakpoint and full desktop
// width: the toolbar must condense so the page never scrolls sideways.
test.describe('medium width — the toolbar condenses instead of overflowing', () => {
  // Every width above the phone breakpoint up to the condense threshold shows
  // the (condensed) desktop toolbar and must not overflow.
  for (const width of [780, 850, 940, 1024, NARROW_MAX_WIDTH]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/TamedTable/app/');
      await expect(page.locator('[data-tb-toolbar=""]')).toBeVisible();
      const { doc, bar } = await overflow(page);
      expect(doc, 'document must not scroll horizontally').toBeLessThanOrEqual(0);
      expect(bar, 'toolbar must not overflow its width').toBeLessThanOrEqual(0);
    });
  }

  // Rule out an overflow band *above* the threshold: at threshold+1px the
  // toolbar first shows full labels (condensed turns off) — it must still fit.
  // If this fails, the full-label toolbar needs more room: raise NARROW_MAX_WIDTH.
  test(`no overflow just above the threshold at ${NARROW_MAX_WIDTH + 1}px (full labels)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: NARROW_MAX_WIDTH + 1, height: 800 });
    await page.goto('/TamedTable/app/');
    await expect(page.locator('[data-tb-toolbar=""]')).toBeVisible();
    const { doc, bar } = await overflow(page);
    expect(doc, 'document must not scroll horizontally').toBeLessThanOrEqual(0);
    expect(bar, 'full-label toolbar must fit at threshold+1').toBeLessThanOrEqual(0);
  });

  // With a file loaded the toolbar also shows the file readout (which the
  // condensed bar hides). The readout shrinks/truncates rather than spilling, so
  // the toolbar itself never overflows at any width.
  // (The desktop table's own horizontal scroll is a separate concern — a wide
  // table scrolls the content area, not tracked by this toolbar test.)
  test('the toolbar never overflows across the band with a file loaded', async ({ page }) => {
    await page.setViewportSize({ width: DESKTOP.width, height: 800 });
    await page.goto('/TamedTable/app/');
    await page.locator('[data-tb-toolbar=""] [data-uk-split-main]').first().click();
    const picker = page.locator('[data-tb-sample-dialog]');
    await expect(picker).toBeVisible();
    await picker.locator('[data-tb-sample]', { hasText: 'customers-input.csv' }).first().click();
    await expect(page.locator('[data-tb-info]')).toContainText('rows', { timeout: 30_000 });

    for (const width of [780, 960, NARROW_MAX_WIDTH + 1, DESKTOP.width]) {
      await page.setViewportSize({ width, height: 800 });
      // Wait for the condense re-render to settle before measuring: the readout
      // is hidden when condensed (≤ threshold), shown otherwise.
      const condensed = width <= NARROW_MAX_WIDTH;
      await expect(page.locator('[data-tb-info]')).toHaveCount(condensed ? 0 : 1);
      const { bar } = await overflow(page);
      expect(bar, `toolbar must not overflow at ${width}px (loaded)`).toBeLessThanOrEqual(0);
    }
  });
});

// #MobileShell — browser-bar auto-hide. On touch devices the app gives the
// document 1px of scroll room, pins #root to the visual viewport, and nudges
// the page with window.scrollTo so Android Chrome / iOS Safari slide their
// top and bottom bars away. Emulated touch (hasTouch) turns on the
// (pointer: coarse) media block that carries the CSS half of the trick.
test.describe('phone with touch — browser bars auto-hide', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test('the page has scroll room, the app is pinned, and the load nudge scrolls it', async ({
    page,
  }) => {
    await page.goto('/TamedTable/app/');

    const state = await page.evaluate(() => ({
      coarse: matchMedia('(pointer: coarse)').matches,
      slack: document.documentElement.scrollHeight - window.innerHeight,
      rootPosition: getComputedStyle(document.getElementById('root')!).position,
    }));
    expect(state.coarse, 'touch emulation must present a coarse pointer').toBe(true);
    expect(state.slack, 'the document needs scroll room for bars to auto-hide').toBeGreaterThanOrEqual(1);
    expect(state.rootPosition, '#root must stay glued to the viewport while the page scrolls').toBe('fixed');

    // The on-load nudge scrolls the 1px of slack, which is what triggers the
    // browser to hide its bars.
    await page.waitForFunction(() => window.scrollY >= 1);
  });

  test('a mouse-pointer page gets no scroll room and no nudge', async ({ browser }) => {
    const context = await browser.newContext({ viewport: DESKTOP, hasTouch: false });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/TamedTable/app/');
    await page.waitForTimeout(300); // longer than the nudge's own delay
    const state = await page.evaluate(() => ({
      slack: document.documentElement.scrollHeight - window.innerHeight,
      scrollY: window.scrollY,
    }));
    expect(state.slack).toBeLessThanOrEqual(0);
    expect(state.scrollY).toBe(0);
    await context.close();
  });
});
