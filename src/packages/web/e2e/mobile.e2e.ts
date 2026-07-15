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

  test('the menu drawer carries the full Open and Save menus even before a file loads', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-mob-dock="menu"]').click();
    await expect(page.locator('[data-mob-drawer=""]')).toBeVisible();
    // The same menu model as the desktop dropdowns, expanded in the drawer.
    await expect(page.locator('[data-mob-menu-item="Open sample…"]')).toBeVisible();
    await expect(page.locator('[data-mob-menu-item="Open .flow & run on current data…"]')).toBeDisabled();
    await expect(page.locator('[data-mob-menu-item="Save CSV…"]')).toBeDisabled();
    await expect(page.locator('[data-mob-menu-item="Settings…"]')).toBeVisible();
    await expect(page.locator('[data-mob-menu-item="Tours…"]')).toBeVisible();
    // The app bar carries no menu buttons — they were too small to tap.
    await expect(page.locator('[data-uk-menubtn]')).toHaveCount(0);
    // Picking "Open sample…" closes the drawer and raises the sample picker.
    await page.locator('[data-mob-menu-item="Open sample…"]').click();
    await expect(page.locator('[data-tb-sample-dialog]')).toBeVisible();
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

  test('the table surface spans the full horizontal scroll width', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-mob-open="Open sample…"]').click();
    const picker = page.locator('[data-tb-sample-dialog]');
    await picker.locator('[data-tb-sample]', { hasText: 'customers-input.csv' }).first().click();
    await expect(page.locator('[data-mob-cell]').first()).toBeVisible({ timeout: 30_000 });

    // The page scrolls the table sideways; the cells' backgrounds are
    // transparent, so the wrapper that paints the table's surface must be as
    // wide as the table itself — otherwise the page background (body, a
    // tinted color) shows through beside the columns once the user scrolls
    // right.
    const w = await page.evaluate(() => {
      const wrap = document.querySelector('[data-mob-table=""]')!;
      const table = wrap.querySelector('table')!;
      return {
        wrap: wrap.getBoundingClientRect().width,
        table: table.getBoundingClientRect().width,
        viewport: window.innerWidth,
      };
    });
    expect(w.table, 'the sample table must be wider than a phone screen').toBeGreaterThan(w.viewport);
    expect(w.wrap, 'the table surface must cover the whole table').toBeGreaterThanOrEqual(w.table);
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

    // The terminal "Voilà" step spotlights the table — clamped to the table's
    // visible top region, because a cutout as tall as the full-height table
    // leaves the popover nowhere to sit and breaks the layout. Scroll the page
    // right first: the spotlight must still cover the visible table, not just
    // the un-scrolled left region.
    await page.evaluate(() => window.scrollTo(200, 0));
    await page.locator('.driver-popover-next-btn').click();
    await expect(progress).toHaveText('3 of 3');
    await expect(page.locator('.driver-popover')).toContainText('Voilà');
    const fit = await page.evaluate(() => {
      const spot = document.querySelector('.driver-active-element')!.getBoundingClientRect();
      const pop = document.querySelector('.driver-popover')!.getBoundingClientRect();
      const table = document.getElementById('tutorial-table-view')!.getBoundingClientRect();
      // The wrapper can lie about its width (it once ended at the viewport
      // edge while the table overflowed it) — measure the inner <table>, the
      // honest content box, for the width check.
      const grid = document.querySelector('#tutorial-table-view table')!.getBoundingClientRect();
      return {
        spotTop: Math.round(spot.top),
        spotBottom: Math.round(spot.bottom),
        spotH: Math.round(spot.height),
        popTop: Math.round(pop.top),
        popBottom: Math.round(pop.bottom),
        coversTable: spot.top >= table.top - 1 && spot.left >= table.left - 1,
        // How much of the viewport the cutout spans horizontally: the table is
        // wider than the screen and the page is scrolled right, so the cutout
        // must run edge to edge — a cutout stuck at the un-scrolled region
        // reads as a broken half-highlight.
        coversWidth: spot.left <= 1 && spot.right >= Math.min(grid.right, window.innerWidth) - 1,
        vh: window.innerHeight,
      };
    });
    expect(fit.spotH, 'the spotlight must be clamped to fit the screen').toBeLessThanOrEqual(fit.vh * 0.6);
    expect(fit.spotTop, 'the spotlight must start on screen').toBeGreaterThanOrEqual(0);
    expect(fit.coversTable, 'the spotlight must sit over the table region').toBe(true);
    expect(fit.coversWidth, 'the spotlight must cover the visible table width when scrolled right').toBe(true);
    expect(fit.popBottom, 'the popover must stay on screen').toBeLessThanOrEqual(fit.vh + 1);
    expect(fit.popTop, 'the popover must sit below the cutout').toBeGreaterThanOrEqual(fit.spotBottom - 20);
  });

  test('the empty page links to the tours', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-open-tours]').click();
    await expect(page.getByTestId('tutorial-panel')).toBeVisible();
  });
});

test.describe('desktop width', () => {
  test.use({ viewport: DESKTOP });

  test('shows the toolbar, not the dock', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await expect(page.locator('[data-tb-toolbar=""]')).toBeVisible();
    await expect(page.locator('[data-mob-dock=""]')).toHaveCount(0);
  });

  test('the desktop empty page links to the tours', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-tv-empty] [data-open-tours]').click();
    await expect(page.getByTestId('tutorial-panel')).toBeVisible();
  });

  test('desktop Settings has no Add to home screen section', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Diagnostics', { exact: true })).toBeVisible();
    await expect(page.getByText('Add to home screen', { exact: true })).toHaveCount(0);
  });

  test('nothing scrolls the page — panels scroll internally, even with a table loaded', async ({
    page,
  }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-tv-open="Open sample…"]').click();
    await page
      .locator('[data-tb-sample-dialog] [data-tb-sample]', { hasText: 'customers-input.csv' })
      .first()
      .click();
    await expect(page.locator('[data-tv-cell="0:Country"]')).toBeVisible({ timeout: 30_000 });

    const slack = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(slack, 'the desktop document must never be the scroller').toBeLessThanOrEqual(0);
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
    await page.locator('[data-tb-toolbar=""] [data-uk-menubtn]').first().click();
    await page.locator('[data-uk-menu-item="Open sample…"]').click();
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

// #MobileShell — document-scroll layout. On phones the page itself is the
// table's scroller (the app bar and dock are fixed to the screen), so a
// natural swipe hides the phone browser's bars and the browser scrollbar
// shows the true position in the table. The page always keeps ≥1px of scroll
// room past the large viewport, so even the empty page can be swiped.
// Headless has no browser bars; these tests pin the mechanics.
test.describe('phone — the page is the table scroller', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test('the empty page has scroll room and the app bar and dock are fixed', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await expect(page.getByText('What table can I tame?')).toBeVisible();

    const state = await page.evaluate(() => ({
      slack: document.documentElement.scrollHeight - window.innerHeight,
      bottom: getComputedStyle(document.querySelector('[data-mob-bottom=""]')!).position,
      dockBottom: Math.round(document.querySelector('[data-mob-dock=""]')!.getBoundingClientRect().bottom),
      innerH: window.innerHeight,
    }));
    expect(state.slack, 'the page needs scroll room so a swipe can hide the bars').toBeGreaterThanOrEqual(1);
    expect(state.bottom, 'the dock must stay pinned while the page scrolls').toBe('fixed');
    expect(state.dockBottom).toBe(state.innerH);
  });

  test('a loaded table scrolls as the document; the header sticks under the app bar', async ({
    page,
  }) => {
    // A short viewport so 20 rows are guaranteed taller than the screen.
    await page.setViewportSize({ width: 390, height: 320 });
    await page.goto('/TamedTable/app/');
    await page.locator('[data-mob-open="Open sample…"]').click();
    await page
      .locator('[data-tb-sample-dialog] [data-tb-sample]', { hasText: 'customers-input.csv' })
      .first()
      .click();
    await expect(page.locator('[data-mob-cell]').first()).toBeVisible({ timeout: 30_000 });

    // No inner vertical scroller — the document is the scroller.
    const layout = await page.evaluate(() => ({
      tableOverflow: getComputedStyle(document.querySelector('[data-mob-table]')!).overflowY,
      slack: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(layout.tableOverflow, 'the table must not trap vertical scrolling').not.toBe('auto');
    expect(layout.slack, 'the 20-row page must overflow this short viewport').toBeGreaterThan(100);

    // Scroll the page: the app bar stays at the top, the header row glues to it.
    await page.evaluate(() => window.scrollTo(0, 150));
    const m = await page.evaluate(() => {
      const th = document.querySelector('[data-mob-table] thead th')!.getBoundingClientRect();
      const bar = document.querySelector('[data-mob-appbar=""]')!.getBoundingClientRect();
      return {
        scrollY: Math.round(window.scrollY),
        barTop: Math.round(bar.top),
        gap: Math.round(th.top - bar.bottom),
      };
    });
    expect(m.scrollY).toBe(150);
    expect(m.barTop, 'the app bar must stay fixed at the top').toBe(0);
    expect(Math.abs(m.gap), 'the sticky header must sit right under the app bar').toBeLessThanOrEqual(1);
  });

  test('Settings on a phone offers Add to home screen', async ({ page }) => {
    await page.goto('/TamedTable/app/');
    await page.locator('[data-mob-dock="menu"]').click();
    await page.locator('[data-mob-menu-item="Settings…"]').click();
    await expect(page.getByText('Add to home screen', { exact: true })).toBeVisible();
  });
});
