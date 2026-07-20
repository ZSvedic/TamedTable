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

// Width of the header cell before the drag, so the "wider" assertion has a
// baseline. Keyed by the scenario's world object.
const widthBefore = new WeakMap<object, number>();

When(
  'the user drags the right edge of the {string} header {int} px right',
  async function (this: object, col: string, delta: number) {
    const p = page(this);
    const header = p.locator(`[data-tv-header="${col}"]`);
    widthBefore.set(this, (await header.boundingBox())!.width);
    const handle = (await p.locator(`[data-tv-resize="${col}"]`).boundingBox())!;
    const y = handle.y + handle.height / 2;
    await p.mouse.move(handle.x + handle.width / 2, y);
    await p.mouse.down();
    await p.mouse.move(handle.x + handle.width / 2 + delta, y, { steps: 4 });
    await p.mouse.up();
  },
);

Then(
  'the {string} header is about {int} px wider',
  async function (this: object, col: string, delta: number) {
    const before = widthBefore.get(this);
    assert.ok(before !== undefined, 'no resize drag recorded in this scenario');
    const after = (await page(this).locator(`[data-tv-header="${col}"]`).boundingBox())!.width;
    // "About": sub-pixel rounding and the mouse landing a pixel off are fine.
    assert.ok(
      Math.abs(after - before - delta) <= 3,
      `expected width ${before} + ${delta} ±3, got ${after}`,
    );
  },
);

Then(
  'the demo event log does not show {string}',
  async function (this: object, unexpected: string) {
    const log = (await page(this).textContent('#out')) ?? '';
    assert.ok(!log.includes(unexpected), `event log unexpectedly shows "${unexpected}": ${log}`);
  },
);

When('the user toggles streaming', async function (this: object) {
  await page(this).click('button:has-text("Toggle streaming")');
});

Then('the streaming banner is visible', async function (this: object) {
  await page(this).waitForSelector('[data-tv-streaming]');
});

// ── Grid upgrades (#LazyExec): column menu, row marks, changed cells ────────

When('the user opens the {string} column menu', async function (this: object, col: string) {
  await page(this).click(`[data-tv-menu="${col}"]`);
});

When('the user picks {string}', async function (this: object, label: string) {
  const item = {
    'Sort ascending': 'sort-asc',
    'Sort descending': 'sort-desc',
    'Autofit width': 'autofit',
    'Delete column': 'delete',
  }[label];
  assert.ok(item, `unknown menu item "${label}"`);
  await page(this).click(`[data-tv-menu-item="${item}"]`);
});

When('the user filters by {string}', async function (this: object, text: string) {
  const p = page(this);
  await p.click('[data-tv-menu-item="filter"]');
  await p.fill('[data-tv-filter-input]', text);
  await p.press('[data-tv-filter-input]', 'Enter');
});

Then(
  'the {string} header shows the {string} sort indicator',
  async function (this: object, col: string, dir: string) {
    const found = await page(this).$(`[data-tv-header="${col}"] [data-tv-sort="${dir}"]`);
    assert.ok(found, `expected a ${dir} sort indicator on "${col}"`);
  },
);

Then('the {string} header carries a funnel mark', async function (this: object, col: string) {
  const found = await page(this).$(`[data-tv-header="${col}"][data-tv-filtered="${col}"]`);
  assert.ok(found, `expected a funnel mark on "${col}"`);
});

Then('the {string} header is narrower than {int} px', async function (this: object, col: string, max: number) {
  const width = await page(this).$eval(
    `[data-tv-header="${col}"]`,
    (el) => el.getBoundingClientRect().width,
  );
  assert.ok(width < max, `expected "${col}" narrower than ${max}px, got ${width}`);
});

Then('the row numbered {int} is marked {string}', async function (this: object, num: number, status: string) {
  const texts = await page(this).$$eval(
    `td[data-tv-rowstatus="${status}"]`,
    (els) => els.map((el) => el.textContent?.trim()),
  );
  assert.ok(texts.includes(String(num)), `expected row ${num} marked ${status}, got [${texts.join(', ')}]`);
});

Then('{int} rows on the page are marked {string}', async function (this: object, n: number, status: string) {
  const count = await page(this).$$eval(`td[data-tv-rowstatus="${status}"]`, (els) => els.length);
  assert.equal(count, n);
});

Then('page {int} carries a pending dot', async function (this: object, n: number) {
  const found = await page(this).$(`[data-tv-page="${n}"][data-tv-pending]`);
  assert.ok(found, `expected a pending dot on page ${n}`);
});

Then(
  'cell {string} is marked changed with previous value {string}',
  async function (this: object, cell: string, previous: string) {
    const title = await page(this).getAttribute(`[data-tv-cell="${cell}"][data-tv-changed]`, 'title');
    assert.ok(title?.includes(`was: ${previous}`), `expected "was: ${previous}", got "${title}"`);
  },
);

Then('the first row number is not {int}', async function (this: object, n: number) {
  const first = await page(this).$eval('tbody tr td', (el) => el.textContent?.trim());
  assert.notEqual(first, String(n));
});
