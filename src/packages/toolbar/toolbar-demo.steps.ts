// #Toolbar
// Step defs for the @web toolbar scenarios. They drive the package's demo page
// in headless Chromium: the demo is bundled once per run with the same
// `bun build demo.html` line deploy.yml uses, served to the page via
// Playwright request interception (no HTTP server), and asserted through the
// component's data-tb-* attributes plus the demo's #out event log.
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
  const dist = await mkdtemp(join(tmpdir(), 'tb-demo-'));
  await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: PKG_DIR });
  const { chromium } = await import('playwright');
  const executablePath = findChromium(chromium);
  if (!executablePath) {
    throw new Error(
      'toolbar steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ' +
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
  _tbDemoPage?: Page;
}

function page(world: DemoWorld): Page {
  assert.ok(world._tbDemoPage, 'no demo page — missing "Given the toolbar demo page"?');
  return world._tbDemoPage;
}

/** Poll an element's text until it contains `expected`, with a readable failure. */
async function expectText(p: Page, selector: string, expected: string): Promise<void> {
  const pred =
    `[...document.querySelectorAll(${JSON.stringify(selector)})]` +
    `.some((el) => (el.textContent ?? '').includes(${JSON.stringify(expected)}))`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    assert.fail(`expected ${selector} to show "${expected}"`);
  }
}

After(async function (this: DemoWorld) {
  await this._tbDemoPage?.close();
  this._tbDemoPage = undefined;
});

AfterAll(async function () {
  if (!session) return;
  const { browser, dist } = await session;
  await browser.close();
  await rm(dist, { recursive: true, force: true });
});

// ── steps ────────────────────────────────────────────────────────────────────

Given('the toolbar demo page', { timeout: 60_000 }, async function (this: DemoWorld) {
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
  await p.goto('http://toolbar.demo/demo.html');
  await p.waitForSelector('#out');
  this._tbDemoPage = p;
});

When('the user clicks the toolbar button {string}', async function (this: DemoWorld, label: string) {
  await page(this).click(`[data-tb-toolbar] button:has-text("${label}")`);
});

When('the user clicks the toolbar theme toggle', async function (this: DemoWorld) {
  await page(this).click('[data-tb-toolbar] button[title*="theme"]');
});

When('the user opens the toolbar save menu', async function (this: DemoWorld) {
  // Two split buttons carry a caret — "Open URL…" then "Save data"; the save
  // menu is the second.
  await page(this).locator('[data-tb-toolbar] [data-uk-split-caret]').nth(1).click();
});

When('the user picks the toolbar menu item {string}', async function (this: DemoWorld, label: string) {
  await page(this).click(`[data-uk-menu-item="${label}"]`);
});

Then('the toolbar event log shows {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '#out', expected);
});

When('the user opens the toolbar URL dialog', async function (this: DemoWorld) {
  await page(this).click('[data-tb-toolbar] button:has-text("Open URL")');
  await page(this).waitForSelector('[data-tb-dialog]');
});

When('the user types {string} into the toolbar URL field', async function (this: DemoWorld, url: string) {
  await page(this).fill('[data-tb-url-input]', url);
});

When('the user submits the toolbar URL dialog', async function (this: DemoWorld) {
  await page(this).click('[data-tb-dialog] button:has-text("Load")');
});

When('the user picks the first toolbar sample', async function (this: DemoWorld) {
  await page(this).click('[data-tb-sample]');
});

Then('the toolbar URL dialog is closed', async function (this: DemoWorld) {
  await page(this).waitForSelector('[data-tb-dialog]', { state: 'detached' });
});

Then('the toolbar URL field is not empty', async function (this: DemoWorld) {
  await page(this).waitForFunction(
    `(document.querySelector('[data-tb-url-input]')?.value ?? '').length > 0`,
  );
});
