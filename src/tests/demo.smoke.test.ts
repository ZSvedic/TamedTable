// Smoke tests for the module demos (#GherkinTour, #ModelConfig). Each demo is
// built with the exact `bun build` flags .github/scripts/build-site.sh uses, served under the
// same /TamedTable/ base path as GitHub Pages, and driven with headless
// Chromium — so a bundle that 404s or renders nothing (the PR #79 regression)
// fails here instead of on the live site.
//
// Not part of `bun run test`: needs a Chromium binary. Run via
// `bun run test:smoke` (sets SMOKE=1); without SMOKE=1 every test is skipped
// so the default suite stays offline and browser-free.
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser, Page } from 'playwright';

const SRC_DIR = join(import.meta.dir, '..');
const BASE_PATH = '/TamedTable/demos';
const DEMOS = ['chat-panel', 'file-io', 'gherkin-tour', 'model-config', 'table-view', 'toolbar', 'ui-kit', 'voice-input'] as const;

// Find a Playwright-managed Chromium without hardcoding the build number:
// $PLAYWRIGHT_BROWSERS_PATH (container images) or ~/.cache/ms-playwright
// (`playwright install chromium`), newest build first. Classic Chromium
// builds unpack to chrome-linux/, Chrome-for-Testing builds to chrome-linux64/.
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

const smoke = process.env.SMOKE === '1';
let chromePath = smoke ? findChromium() : undefined;
if (smoke && !chromePath) {
  // The playwright package knows where its own `playwright install` puts the
  // browser, whatever the layout — trust it when the directory scan misses.
  const { chromium } = await import('playwright');
  const fallback = chromium.executablePath();
  if (fallback && existsSync(fallback)) chromePath = fallback;
}
if (smoke && !chromePath) {
  const msg =
    'demo smoke: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers, ' +
    'or ~/.cache/ms-playwright. Install one with `bunx playwright install chromium`.';
  // A silent skip in CI is a false green — the deploy gate must fail loudly.
  if (process.env.CI) throw new Error(msg);
  console.warn(`${msg} Skipping.`);
}
const skip = !smoke || !chromePath;

let outRoot: string;
let server: ReturnType<typeof Bun.serve>;
let browser: Browser;

beforeAll(async () => {
  if (skip) return;
  outRoot = await mkdtemp(join(tmpdir(), 'demo-smoke-'));

  // Same flags as the demo-bundling step in .github/scripts/build-site.sh.
  for (const name of DEMOS) {
    const build = Bun.spawn(
      [
        'bun', 'build', `packages/${name}/demo.html`,
        '--outdir', join(outRoot, 'demos', name),
        `--public-path=${BASE_PATH}/${name}/`,
      ],
      { cwd: SRC_DIR, stdout: 'pipe', stderr: 'pipe' },
    );
    if ((await build.exited) !== 0) {
      throw new Error(`bun build ${name}/demo.html failed:\n${await new Response(build.stderr).text()}`);
    }
  }

  // Module scripts don't load over file://, so serve the artifact like Pages
  // does: outRoot mounted at /TamedTable/.
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === '/favicon.ico') return new Response(null, { status: 204 });
      const file = Bun.file(join(outRoot, path.replace(/^\/TamedTable\//, '')));
      return (await file.exists()) ? new Response(file) : new Response('not found', { status: 404 });
    },
  });

  const { chromium } = await import('playwright');
  browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
});

afterAll(async () => {
  await browser?.close();
  server?.stop(true);
  if (outRoot) await rm(outRoot, { recursive: true, force: true });
});

// Open a demo page, collecting console errors and failed network requests,
// and wait until the demo script has rendered into #out.
async function openDemo(name: (typeof DEMOS)[number]) {
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('requestfailed', (req) => failedRequests.push(`${req.url()} ${req.failure()?.errorText}`));
  page.on('response', (res) => { if (res.status() >= 400) failedRequests.push(`${res.url()} ${res.status()}`); });
  await page.goto(`http://localhost:${server.port}${BASE_PATH}/${name}/demo.html`);
  // Predicates are strings so tsc doesn't type-check browser code against Node libs.
  await page.waitForFunction(`(document.querySelector('#out')?.textContent ?? '').trim().length > 0`);
  return { page, consoleErrors, failedRequests };
}

async function expectClean(page: Page, consoleErrors: string[], failedRequests: string[]) {
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  await page.close();
}

describe.skipIf(skip)('demo smoke', () => {
  it('chat-panel: sends a message and echoes the assistant reply', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('chat-panel');
    await page.fill('#demo-chat-input', 'smoke test');
    await page.press('#demo-chat-input', 'Enter');
    await page.waitForSelector('[data-cp-message="assistant"]');
    expect((await page.textContent('[data-cp-message="assistant"]'))!).toContain('Did: smoke test');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('voice-input: renders the sample prompt and the recording controls', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('voice-input');
    expect((await page.textContent('#out'))!).toContain('spoken in the attached audio clip');
    expect((await page.textContent('#vi-state'))!).toBe('idle');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('file-io: reports the dialog capability and renders the serializeFlow sample', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('file-io');
    expect((await page.textContent('#fio-fsa'))!).toMatch(/File System Access API: (available|missing)/);
    expect(JSON.parse((await page.textContent('#out'))!).version).toBe(2);
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('table-view: renders the grid and pages forward', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('table-view');
    expect((await page.textContent('[data-tv-range]'))!).toContain('1–10 of 95 rows');

    await page.click('[data-tv-next]');
    await page.waitForFunction(
      `(document.querySelector('[data-tv-range]')?.textContent ?? '').includes('11–20')`,
    );
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('toolbar: fires a button callback and opens the URL dialog', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('toolbar');
    await page.click('[data-tb-toolbar] button:has-text("Save data")');
    await page.waitForFunction(
      `(document.querySelector('#out')?.textContent ?? '').includes('save data')`,
    );

    // Open URL moved into the Open split button's dropdown menu: click the
    // first split button's caret, then the "Open URL…" menu item.
    await page.locator('[data-tb-toolbar] [data-uk-split-caret]').first().click();
    await page.click('[data-uk-menu-item="Open URL…"]');
    await page.waitForSelector('[data-tb-dialog]');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('ui-kit: renders the primitives and flips theme on toggle', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('ui-kit');
    expect((await page.textContent('#out'))!).toContain('ready');
    expect(await page.$$eval('[data-uk-button]', (els) => els.length)).toBeGreaterThanOrEqual(4);

    await page.click('button[title="Toggle light/dark"]');
    await page.waitForSelector('[data-uk-mode="dark"]');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('gherkin-tour: parses its own feature and tours the page on Start tour', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('gherkin-tour');
    const tours = JSON.parse((await page.textContent('#out'))!);
    expect(tours.length).toBeGreaterThan(0);

    // Start tour → the Driver.js spotlight + popover appears over the page's own
    // elements, proving parseTours → TourDriver → ./ui drives a non-TamedTable host.
    await page.click('#start-tour');
    await page.waitForSelector('.driver-popover');
    // Driver.js's own footer shows progress ("1 of N") and a Next button — the
    // package no longer renders a custom "Step N of N" title or button row.
    const popover = (await page.textContent('.driver-popover'))!;
    expect(popover).toContain('1 of 4');
    expect(popover).toContain('Next');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('model-config: renders the chooser and flips provider on card click', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('model-config');
    expect(JSON.parse((await page.textContent('#out'))!).provider).toBe('anthropic');

    await page.click('[data-mc-card="gemini"]');
    await page.fill('[data-mc-key="gemini"]', 'smoke-test-key');
    await page.waitForFunction(
      `(() => { try { return JSON.parse(document.querySelector('#out').textContent).provider === 'gemini'; } catch { return false; } })()`,
    );
    expect(JSON.parse((await page.textContent('#out'))!).geminiKey).toBe('smoke-test-key');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('model-config: persists config to localStorage and restores it on reload', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('model-config');
    await page.click('[data-mc-card="gemini"]');
    await page.fill('[data-mc-key="gemini"]', 'persisted-key');
    await page.waitForFunction(
      `(() => { try { return JSON.parse(localStorage.getItem('tamedtable.config') ?? '{}').geminiKey === 'persisted-key'; } catch { return false; } })()`,
    );

    await page.reload();
    await page.waitForFunction(`(document.querySelector('#out')?.textContent ?? '').trim().length > 0`);
    const resolved = JSON.parse((await page.textContent('#out'))!);
    expect(resolved.provider).toBe('gemini');
    expect(resolved.geminiKey).toBe('persisted-key');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);

  it('model-config: shows the test-call harness, mic only for voice models', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('model-config');
    // Anthropic default model: no voice support, so no mic.
    expect(await page.isVisible('#tc-input')).toBe(true);
    expect(await page.isVisible('#tc-send')).toBe(true);
    expect(await page.isVisible('#tc-response')).toBe(true);
    expect(await page.locator('#tc-mic').count()).toBe(0);

    // Switching to a Gemini model (voiceInput: true) shows the mic.
    await page.click('[data-mc-card="gemini"]');
    await page.waitForSelector('#tc-mic');
    await expectClean(page, consoleErrors, failedRequests);
  }, 30_000);
});
