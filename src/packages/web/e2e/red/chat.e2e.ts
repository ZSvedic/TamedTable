// #ChatPanel #OpenFlow #RedInventory — BUG INVENTORY (expected to FAIL). Do not
// fix here.
//
// A completed flow-replay reply ("Executed steps: … Ran <flow> — N rows, M
// columns.") carries no Report bug action, while the identical-shaped reply to a
// typed chat request does. Run a .flow through Open ▸ "Open .flow & run on
// current data…" and the assistant reply has no data-cp-report affordance.
//
// Suspected cause (a guess): src/packages/web/src/controller-files.ts:138 pushes
// the flow reply with `reportable` unset — pushMessage('assistant', text,
// undefined /*debug*/, undefined /*reportable*/, historyId) — whereas the chat
// success reply (src/packages/web/src/controller.ts:330) passes reportable=true.
//
// Spec (spec/behavior.md § Web UI, request-detail section): "Every reply to a
// completed request carries the [Report bug] action (a wrong answer is a bug
// even when nothing turned red)". The flow reply is a completed request's reply
// and the spec says it "takes the same shape" as a chat reply, so the missing
// affordance is an inconsistency. (Interpretation caveat: this reads "completed
// request" to include a flow replay; a triager may decide flow replays are out
// of scope — hence minor.)
import { test, expect } from '@playwright/test';

test('a completed flow-replay reply carries the Report bug action', async ({ page }) => {
  // Force the <input type=file> fallback so the .flow picker is a filechooser.
  await page.addInitScript(() => {
    // @ts-expect-error optional browser API
    delete window.showOpenFilePicker;
  });
  await page.goto('/TamedTable/app/');
  await page.getByRole('button', { name: 'Tours', exact: true }).waitFor();

  // Load a table so "Open .flow & run on current data…" is enabled.
  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Open sample…"]').click();
  const picker = page.locator('[data-tb-sample-dialog]');
  await picker.waitFor();
  await picker.locator('[data-tb-sample]', { hasText: 'customers-input.csv' }).first().click();
  await page.locator('[data-tv-cell]').first().waitFor({ timeout: 30_000 });

  // Replay a deterministic flow (a filter on the existing Country column).
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

  // The reply lands as an assistant bubble with the "Executed steps:" heading.
  const reply = page.locator('[data-cp-message="assistant"]', { hasText: 'Executed steps:' });
  await expect(reply).toBeVisible({ timeout: 15_000 });
  // A completed request's reply must offer Report bug.
  await expect(reply.locator('[data-cp-report]')).toBeVisible({ timeout: 3_000 });
});
