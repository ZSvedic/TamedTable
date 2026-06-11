// #TableView
// Step defs for the @web table-view scenarios. They drive the package's demo
// page in headless Chromium: the demo is bundled once per run with the same
// `bun build demo.html` line deploy.yml uses, served to the page via
// Playwright request interception (no HTTP server), and asserted through the
// component's data-tv-* attributes plus the demo's #out event log.
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
function findChromium(): string | undefined {
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
  const dist = await mkdtemp(join(tmpdir(), 'tv-demo-'));
  await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: PKG_DIR });
  const { chromium } = await import('playwright');
  const executablePath = findChromium();
  if (!executablePath) {
    throw new Error(
      'table-view steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ' +
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
  _tvDemoPage?: Page;
}

function page(world: DemoWorld): Page {
  assert.ok(world._tvDemoPage, 'no demo page — missing "Given the table-view demo page"?');
  return world._tvDemoPage;
}

/** Poll an element's text until it contains `expected`, with a readable failure. */
async function expectText(p: Page, selector: string, expected: string): Promise<void> {
  const pred =
    `(document.querySelector(${JSON.stringify(selector)})?.textContent ?? '')` +
    `.includes(${JSON.stringify(expected)})`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    assert.fail(
      `expected ${selector} to show "${expected}"; demo shows: ${await p.textContent(selector)}`,
    );
  }
}

After(async function (this: DemoWorld) {
  await this._tvDemoPage?.close();
  this._tvDemoPage = undefined;
});

AfterAll(async function () {
  if (!session) return;
  const { browser, dist } = await session;
  await browser.close();
  await rm(dist, { recursive: true, force: true });
});

// ── steps ────────────────────────────────────────────────────────────────────

Given('the table-view demo page', { timeout: 60_000 }, async function (this: DemoWorld) {
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
  await p.goto('http://table-view.demo/demo.html');
  await p.waitForSelector('#out');
  this._tvDemoPage = p;
});

Then('the demo range reads {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '[data-tv-range]', expected);
});

Then('the demo table has {int} body rows', async function (this: DemoWorld, expected: number) {
  const count = await page(this).$$eval('tbody tr', (els) => els.length);
  assert.equal(count, expected);
});

Then('page {int} is the current page', async function (this: DemoWorld, n: number) {
  const current = await page(this).getAttribute(`[data-tv-page="${n}"]`, 'aria-current');
  assert.equal(current, 'page');
});

When('the user clicks next page', async function (this: DemoWorld) {
  await page(this).click('[data-tv-next]');
});

When('the user clicks page {int}', async function (this: DemoWorld, n: number) {
  await page(this).click(`[data-tv-page="${n}"]`);
});

When('the user clicks cell {string}', async function (this: DemoWorld, cell: string) {
  await page(this).click(`[data-tv-cell="${cell}"]`);
});

Then('the footer selection reads {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '[data-tv-selection]', expected);
});

When(
  'the user edits cell {string} to {string}',
  async function (this: DemoWorld, cell: string, value: string) {
    const p = page(this);
    await p.dblclick(`[data-tv-cell="${cell}"]`);
    await p.fill('[data-tv-edit]', value);
    await p.press('[data-tv-edit]', 'Enter');
  },
);

Then('cell {string} shows {string}', async function (this: DemoWorld, cell: string, expected: string) {
  await expectText(page(this), `[data-tv-cell="${cell}"]`, expected);
});

Then('the demo event log shows {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '#out', expected);
});

When(
  'the user drags the {string} header onto the {string} header',
  async function (this: DemoWorld, from: string, to: string) {
    // HTML5 drag-and-drop: dispatch the events the component listens for —
    // Playwright's mouse-based dragTo doesn't produce dragstart/drop.
    const p = page(this);
    await p.dispatchEvent(`[data-tv-header="${from}"]`, 'dragstart');
    await p.dispatchEvent(`[data-tv-header="${to}"]`, 'drop');
  },
);

Then('the first column header is {string}', async function (this: DemoWorld, expected: string) {
  // Header cell 1 is the row-number column; cell 2 is the first data column.
  await expectText(page(this), 'thead th:nth-child(2)', expected);
});

When('the user toggles streaming', async function (this: DemoWorld) {
  await page(this).click('button:has-text("Toggle streaming")');
});

Then('the streaming banner is visible', async function (this: DemoWorld) {
  await page(this).waitForSelector('[data-tv-streaming]');
});

Then('the footer status is {string}', async function (this: DemoWorld, expected: string) {
  await page(this).waitForSelector(`[data-tv-status="${expected}"]`);
});
