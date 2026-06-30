// #ChatPanel
// Step defs for the @web chat-panel scenarios. They drive the package's demo
// page in headless Chromium: the demo is bundled once per run with the same
// `bun build demo.html` line deploy.yml uses, served to the page via
// Playwright request interception (no HTTP server), and asserted through the
// component's data-cp-* attributes plus the demo's #out event log.
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
  const dist = await mkdtemp(join(tmpdir(), 'cp-demo-'));
  await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: PKG_DIR });
  const { chromium } = await import('playwright');
  const executablePath = findChromium(chromium);
  if (!executablePath) {
    throw new Error(
      'chat-panel steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ' +
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
  _cpDemoPage?: Page;
}

function page(world: DemoWorld): Page {
  assert.ok(world._cpDemoPage, 'no demo page — missing "Given the chat-panel demo page"?');
  return world._cpDemoPage;
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
  await this._cpDemoPage?.close();
  this._cpDemoPage = undefined;
});

AfterAll(async function () {
  if (!session) return;
  const { browser, dist } = await session;
  await browser.close();
  await rm(dist, { recursive: true, force: true });
});

// ── steps ────────────────────────────────────────────────────────────────────

Given('the chat-panel demo page', { timeout: 60_000 }, async function (this: DemoWorld) {
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
  await p.goto('http://chat-panel.demo/demo.html');
  await p.waitForSelector('#out');
  this._cpDemoPage = p;
});

When('the user sends the chat message {string}', async function (this: DemoWorld, text: string) {
  const p = page(this);
  await p.fill('#demo-chat-input', text);
  await p.press('#demo-chat-input', 'Enter');
});

Then('a chat user bubble shows {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '[data-cp-message="user"]', expected);
});

Then('an assistant reply shows {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '[data-cp-message="assistant"]', expected);
});

Then('the chat input is empty', async function (this: DemoWorld) {
  assert.equal(await page(this).inputValue('#demo-chat-input'), '');
});

When('the user adds an error reply', async function (this: DemoWorld) {
  await page(this).click('button:has-text("Add error reply")');
});

Then('an assistant error shows {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '[data-cp-error]', expected);
});

When('the user adds a reply with request detail', async function (this: DemoWorld) {
  await page(this).click('button:has-text("Add reply with detail")');
});

When('the user expands the request detail', async function (this: DemoWorld) {
  await page(this).click('[data-cp-detail-toggle]');
});

Then('the request detail shows {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '[data-cp-detail]', expected);
});

When('the user toggles chat streaming', async function (this: DemoWorld) {
  await page(this).click('button:has-text("Toggle streaming")');
});

Then('the chat shows it is running', async function (this: DemoWorld) {
  await page(this).waitForSelector('[data-cp-running]');
});

When('the user clicks the chat stop button', async function (this: DemoWorld) {
  await page(this).click('[data-cp-stop]');
});

Then('the chat event log shows {string}', async function (this: DemoWorld, expected: string) {
  await expectText(page(this), '#out', expected);
});

When('the user clicks the prefill button', async function (this: DemoWorld) {
  await page(this).click('button:has-text("Prefill draft")');
});

Then('the chat input contains {string}', async function (this: DemoWorld, expected: string) {
  const p = page(this);
  await p.waitForFunction(
    `document.querySelector('#demo-chat-input')?.value === ${JSON.stringify(expected)}`,
  );
});

When('the user presses and holds the mic button', async function (this: DemoWorld) {
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerdown');
});

When('the user releases the held mic button', async function (this: DemoWorld) {
  // Wait past the tap/hold threshold so the release counts as a hold (send),
  // not a tap (latch).
  await page(this).waitForTimeout(350);
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerup');
});

When('the user taps the mic button', async function (this: DemoWorld) {
  // Down then straight back up — under the hold threshold, so it latches.
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerdown');
  await page(this).dispatchEvent('[data-testid="mic-button"]', 'pointerup');
});

When('the user clicks the recording send control', async function (this: DemoWorld) {
  await page(this).click('[data-testid="mic-send"]');
});

When('the user clicks the recording cancel control', async function (this: DemoWorld) {
  await page(this).click('[data-testid="mic-cancel"]');
});
