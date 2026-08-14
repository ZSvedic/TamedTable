// #VoicePort
// Step defs for the @web voice-input scenarios. They drive the package's demo
// page (see tests/demo-harness.ts) in a Chromium launched with a FAKE
// microphone (--use-fake-device-for-media-stream), so the record → stop → WAV
// round trip runs end to end with no permission prompt and no real audio
// hardware.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { bindDemoPage } from '../../tests/demo-harness.ts';

const page = bindDemoPage({
  name: 'voice-input',
  pkgDir: import.meta.dirname,
  pageTimeout: 10_000,
  launchArgs: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    // getUserMedia requires a secure context; bless the demo origin.
    '--unsafely-treat-insecure-origin-as-secure=http://voice-input.demo',
  ],
});

// ── steps ────────────────────────────────────────────────────────────────────

Then('the demo prompt mentions {string}', async function (this: object, expected: string) {
  const text = (await page(this).textContent('#out')) ?? '';
  assert.ok(text.includes(expected), `#out does not mention "${expected}": ${text}`);
});

When('the user starts recording', { timeout: 30_000 }, async function (this: object) {
  const p = page(this);
  await p.click('#vi-start');
  // Reaching the 'recording' state means getUserMedia resolved and the
  // MediaRecorder started: slow to spin up the first time under a full-suite
  // load, so allow more than the 10s page default (matches the stop/result
  // steps below). The work succeeds; it is just not instant on a busy machine.
  await p.waitForFunction(
    `document.querySelector('#vi-state')?.textContent === 'recording'`,
    undefined,
    { timeout: 20_000 },
  );
  // Give the fake device a beat to produce audio before a stop step.
  await p.waitForTimeout(300);
});

When('the user stops recording', { timeout: 30_000 }, async function (this: object) {
  await page(this).click('#vi-stop');
});

When('the user cancels recording', async function (this: object) {
  await page(this).click('#vi-cancel');
});

Then(
  'the recording result shows {string}',
  { timeout: 30_000 },
  async function (this: object, expected: string) {
    const p = page(this);
    const pred = `(document.querySelector('#vi-result')?.textContent ?? '').includes(${JSON.stringify(expected)})`;
    try {
      await p.waitForFunction(pred, undefined, { timeout: 20_000 });
    } catch {
      assert.fail(`expected the result to show "${expected}"; it shows: ${await p.textContent('#vi-result')}`);
    }
  },
);

Then('the voice state is {string}', async function (this: object, expected: string) {
  await page(this).waitForFunction(
    `document.querySelector('#vi-state')?.textContent === ${JSON.stringify(expected)}`,
  );
});
