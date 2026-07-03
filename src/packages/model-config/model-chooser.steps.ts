// #ModelChooser
// Step defs for the @web model-config scenarios. They drive the package's demo
// page (see tests/demo-harness.ts); the demo prints the resolved config as
// JSON into #out, which expectResolved polls.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { Page } from 'playwright';
import { bindDemoPage } from '../../tests/demo-harness.ts';

const page = bindDemoPage({ name: 'model-config', pkgDir: import.meta.dirname });

/** Poll #out until the resolved config's field matches, with a readable failure. */
async function expectResolved(p: Page, field: string, expected: string): Promise<void> {
  const pred =
    `(() => { try { return JSON.parse(document.querySelector('#out').textContent)` +
    `[${JSON.stringify(field)}] === ${JSON.stringify(expected)}; } catch { return false; } })()`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    assert.fail(
      `expected resolved ${field} to be "${expected}"; demo shows: ${await p.textContent('#out')}`,
    );
  }
}

// ── steps ────────────────────────────────────────────────────────────────────

When(
  'the user clicks the {string} provider card',
  async function (this: object, name: string) {
    await page(this).click(`[data-mc-card]:has-text("${name}")`);
  },
);

// Only the expanded card renders its default rows, and each provider's default
// ids are unique, so matching on role + model id is enough to pin the card.
Then(
  "the {string} card's primary default is {string}",
  async function (this: object, _provider: string, modelId: string) {
    await page(this).waitForSelector(`[data-mc-role="primary"][data-mc-model="${modelId}"]`, {
      timeout: 5_000,
    });
  },
);

Then(
  "the {string} card's secondary default is {string}",
  async function (this: object, _provider: string, modelId: string) {
    await page(this).waitForSelector(`[data-mc-role="secondary"][data-mc-model="${modelId}"]`, {
      timeout: 5_000,
    });
  },
);

When(
  'the user types {string} into the {string} key field',
  async function (this: object, value: string, provider: string) {
    await page(this).fill(`[data-mc-key="${provider}"]`, value);
  },
);

When(
  'the user clicks the {string} key reveal toggle',
  async function (this: object, provider: string) {
    await page(this).click(`[data-mc-reveal="${provider}"]`);
  },
);

Then(
  'the {string} card shows its API-key field and model list',
  async function (this: object, provider: string) {
    const p = page(this);
    await p.waitForSelector(`[data-mc-key="${provider}"]`, { timeout: 5_000 });
    const models = await p.$$('[data-mc-model]');
    assert.ok(models.length > 0, `no models listed for expanded provider "${provider}"`);
  },
);

Then('no card shows an API-key field', async function (this: object) {
  await page(this).waitForSelector('[data-mc-key]', { state: 'detached', timeout: 5_000 });
});

Then(
  'the {string} key field hides its value',
  async function (this: object, provider: string) {
    const type = await page(this).getAttribute(`[data-mc-key="${provider}"]`, 'type');
    assert.equal(type, 'password', `expected the ${provider} key input to be masked`);
  },
);

Then(
  'the {string} key field shows {string}',
  async function (this: object, provider: string, value: string) {
    const p = page(this);
    const sel = `[data-mc-key="${provider}"]`;
    assert.equal(await p.getAttribute(sel, 'type'), 'text', 'expected the key input to be revealed');
    assert.equal(await p.inputValue(sel), value);
  },
);

Then(
  "the {string} card's Get-API-key link opens {string} in a new tab",
  async function (this: object, provider: string, url: string) {
    const p = page(this);
    const sel = `[data-mc-keyurl="${provider}"]`;
    await p.waitForSelector(sel, { timeout: 5_000 });
    assert.equal(await p.getAttribute(sel, 'href'), url);
    assert.equal(await p.getAttribute(sel, 'target'), '_blank');
    assert.match(await p.getAttribute(sel, 'rel') ?? '', /noopener/);
  },
);

Then(
  'the chooser shows a BYOK help link to {string} in a new tab',
  async function (this: object, url: string) {
    const p = page(this);
    await p.waitForSelector('[data-mc-byok]', { timeout: 5_000 });
    assert.ok(
      (await p.getAttribute('[data-mc-byok]', 'href'))?.includes(url),
      `expected the BYOK help link href to include "${url}"`,
    );
    assert.equal(await p.getAttribute('[data-mc-byok]', 'target'), '_blank');
    assert.match(await p.getAttribute('[data-mc-byok]', 'rel') ?? '', /noopener/);
  },
);

Then(
  'the chooser shows a change-models help link to {string} in a new tab',
  async function (this: object, url: string) {
    const p = page(this);
    await p.waitForSelector('[data-mc-changemodels]', { timeout: 5_000 });
    assert.ok(
      (await p.getAttribute('[data-mc-changemodels]', 'href'))?.includes(url),
      `expected the change-models help link href to include "${url}"`,
    );
    assert.equal(await p.getAttribute('[data-mc-changemodels]', 'target'), '_blank');
    assert.match(await p.getAttribute('[data-mc-changemodels]', 'rel') ?? '', /noopener/);
  },
);

Then(
  'the demo shows resolved provider {string}',
  async function (this: object, expected: string) {
    await expectResolved(page(this), 'provider', expected);
  },
);

Then(
  'the demo shows resolved model {string}',
  async function (this: object, expected: string) {
    await expectResolved(page(this), 'model', expected);
  },
);

Then(
  'the demo shows resolved cellModel {string}',
  async function (this: object, expected: string) {
    await expectResolved(page(this), 'cellModel', expected);
  },
);

Then(
  'the demo shows resolved anthropicKey {string}',
  async function (this: object, expected: string) {
    await expectResolved(page(this), 'anthropicKey', expected);
  },
);
