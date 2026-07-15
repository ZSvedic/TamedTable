// #ChatPanel
// Step defs for the @web chat-panel scenarios. They drive the package's demo
// page (see tests/demo-harness.ts) and assert through the component's
// data-cp-* attributes plus the demo's #out event log.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { bindDemoPage, expectText } from '../../tests/demo-harness.ts';

const page = bindDemoPage({ name: 'chat-panel', pkgDir: import.meta.dirname });

// ── steps ────────────────────────────────────────────────────────────────────

When('the user sends the chat message {string}', async function (this: object, text: string) {
  const p = page(this);
  await p.fill('#demo-chat-input', text);
  await p.press('#demo-chat-input', 'Enter');
});

Then('a chat user bubble shows {string}', async function (this: object, expected: string) {
  await expectText(page(this), '[data-cp-message="user"]', expected);
});

Then('an assistant reply shows {string}', async function (this: object, expected: string) {
  await expectText(page(this), '[data-cp-message="assistant"]', expected);
});

Then('the chat input is empty', async function (this: object) {
  assert.equal(await page(this).inputValue('#demo-chat-input'), '');
});

When('the user adds an error reply', async function (this: object) {
  await page(this).click('button:has-text("Add error reply")');
});

Then('an assistant error shows {string}', async function (this: object, expected: string) {
  await expectText(page(this), '[data-cp-error]', expected);
});

When('the user adds a reply with request detail', async function (this: object) {
  await page(this).click('button:has-text("Add reply with detail")');
});

When('the user adds an app-error reply', async function (this: object) {
  await page(this).click('button:has-text("Add app-error reply")');
});

When('the user clicks the Report bug action', async function (this: object) {
  await page(this).click('[data-cp-report]');
});

Then('no Report bug action is shown', async function (this: object) {
  await page(this).waitForFunction(`document.querySelector('[data-cp-report]') === null`);
});

When('the user expands the request detail', async function (this: object) {
  await page(this).click('[data-cp-detail-toggle]');
});

Then('the request detail shows {string}', async function (this: object, expected: string) {
  await expectText(page(this), '[data-cp-detail]', expected);
});

When('the user toggles chat streaming', async function (this: object) {
  await page(this).click('button:has-text("Toggle streaming")');
});

Then('the chat shows it is running', async function (this: object) {
  await page(this).waitForSelector('[data-cp-running]');
});

When('the user clicks the chat stop button', async function (this: object) {
  await page(this).click('[data-cp-stop]');
});

Then('the chat event log shows {string}', async function (this: object, expected: string) {
  await expectText(page(this), '#out', expected);
});

When('the user clicks the prefill button', async function (this: object) {
  await page(this).click('button:has-text("Prefill draft")');
});

Then('the chat input contains {string}', async function (this: object, expected: string) {
  const p = page(this);
  await p.waitForFunction(
    `document.querySelector('#demo-chat-input')?.value === ${JSON.stringify(expected)}`,
  );
});

When('the user clicks the replay-lock button', async function (this: object) {
  await page(this).click('button:has-text("Toggle replay lock")');
});

Then('the chat input is disabled with hint {string}', async function (this: object, hint: string) {
  const p = page(this);
  await p.waitForFunction(
    `(() => { const el = document.querySelector('#demo-chat-input');
       return el && el.disabled && el.placeholder === ${JSON.stringify(hint)}; })()`,
  );
});

Then('the mic button is not shown', async function (this: object) {
  await page(this).waitForFunction(
    `document.querySelector('[data-testid="mic-button"]') === null`,
  );
});

When('the user presses and holds the mic button', async function (this: object) {
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerdown');
});

When('the user releases the held mic button', async function (this: object) {
  // Wait past the tap/hold threshold so the release counts as a hold (send),
  // not a tap (latch).
  await page(this).waitForTimeout(350);
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerup');
});

When('the user taps the mic button', async function (this: object) {
  // Down then straight back up — under the hold threshold, so it latches.
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerdown');
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerup');
});

When('the user clicks the recording send control', async function (this: object) {
  await page(this).click('[data-testid="mic-send"]');
});

When('the user clicks the recording cancel control', async function (this: object) {
  await page(this).click('[data-testid="mic-cancel"]');
});
