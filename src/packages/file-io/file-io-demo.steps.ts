// #FileIO
// Step defs for the @web file-io scenarios. They drive the package's demo
// page in headless Chromium: the demo is bundled once per run with the same
// `bun build demo.html` line deploy.yml uses, served to the page via
// Playwright request interception (no HTTP server), and asserted through the
// demo's #fio-* elements. Table URLs the scenarios fetch are served from a
// per-page fixture map by the same interceptor — no network.
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
  const dist = await mkdtemp(join(tmpdir(), 'fio-demo-'));
  await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: PKG_DIR });
  const { chromium } = await import('playwright');
  const executablePath = findChromium(chromium);
  if (!executablePath) {
    throw new Error(
      'file-io steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ' +
        '/opt/pw-browsers, or ~/.cache/ms-playwright. ' +
        'Install one with `bunx playwright install chromium`.',
    );
  }
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  return { browser, dist };
}

interface Fixture {
  status: number;
  body: string;
  contentType?: string;
}

// The only shape these steps need from the cucumber World — two private
// properties, keeping the package independent of the app harness.
interface DemoWorld {
  _fioDemoPage?: Page;
  _fioFixtures?: Map<string, Fixture>;
}

function page(world: DemoWorld): Page {
  assert.ok(world._fioDemoPage, 'no demo page — missing "Given the file-io demo page"?');
  return world._fioDemoPage;
}

/** Quoted step arguments write newlines as the two characters `\n`. */
const unescape = (s: string): string => s.replaceAll('\\n', '\n');

/** Poll an element's text until it matches, with a readable failure. */
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
  await this._fioDemoPage?.close();
  this._fioDemoPage = undefined;
  this._fioFixtures = undefined;
});

AfterAll(async function () {
  if (!session) return;
  const { browser, dist } = await session;
  await browser.close();
  await rm(dist, { recursive: true, force: true });
});

// ── steps ────────────────────────────────────────────────────────────────────

Given('the file-io demo page', { timeout: 60_000 }, async function (this: DemoWorld) {
  session ??= startSession();
  const { browser, dist } = await session;
  const p = await browser.newPage();
  // Fail fast: a missing element should red the step in seconds, not minutes.
  p.setDefaultTimeout(5_000);
  const fixtures = new Map<string, Fixture>();
  // Module scripts don't load over file://, so fulfill requests from the
  // bundle dir directly — no HTTP server needed. Fixture URLs win, with a
  // CORS header so the demo's cross-origin fetchTable call is allowed.
  await p.route('**/*', async (route) => {
    const url = route.request().url();
    const fixture = fixtures.get(url);
    if (fixture) {
      await route.fulfill({
        status: fixture.status,
        body: fixture.body,
        contentType: fixture.contentType,
        headers: { 'access-control-allow-origin': '*' },
      });
      return;
    }
    const { pathname } = new URL(url);
    const file = join(dist, pathname);
    if (existsSync(file)) await route.fulfill({ path: file });
    else await route.fulfill({ status: 404, body: 'not found' });
  });
  await p.goto('http://file-io.demo/demo.html');
  await p.waitForSelector('#out');
  this._fioDemoPage = p;
  this._fioFixtures = fixtures;
});

Given(
  'the demo network serves {string} with body {string} and content type {string}',
  function (this: DemoWorld, url: string, body: string, contentType: string) {
    this._fioFixtures!.set(url, { status: 200, body: unescape(body), contentType });
  },
);

Given(
  'the demo network serves {string} with status {int}',
  function (this: DemoWorld, url: string, status: number) {
    this._fioFixtures!.set(url, { status, body: '' });
  },
);

When('the user fetches {string} in the demo', async function (this: DemoWorld, url: string) {
  const p = page(this);
  await p.fill('#fio-url', url);
  await p.click('#fio-fetch');
});

Then('the demo shows file name {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '#fio-name', expected);
});

Then('the demo shows format {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '#fio-format', expected);
});

Then('the demo preview contains {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '#fio-preview', expected);
});

Then(
  'the demo shows an error mentioning {string}',
  async function (this: DemoWorld, expected: string) {
    await expectText(page(this), '#fio-error', expected);
  },
);

Then('the demo capability line reports the File System Access API', async function (
  this: DemoWorld,
) {
  const text = (await page(this).textContent('#fio-fsa')) ?? '';
  assert.match(text, /File System Access API: (available|missing)/);
});
