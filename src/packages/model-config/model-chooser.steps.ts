// #ModelChooser
// Step defs for the @web model-config scenarios. They drive the package's demo
// page (see tests/demo-harness.ts); the demo prints the resolved config as
// JSON into #out, which expectResolved polls. The demo's chooser runs against a
// stub provider, so nothing here reaches a real API.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { Page } from 'playwright';
import { bindDemoPage, expectText } from '../../tests/demo-harness.ts';

const page = bindDemoPage({ name: 'model-config', pkgDir: import.meta.dirname });

/** Poll #out until the resolved config's field matches, with a readable failure. */
async function expectResolved(p: Page, field: string, expected: unknown): Promise<void> {
  const pred =
    `(() => { try { return JSON.parse(document.querySelector('#out').textContent)` +
    `[${JSON.stringify(field)}] === ${JSON.stringify(expected)}; } catch { return false; } })()`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    assert.fail(
      `expected resolved ${field} to be ${JSON.stringify(expected)}; demo shows: ${await p.textContent('#out')}`,
    );
  }
}

// ── adding a key ─────────────────────────────────────────────────────────────

When(
  'the user types {string} into the key input',
  async function (this: object, value: string) {
    await page(this).fill('[data-mc-keyinput]', value);
  },
);

When('the user presses Enter in the key input', async function (this: object) {
  await page(this).press('[data-mc-keyinput]', 'Enter');
});

When('the user adds the key {string}', async function (this: object, value: string) {
  const p = page(this);
  await p.fill('[data-mc-keyinput]', value);
  await p.click('[data-mc-add]');
});

Then('the key input is empty', async function (this: object) {
  assert.equal(await page(this).inputValue('[data-mc-keyinput]'), '');
});

Then("the chooser's Add button is disabled", async function (this: object) {
  assert.equal(await page(this).isDisabled('[data-mc-add]'), true);
});

Then("the chooser's Add button is enabled", async function (this: object) {
  assert.equal(await page(this).isDisabled('[data-mc-add]'), false);
});

// ── cards ────────────────────────────────────────────────────────────────────

Then(
  'the chooser shows a card for {string} named {string}',
  async function (this: object, provider: string, name: string) {
    await expectText(page(this), `[data-mc-card="${provider}"]`, name);
  },
);

Then('no provider card is shown', async function (this: object) {
  const cards = await page(this).$$('[data-mc-card]');
  assert.equal(cards.length, 0, `expected no provider cards, found ${cards.length}`);
});

Then(
  'the chooser shows {int} provider card(s)',
  async function (this: object, expected: number) {
    const cards = await page(this).$$('[data-mc-card]');
    assert.equal(cards.length, expected);
  },
);

Then(
  'the chooser shows the empty row {string}',
  async function (this: object, text: string) {
    await expectText(page(this), '[data-mc-empty]', text);
  },
);

When('the user clicks the {string} card', async function (this: object, provider: string) {
  await page(this).click(`[data-mc-card="${provider}"]`);
});

When('the user deletes the {string} card', async function (this: object, provider: string) {
  await page(this).click(`[data-mc-remove="${provider}"]`);
});

When('the user refreshes the {string} card', async function (this: object, provider: string) {
  await page(this).click(`[data-mc-refresh="${provider}"]`);
});

Then('the {string} card has a refresh button', async function (this: object, provider: string) {
  await page(this).waitForSelector(`[data-mc-refresh="${provider}"]`, { timeout: 5_000 });
});

// Only the selected card renders a body, so "selected" is checked by the
// presence of its model rows rather than by reading a style.
Then('the {string} card is selected', async function (this: object, provider: string) {
  await page(this).waitForSelector(`[data-mc-card="${provider}"] ~ div [data-mc-role]`, {
    timeout: 5_000,
  });
});

Then('the {string} card shows no model rows', async function (this: object, provider: string) {
  const rows = await page(this).$$(`[data-mc-card="${provider}"] ~ div [data-mc-role]`);
  assert.equal(rows.length, 0, `expected the ${provider} card to be collapsed`);
});

Then(
  "the {string} card's {word} model is {string}",
  async function (this: object, provider: string, role: string, modelId: string) {
    await page(this).waitForSelector(
      `[data-mc-card="${provider}"] ~ div [data-mc-role="${role}"][data-mc-model="${modelId}"]`,
      { timeout: 5_000 },
    );
  },
);

Then(
  "the {string} card's {string} cost line matches {string}",
  async function (this: object, provider: string, role: string, expected: string) {
    await expectText(
      page(this),
      `[data-mc-card="${provider}"] ~ div [data-mc-role="${role}"] [data-mc-cost]`,
      expected,
    );
  },
);

// ── tags ─────────────────────────────────────────────────────────────────────

Then(
  'the {string} card shows the tag {string}',
  async function (this: object, provider: string, tag: string) {
    const attr = tag === 'VOICE' ? 'data-mc-voice' : 'data-mc-tier';
    await expectText(page(this), `[${attr}="${provider}"]`, tag);
  },
);

Then('the {string} card shows no tier tag', async function (this: object, provider: string) {
  const tags = await page(this).$$(`[data-mc-tier="${provider}"]`);
  assert.equal(tags.length, 0, `expected no tier tag on the ${provider} card`);
});

Then('the {string} card shows no VOICE tag', async function (this: object, provider: string) {
  const tags = await page(this).$$(`[data-mc-voice="${provider}"]`);
  assert.equal(tags.length, 0, `expected no VOICE tag on the ${provider} card`);
});

// ── the Puter sign-in block ──────────────────────────────────────────────────

When('the user clicks the Puter sign-in button', async function (this: object) {
  await page(this).click('[data-mc-puter]');
});

Then(
  'the chooser shows the Puter sign-in button reading {string}',
  async function (this: object, label: string) {
    await expectText(page(this), '[data-mc-puter]', label);
  },
);

Then('the Puter sign-in button is disabled', async function (this: object) {
  assert.equal(await page(this).isDisabled('[data-mc-puter]'), true);
});

// ── errors, footer, help link ────────────────────────────────────────────────

Then('the chooser shows the error {string}', async function (this: object, text: string) {
  await expectText(page(this), '[data-mc-error]', text);
});

Then('the chooser shows no error', async function (this: object) {
  await page(this).waitForSelector('[data-mc-error]', { state: 'detached', timeout: 5_000 });
});

Then("the chooser's footer reads {string}", async function (this: object, text: string) {
  await expectText(page(this), '[data-mc-providers]', text);
});

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

// ── resolved config ──────────────────────────────────────────────────────────

When('the demo page reloads', async function (this: object) {
  const p = page(this);
  await p.reload();
  await p.waitForSelector('#out');
});

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

Then(
  'the demo shows resolved geminiKey {string}',
  async function (this: object, expected: string) {
    await expectResolved(page(this), 'geminiKey', expected);
  },
);

Then('the demo shows resolved geminiKey null', async function (this: object) {
  await expectResolved(page(this), 'geminiKey', null);
});
