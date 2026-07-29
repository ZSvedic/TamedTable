// #TableView #RedInventory — BUG INVENTORY (expected to FAIL). Do not fix here.
//
// A manual cell edit does not tint the changed cell (nor show its "was: …"
// tooltip) until some unrelated action forces a re-render. Right after the
// edit, the cell shows the new value but carries no data-tv-changed attribute
// and its title is still the plain "Click to select · double-click to edit".
// Click any other cell (or take any other action) and the tint + "was:" tooltip
// appear — so the mark is computed correctly, only the render is stale.
//
// Suspected cause (a guess): src/packages/web/src/controller-patch.ts:136-137 —
// editCell() calls engine.noteChangedCell() and marks.set() AFTER
// applySpecChange() has already fired notify() (line 175), and no notify()
// follows. React renders the committed edit without the just-recorded mark.
//
// Spec (spec/packages/table-view/behavior.md § Changed cells): "a changed cell
// tints, and hovering it shows a small [was: …] tooltip"; and controller-patch.ts
// states the intent directly: "The edited cell tints like any other change".
import { test, expect } from '@playwright/test';

test('editing a cell tints it (and shows the was: tooltip) immediately', async ({ page }) => {
  await page.goto('/TamedTable/app/');
  await page.getByRole('button', { name: 'Tours', exact: true }).waitFor();

  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Open sample…"]').click();
  const picker = page.locator('[data-tb-sample-dialog]');
  await picker.waitFor();
  await picker.locator('[data-tb-sample]', { hasText: 'customers-input.csv' }).first().click();
  await page.locator('[data-tv-cell]').first().waitFor({ timeout: 30_000 });

  // Edit a cell.
  const cell = page.locator('[data-tv-cell="0:Country"]');
  await cell.dblclick();
  const input = page.locator('[data-tv-edit]');
  await input.fill('MARKME');
  await input.press('Enter');
  await expect(cell).toHaveText('MARKME');

  // The edited cell must tint (carry data-tv-changed) right away — no other
  // interaction should be needed to reveal the change.
  await expect(cell).toHaveAttribute('data-tv-changed', '', { timeout: 3_000 });
});
