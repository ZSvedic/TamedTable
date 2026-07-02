// #ModelConfig #ProviderSelect
// Step defs for the @web ModelChooser scenarios. They drive the package's
// demo page in headless Chromium: the demo is bundled once per run with the
// same `bun build demo.html` line deploy.yml uses, served to the page via
// Playwright request interception (no HTTP server), and asserted through the
// component's data-mc-* attributes plus the demo's #out resolved-config JSON.
import { After, AfterAll, Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Browser, Page } from 'playwright';

const PKG_DIR = import.meta.dirname;

// Same scan as tests/demo.smoke.test.ts: a Playwright-managed Chromium under
// $PLAYWRIGHT_BROWSERS_PATH (container images) or ~/.cache/ms-playwright,
// newest build first, whatever the build number.
function findChromium(chromium: { executablePath(): string }): string | undefined {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers',
    join(homedir(), '.cache', 'ms-playwright'),
  ];
  const bins = [join('chrome-linux', 'chrome'), join('chrome-linux64', 'chrome')];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const builds = readdirSync(root)
      .filter((dir) => /^chromium-\d+$/.test(dir))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const build of builds) {
      for (const bin of bins) {
        const path = join(root, build, bin);
        if (existsSync(path)) return path;
      }
    }
  }
  // macOS/Windows: the scan above only knows the Linux layout and cache dir,
  // so fall back to Playwright's own resolved path, correct for the host platform.
  try {
    const fallback = chromium.executablePath();
    if (fallback && existsSync(fallback)) return fallback;
  } catch { /* Playwright cannot resolve a path — fall through to undefined */ }
  return undefined;
}

interface DemoSession {
  browser: Browser;
  dist: string;
}

// Built lazily by the first @web scenario so @headless/@cli runs never build
// the bundle or launch a browser.
let session: Promise<DemoSession> | undefined;

async function startSession(): Promise<DemoSession> {
  const dist = await mkdtemp(join(tmpdir(), 'mc-demo-'));
  await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: PKG_DIR });
  const { chromium } = await import('playwright');
  const executablePath = findChromium(chromium);
  if (!executablePath) {
    throw new Error(
      'model-chooser steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ' +
        '/opt/pw-browsers, or ~/.cache/ms-playwright. ' +
        'Install one with `bunx playwright install chromium`.',
    );
  }
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  return { browser, dist };
}

// The only shape these steps need from the cucumber World — one private
// property, keeping the package independent of the app harness.
interface DemoWorld {
  _mcDemoPage?: Page;
}

function page(world: DemoWorld): Page {
  assert.ok(world._mcDemoPage, 'no demo page — missing "Given the model-config demo page"?');
  return world._mcDemoPage;
}

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

After(async function (this: DemoWorld) {
  await this._mcDemoPage?.close();
  this._mcDemoPage = undefined;
});

AfterAll(async function () {
  if (!session) return;
  const { browser, dist } = await session;
  await browser.close();
  await rm(dist, { recursive: true, force: true });
});

// ── steps ────────────────────────────────────────────────────────────────────

Given('the model-config demo page', { timeout: 60_000 }, async function (this: DemoWorld) {
  session ??= startSession();
  const { browser, dist } = await session;
  const p = await browser.newPage();
  // Fail fast: a missing element should red the step in seconds, not minutes.
  p.setDefaultTimeout(5_000);
  // Module scripts don't load over file://, so fulfill requests from the
  // bundle dir directly — no HTTP server needed.
  await p.route('**/*', async (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(dist, pathname);
    if (existsSync(file)) await route.fulfill({ path: file });
    else await route.fulfill({ status: 404, body: 'not found' });
  });
  await p.goto('http://model-config.demo/demo.html');
  await p.waitForSelector('#out');
  this._mcDemoPage = p;
});

When(
  'the user clicks the {string} provider card',
  async function (this: DemoWorld, name: string) {
    await page(this).click(`[data-mc-card]:has-text("${name}")`);
  },
);

// Only the expanded card renders its default rows, and each provider's default
// ids are unique, so matching on role + model id is enough to pin the card.
Then(
  "the {string} card's primary default is {string}",
  async function (this: DemoWorld, _provider: string, modelId: string) {
    await page(this).waitForSelector(`[data-mc-role="primary"][data-mc-model="${modelId}"]`, {
      timeout: 5_000,
    });
  },
);

Then(
  "the {string} card's secondary default is {string}",
  async function (this: DemoWorld, _provider: string, modelId: string) {
    await page(this).waitForSelector(`[data-mc-role="secondary"][data-mc-model="${modelId}"]`, {
      timeout: 5_000,
    });
  },
);

When(
  'the user types {string} into the {string} key field',
  async function (this: DemoWorld, value: string, provider: string) {
    await page(this).fill(`[data-mc-key="${provider}"]`, value);
  },
);

When(
  'the user clicks the {string} key reveal toggle',
  async function (this: DemoWorld, provider: string) {
    await page(this).click(`[data-mc-reveal="${provider}"]`);
  },
);

Then(
  'the {string} card shows its API-key field and model list',
  async function (this: DemoWorld, provider: string) {
    const p = page(this);
    await p.waitForSelector(`[data-mc-key="${provider}"]`, { timeout: 5_000 });
    const models = await p.$$('[data-mc-model]');
    assert.ok(models.length > 0, `no models listed for expanded provider "${provider}"`);
  },
);

Then('no card shows an API-key field', async function (this: DemoWorld) {
  await page(this).waitForSelector('[data-mc-key]', { state: 'detached', timeout: 5_000 });
});

Then(
  'the {string} key field hides its value',
  async function (this: DemoWorld, provider: string) {
    const type = await page(this).getAttribute(`[data-mc-key="${provider}"]`, 'type');
    assert.equal(type, 'password', `expected the ${provider} key input to be masked`);
  },
);

Then(
  'the {string} key field shows {string}',
  async function (this: DemoWorld, provider: string, value: string) {
    const p = page(this);
    const sel = `[data-mc-key="${provider}"]`;
    assert.equal(await p.getAttribute(sel, 'type'), 'text', 'expected the key input to be revealed');
    assert.equal(await p.inputValue(sel), value);
  },
);

Then(
  "the {string} card's Get-API-key link opens {string} in a new tab",
  async function (this: DemoWorld, provider: string, url: string) {
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
  async function (this: DemoWorld, url: string) {
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
  async function (this: DemoWorld, url: string) {
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
  async function (this: DemoWorld, expected: string) {
    await expectResolved(page(this), 'provider', expected);
  },
);

Then(
  'the demo shows resolved model {string}',
  async function (this: DemoWorld, expected: string) {
    await expectResolved(page(this), 'model', expected);
  },
);

Then(
  'the demo shows resolved cellModel {string}',
  async function (this: DemoWorld, expected: string) {
    await expectResolved(page(this), 'cellModel', expected);
  },
);

Then(
  'the demo shows resolved anthropicKey {string}',
  async function (this: DemoWorld, expected: string) {
    await expectResolved(page(this), 'anthropicKey', expected);
  },
);
