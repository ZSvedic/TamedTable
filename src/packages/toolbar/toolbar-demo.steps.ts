// #Toolbar
// Step defs for the @web toolbar scenarios. They drive the package's demo page
// (see tests/demo-harness.ts) and assert through the component's data-tb-*
// attributes plus the demo's #out event log.
import { Then, When } from '@cucumber/cucumber';
import { bindDemoPage, expectText } from '../../tests/demo-harness.ts';

const page = bindDemoPage({ name: 'toolbar', pkgDir: import.meta.dirname });

// ── steps ────────────────────────────────────────────────────────────────────

When('the user clicks the toolbar button {string}', async function (this: object, label: string) {
  await page(this).click(`[data-tb-toolbar] button:has-text("${label}")`);
});

When('the user clicks the toolbar theme toggle', async function (this: object) {
  await page(this).click('[data-tb-toolbar] button[title*="theme"]');
});

When('the user opens the toolbar open menu', async function (this: object) {
  // Two menu buttons — Open then Save; Open is the first.
  await page(this).locator('[data-tb-toolbar] [data-uk-menubtn]').nth(0).click();
});

When('the user opens the toolbar save menu', async function (this: object) {
  // Two menu buttons — Open then Save; Save is the second.
  await page(this).locator('[data-tb-toolbar] [data-uk-menubtn]').nth(1).click();
});

Then('the toolbar menu shows the group header {string}', async function (this: object, header: string) {
  await page(this).waitForSelector(`[data-uk-menu-header="${header}"]`);
});

When('the user picks the toolbar menu item {string}', async function (this: object, label: string) {
  await page(this).click(`[data-uk-menu-item="${label}"]`);
});

Then('the toolbar event log shows {string}', async function (this: object, expected: string) {
  await expectText(page(this), '#out', expected);
});

When('the user opens the toolbar URL dialog', async function (this: object) {
  // "Open URL…" lives in the Open menu button's dropdown.
  await page(this).locator('[data-tb-toolbar] [data-uk-menubtn]').nth(0).click();
  await page(this).click('[data-uk-menu-item="Open URL…"]');
  await page(this).waitForSelector('[data-tb-dialog]');
});

When('the user opens the toolbar sample picker', async function (this: object) {
  // "Open sample…" lives in the Open menu button's dropdown.
  await page(this).locator('[data-tb-toolbar] [data-uk-menubtn]').nth(0).click();
  await page(this).click('[data-uk-menu-item="Open sample…"]');
  await page(this).waitForSelector('[data-tb-sample-dialog]');
});

Then('the toolbar sample picker is closed', async function (this: object) {
  await page(this).waitForSelector('[data-tb-sample-dialog]', { state: 'detached' });
});

When('the user types {string} into the toolbar URL field', async function (this: object, url: string) {
  await page(this).fill('[data-tb-url-input]', url);
});

When('the user submits the toolbar URL dialog', async function (this: object) {
  await page(this).click('[data-tb-dialog] button:has-text("Load")');
});

When('the user picks the first toolbar sample', async function (this: object) {
  await page(this).click('[data-tb-sample]');
});

Then('the toolbar URL dialog is closed', async function (this: object) {
  await page(this).waitForSelector('[data-tb-dialog]', { state: 'detached' });
});
