// #UiKit
// Step defs for the @web ui-kit scenarios. They drive the package's demo
// page in headless Chromium: the demo is bundled once per run with the same
// `bun build demo.html` line deploy.yml uses, served to the page via
// Playwright request interception (no HTTP server), and asserted through the
// components' data-uk-* attributes plus the demo's #out event log.
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
  const dist = await mkdtemp(join(tmpdir(), 'uk-demo-'));
  await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: PKG_DIR });
  const { chromium } = await import('playwright');
  const executablePath = findChromium(chromium);
  if (!executablePath) {
    throw new Error(
      'ui-kit steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ' +
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
  _ukDemoPage?: Page;
}

function page(world: DemoWorld): Page {
  assert.ok(world._ukDemoPage, 'no demo page — missing "Given the ui-kit demo page"?');
  return world._ukDemoPage;
}

After(async function (this: DemoWorld) {
  await this._ukDemoPage?.close();
  this._ukDemoPage = undefined;
});

AfterAll(async function () {
  if (!session) return;
  const { browser, dist } = await session;
  await browser.close();
  await rm(dist, { recursive: true, force: true });
});

// ── steps ────────────────────────────────────────────────────────────────────

Given('the ui-kit demo page', { timeout: 60_000 }, async function (this: DemoWorld) {
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
  await p.goto('http://ui-kit.demo/demo.html');
  await p.waitForSelector('#out');
  this._ukDemoPage = p;
});

Then('the demo shows a {string} button', async function (this: DemoWorld, variant: string) {
  await page(this).waitForSelector(`[data-uk-button="${variant}"]`);
});

When('the user clicks the {string} button', async function (this: DemoWorld, variant: string) {
  await page(this).click(`[data-uk-button="${variant}"]`);
});

Then('the demo log shows {string}', async function (this: DemoWorld, expected: string) {
  const p = page(this);
  const pred = `(document.querySelector('#out')?.textContent ?? '').includes(${JSON.stringify(expected)})`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    assert.fail(`expected the log to show "${expected}"; it shows: ${await p.textContent('#out')}`);
  }
});

Then('the demo renders all 19 icon names', async function (this: DemoWorld) {
  const distinct = await page(this).evaluate(
    `new Set([...document.querySelectorAll('[data-uk-icon]')].map((el) => el.getAttribute('data-uk-icon'))).size`,
  );
  assert.equal(distinct, 19);
});

When('the user clicks the theme toggle', async function (this: DemoWorld) {
  await page(this).click('button[title="Toggle light/dark"]');
});

Then('the demo is in {string} mode', async function (this: DemoWorld, mode: string) {
  await page(this).waitForSelector(`[data-uk-mode="${mode}"]`);
});

When('the user clicks the split button caret', async function (this: DemoWorld) {
  await page(this).click('[data-uk-split-caret]');
});

When('the user picks the menu item {string}', async function (this: DemoWorld, label: string) {
  await page(this).click(`[data-uk-menu-item="${label}"]`);
});

Then('the split button menu is closed', async function (this: DemoWorld) {
  await page(this).waitForSelector('[data-uk-menu-item]', { state: 'detached' });
});

When('the user adds an {string} toast', async function (this: DemoWorld, kind: string) {
  await page(this).click(`button:has-text("Add ${kind} toast")`);
});

Then('an {string} toast is visible', async function (this: DemoWorld, kind: string) {
  await page(this).waitForSelector(`[data-uk-toast="${kind}"]`);
});

When('the user dismisses the first toast', async function (this: DemoWorld) {
  await page(this).click('[data-uk-toast-dismiss]');
});

Then('no toast is visible', async function (this: DemoWorld) {
  await page(this).waitForSelector('[data-uk-toast]', { state: 'detached' });
});
