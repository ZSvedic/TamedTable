// Smoke tests for the module demos (#GherkinTour, #ModelConfig). Each demo is
// built with the exact `bun build` flags deploy.yml uses, served under the
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
const DEMOS = ['gherkin-tour', 'model-config'] as const;

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

  // Same flags as the demo-bundling step in .github/workflows/deploy.yml.
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
  it('gherkin-tour: renders the sample tour and re-parses on edit', async () => {
    const { page, consoleErrors, failedRequests } = await openDemo('gherkin-tour');
    const tours = JSON.parse((await page.textContent('#out'))!);
    expect(tours.length).toBeGreaterThan(0);

    await page.fill('#src', '');
    await page.waitForFunction(`document.querySelector('#out')?.textContent === '[]'`);
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
});
