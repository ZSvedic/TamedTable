// #VoicePort
// Step defs for the @web voice-input scenarios. They drive the package's demo
// page in headless Chromium launched with a FAKE microphone
// (--use-fake-device-for-media-stream), so the record → stop → WAV round trip
// runs end to end with no permission prompt and no real audio hardware. The
// demo is bundled with the same `bun build demo.html` line deploy.yml uses
// and served via Playwright request interception (no HTTP server).
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
  const dist = await mkdtemp(join(tmpdir(), 'vi-demo-'));
  await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: PKG_DIR });
  const { chromium } = await import('playwright');
  const executablePath = findChromium(chromium);
  if (!executablePath) {
    throw new Error(
      'voice-input steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ' +
        '/opt/pw-browsers, or ~/.cache/ms-playwright. ' +
        'Install one with `bunx playwright install chromium`.',
    );
  }
  const browser = await chromium.launch({
    executablePath,
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      // getUserMedia requires a secure context; bless the demo origin.
      '--unsafely-treat-insecure-origin-as-secure=http://voice-input.demo',
    ],
  });
  return { browser, dist };
}

// The only shape these steps need from the cucumber World — one private
// property, keeping the package independent of the app harness.
interface DemoWorld {
  _viDemoPage?: Page;
}

function page(world: DemoWorld): Page {
  assert.ok(world._viDemoPage, 'no demo page — missing "Given the voice-input demo page"?');
  return world._viDemoPage;
}

After(async function (this: DemoWorld) {
  await this._viDemoPage?.close();
  this._viDemoPage = undefined;
});

AfterAll(async function () {
  if (!session) return;
  const { browser, dist } = await session;
  await browser.close();
  await rm(dist, { recursive: true, force: true });
});

// ── steps ────────────────────────────────────────────────────────────────────

Given('the voice-input demo page', { timeout: 60_000 }, async function (this: DemoWorld) {
  session ??= startSession();
  const { browser, dist } = await session;
  const p = await browser.newPage();
  // Fail fast: a missing element should red the step in seconds, not minutes.
  p.setDefaultTimeout(10_000);
  // Module scripts don't load over file://, so fulfill requests from the
  // bundle dir directly — no HTTP server needed.
  await p.route('**/*', async (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(dist, pathname);
    if (existsSync(file)) await route.fulfill({ path: file });
    else await route.fulfill({ status: 404, body: 'not found' });
  });
  await p.goto('http://voice-input.demo/demo.html');
  await p.waitForSelector('#out');
  this._viDemoPage = p;
});

Then('the demo prompt mentions {string}', async function (this: DemoWorld, expected: string) {
  const text = (await page(this).textContent('#out')) ?? '';
  assert.ok(text.includes(expected), `#out does not mention "${expected}": ${text}`);
});

When('the user starts recording', async function (this: DemoWorld) {
  const p = page(this);
  await p.click('#vi-start');
  await p.waitForFunction(`document.querySelector('#vi-state')?.textContent === 'recording'`);
  // Give the fake device a beat to produce audio before a stop step.
  await p.waitForTimeout(300);
});

When('the user stops recording', { timeout: 30_000 }, async function (this: DemoWorld) {
  await page(this).click('#vi-stop');
});

When('the user cancels recording', async function (this: DemoWorld) {
  await page(this).click('#vi-cancel');
});

Then(
  'the recording result shows {string}',
  { timeout: 30_000 },
  async function (this: DemoWorld, expected: string) {
    const p = page(this);
    const pred = `(document.querySelector('#vi-result')?.textContent ?? '').includes(${JSON.stringify(expected)})`;
    try {
      await p.waitForFunction(pred, undefined, { timeout: 20_000 });
    } catch {
      assert.fail(`expected the result to show "${expected}"; it shows: ${await p.textContent('#vi-result')}`);
    }
  },
);

Then('the voice state is {string}', async function (this: DemoWorld, expected: string) {
  await page(this).waitForFunction(
    `document.querySelector('#vi-state')?.textContent === ${JSON.stringify(expected)}`,
  );
});
