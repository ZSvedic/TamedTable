// #UiKit
// Step defs for the @web ui-kit scenarios. They drive the package's demo page
// (see tests/demo-harness.ts) and assert through the kit's data-uk-*
// attributes plus the demo's #out event log.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { bindDemoPage } from '../../tests/demo-harness.ts';

const page = bindDemoPage({ name: 'ui-kit', pkgDir: import.meta.dirname });

// ── steps ────────────────────────────────────────────────────────────────────

Then('the demo shows a {string} button', async function (this: object, variant: string) {
  await page(this).waitForSelector(`[data-uk-button="${variant}"]`);
});

When('the user clicks the {string} button', async function (this: object, variant: string) {
  await page(this).click(`[data-uk-button="${variant}"]`);
});

Then('the demo log shows {string}', async function (this: object, expected: string) {
  const p = page(this);
  const pred = `(document.querySelector('#out')?.textContent ?? '').includes(${JSON.stringify(expected)})`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    assert.fail(`expected the log to show "${expected}"; it shows: ${await p.textContent('#out')}`);
  }
});

Then('the demo renders every icon name', async function (this: object) {
  // The demo exposes the catalogue size on the icon grid, so this stays correct
  // as icons are added without re-hardcoding a count here.
  const { distinct, expected } = (await page(this).evaluate(
    `(() => ({
       distinct: new Set([...document.querySelectorAll('[data-uk-icon]')].map((el) => el.getAttribute('data-uk-icon'))).size,
       expected: Number(document.querySelector('[data-icon-count]')?.getAttribute('data-icon-count')),
     }))()`,
  )) as { distinct: number; expected: number };
  assert.ok(expected >= 24, `expected at least 24 icons, demo reports ${expected}`);
  assert.equal(distinct, expected);
});

When('the user clicks the theme toggle', async function (this: object) {
  await page(this).click('button[title="Toggle light/dark"]');
});

Then('the demo is in {string} mode', async function (this: object, mode: string) {
  await page(this).waitForSelector(`[data-uk-mode="${mode}"]`);
});

When('the user clicks the split button caret', async function (this: object) {
  await page(this).click('[data-uk-split-caret]');
});

When('the user picks the menu item {string}', async function (this: object, label: string) {
  await page(this).click(`[data-uk-menu-item="${label}"]`);
});

Then('the split button menu is closed', async function (this: object) {
  await page(this).waitForSelector('[data-uk-menu-item]', { state: 'detached' });
});

When('the user adds an {string} toast', async function (this: object, kind: string) {
  await page(this).click(`button:has-text("Add ${kind} toast")`);
});

Then('an {string} toast is visible', async function (this: object, kind: string) {
  await page(this).waitForSelector(`[data-uk-toast="${kind}"]`);
});

When('the user adds a toast with a {string} action', async function (this: object, _label: string) {
  await page(this).click('button:has-text("Add action toast")');
});

Then('the newest toast shows an action labelled {string}', async function (this: object, label: string) {
  const action = page(this).locator('[data-uk-toast-action]').last();
  await action.waitFor();
  assert.equal(await action.textContent(), label);
});

When("the user clicks the newest toast's action", async function (this: object) {
  await page(this).locator('[data-uk-toast-action]').last().click();
});

Then('the demo log records the toast action', async function (this: object) {
  const p = page(this);
  const pred = `(document.querySelector('#out')?.textContent ?? '').includes('toast action')`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    assert.fail(`expected the log to record the toast action; it shows: ${await p.textContent('#out')}`);
  }
});

When('the user dismisses the first toast', async function (this: object) {
  await page(this).click('[data-uk-toast-dismiss]');
});

Then('no toast is visible', async function (this: object) {
  await page(this).waitForSelector('[data-uk-toast]', { state: 'detached' });
});

Then('the toast fades on its own', async function (this: object) {
  // No click, no hover: the toast schedules its own dismissal. The floored
  // duration plus the fade-out lands well under this window.
  await page(this).waitForSelector('[data-uk-toast]', { state: 'detached', timeout: 8_000 });
});
