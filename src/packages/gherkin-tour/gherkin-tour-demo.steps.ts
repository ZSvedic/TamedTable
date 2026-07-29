// #GherkinTour
// Step defs for the @web gherkin-tour scenarios: they drive the package's
// self-touring demo page (see tests/demo-harness.ts) through Driver.js's own
// popover controls, and assert the scroll-through behavior — the overlay
// blocks clicks, not scrolling (spec/packages/gherkin-tour/behavior.md).
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { bindDemoPage } from '../../tests/demo-harness.ts';

const page = bindDemoPage({ name: 'gherkin-tour', pkgDir: import.meta.dirname });

// ── steps ────────────────────────────────────────────────────────────────────

When('the demo tour starts', async function (this: object) {
  const p = page(this);
  await p.click('#start-tour');
  await p.waitForSelector('.driver-popover');
});

// Click Driver's Next and wait for the popover's progress line to move on —
// a step's side effect (the demo's chime clip) can take a moment.
async function advance(p: ReturnType<typeof page>): Promise<void> {
  const before = await p.textContent('.driver-popover-progress-text');
  await p.click('.driver-popover-next-btn');
  await p.waitForFunction(
    (prev) => document.querySelector('.driver-popover-progress-text')?.textContent !== prev,
    before,
  );
}

When('the demo tour advances', async function (this: object) {
  await advance(page(this));
});

When('the demo tour advances {int} times', async function (this: object, n: number) {
  for (let i = 0; i < n; i++) await advance(page(this));
});

Then('the demo table shows rows', async function (this: object) {
  await page(this).waitForFunction(
    () => (document.querySelectorAll('#table-view tbody tr').length ?? 0) > 0,
  );
});

Then('the demo table is not scrolled', async function (this: object) {
  const top = await page(this).$eval('#table-view', (el) => el.scrollTop);
  assert.equal(top, 0);
});

When('the user wheels down over the demo table', async function (this: object) {
  const p = page(this);
  const box = await (await p.waitForSelector('#table-view'))?.boundingBox();
  assert.ok(box, 'the demo table has no layout box');
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.wheel(0, 120);
});

Then('the demo table has scrolled down', async function (this: object) {
  await page(this).waitForFunction(
    () => (document.querySelector('#table-view')?.scrollTop ?? 0) > 0,
  );
});

Then('the demo tour overlay is still up', async function (this: object) {
  assert.ok(
    await page(this).$('.driver-popover'),
    'the tour popover should survive a forwarded scroll',
  );
});
