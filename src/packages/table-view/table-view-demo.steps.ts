// #TableView
// Step defs for the @web table-view scenarios. They drive the package's demo
// page (see tests/demo-harness.ts) and assert through the component's
// data-tv-* attributes plus the demo's #out event log.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { bindDemoPage, expectText } from '../../tests/demo-harness.ts';

const page = bindDemoPage({ name: 'table-view', pkgDir: import.meta.dirname });

// ── steps ────────────────────────────────────────────────────────────────────

Then('the demo range reads {string}', async function (this: object, expected: string) {
  await expectText(page(this), '[data-tv-range]', expected);
});

Then('the demo table has {int} body rows', async function (this: object, expected: number) {
  const count = await page(this).$$eval('tbody tr', (els) => els.length);
  assert.equal(count, expected);
});

Then('page {int} is the current page', async function (this: object, n: number) {
  const current = await page(this).getAttribute(`[data-tv-page="${n}"]`, 'aria-current');
  assert.equal(current, 'page');
});

When('the user clicks next page', async function (this: object) {
  await page(this).click('[data-tv-next]');
});

When('the user clicks page {int}', async function (this: object, n: number) {
  await page(this).click(`[data-tv-page="${n}"]`);
});

When('the user clicks cell {string}', async function (this: object, cell: string) {
  await page(this).click(`[data-tv-cell="${cell}"]`);
});

Then('the footer selection reads {string}', async function (this: object, expected: string) {
  await expectText(page(this), '[data-tv-selection]', expected);
});

When(
  'the user edits cell {string} to {string}',
  async function (this: object, cell: string, value: string) {
    const p = page(this);
    await p.dblclick(`[data-tv-cell="${cell}"]`);
    await p.fill('[data-tv-edit]', value);
    await p.press('[data-tv-edit]', 'Enter');
  },
);

Then('cell {string} shows {string}', async function (this: object, cell: string, expected: string) {
  await expectText(page(this), `[data-tv-cell="${cell}"]`, expected);
});

Then('the demo event log shows {string}', async function (this: object, expected: string) {
  await expectText(page(this), '#out', expected);
});

When(
  'the user drags the {string} header onto the {string} header',
  async function (this: object, from: string, to: string) {
    // HTML5 drag-and-drop: dispatch the events the component listens for —
    // Playwright's mouse-based dragTo doesn't produce dragstart/drop.
    const p = page(this);
    await p.dispatchEvent(`[data-tv-header="${from}"]`, 'dragstart');
    await p.dispatchEvent(`[data-tv-header="${to}"]`, 'drop');
  },
);

Then('the first column header is {string}', async function (this: object, expected: string) {
  // Header cell 1 is the row-number column; cell 2 is the first data column.
  await expectText(page(this), 'thead th:nth-child(2)', expected);
});

When('the user toggles streaming', async function (this: object) {
  await page(this).click('button:has-text("Toggle streaming")');
});

Then('the streaming banner is visible', async function (this: object) {
  await page(this).waitForSelector('[data-tv-streaming]');
});

Then('the footer status is {string}', async function (this: object, expected: string) {
  await page(this).waitForSelector(`[data-tv-status="${expected}"]`);
});
