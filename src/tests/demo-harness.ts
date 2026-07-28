// #TestUtils
// Shared Playwright harness for the package demo-page step defs (@web
// scenarios). Each package's *-demo.steps.ts calls bindDemoPage() once: it
// registers the `Given('the <name> demo page')` step plus the After/AfterAll
// cleanup hooks, and returns the page accessor the package's own steps use.
// The demo is bundled once per run with the same `bun build demo.html` line
// the site build uses, and served to the page via Playwright request
// interception (no HTTP server). It deliberately imports nothing from the app
// harness (world.ts), so packages stay independent of app test state.
import { After, AfterAll, Given } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { execFile, spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Browser, Page, Route } from 'playwright';

// A Playwright-managed Chromium under $PLAYWRIGHT_BROWSERS_PATH (container
// images) or ~/.cache/ms-playwright, newest build first, whatever the build
// number.
export function findChromium(chromium?: { executablePath(): string }): string | undefined {
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
    const fallback = chromium?.executablePath();
    if (fallback && existsSync(fallback)) return fallback;
  } catch { /* Playwright cannot resolve a path — fall through to undefined */ }
  return undefined;
}

/** Launch Chromium and connect over a TCP CDP socket instead of the stdio
 *  pipe `chromium.launch()` uses. Bun on Windows cannot wire the extra pipe
 *  fds (oven-sh/bun#27977) — Chrome starts, the handshake hangs, the launch
 *  times out — while a TCP connection works on every runtime and platform.
 *  Closing the returned browser also kills the process and drops its
 *  throwaway profile dir. */
export async function launchChromium(executablePath: string, args: string[] = []): Promise<Browser> {
  const { chromium } = await import('playwright');
  const profile = await mkdtemp(join(tmpdir(), 'tt-chromium-profile-'));
  const child = spawn(
    executablePath,
    [
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      ...args,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const wsUrl = await new Promise<string>((resolve, reject) => {
    // Port 0 lets the OS pick; Chrome prints the resolved endpoint on stderr.
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Chromium did not print its DevTools endpoint within 30 s'));
    }, 30_000);
    let err = '';
    child.stderr!.on('data', (chunk: Buffer) => {
      err += chunk.toString();
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]!); }
    });
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chromium exited before it was ready (code ${code}): ${err}`)); });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
  const browser = await chromium.connectOverCDP(wsUrl);
  browser.on('disconnected', () => {
    child.kill();
    // Windows keeps the profile locked (EBUSY) until Chrome fully exits, so
    // wait for the process before removing, and retry while locks drain.
    void (async () => {
      if (child.exitCode === null) await new Promise((resolve) => child.once('exit', resolve));
      await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }).catch(() => {});
    })();
  });
  return browser;
}

export interface DemoPageOptions {
  /** Demo name: registers `Given('the <name> demo page')`, serves http://<name>.demo. */
  name: string;
  /** The package dir holding demo.html — pass import.meta.dirname. */
  pkgDir: string;
  /** Extra Chromium launch args (e.g. voice-input's fake-media flags). */
  launchArgs?: string[];
  /** Per-page default timeout in ms (default 5_000 — fail fast: a missing
   *  element should red the step in seconds, not minutes). */
  pageTimeout?: number;
  /** Runs before the bundle-dir fallback for each request; return true when
   *  the route was handled (file-io's per-scenario URL fixtures). */
  onRoute?: (route: Route, world: object) => Promise<boolean>;
}

export function bindDemoPage(opts: DemoPageOptions): (world: object) => Page {
  const pages = new WeakMap<object, Page>();
  // Built lazily by the first @web scenario so @headless/@cli runs never
  // build the bundle or launch a browser.
  let session: Promise<{ browser: Browser; dist: string }> | undefined;

  async function startSession(): Promise<{ browser: Browser; dist: string }> {
    const dist = await mkdtemp(join(tmpdir(), `${opts.name}-demo-`));
    await promisify(execFile)('bun', ['build', 'demo.html', '--outdir', dist], { cwd: opts.pkgDir });
    const { chromium } = await import('playwright');
    const executablePath = findChromium(chromium);
    if (!executablePath) {
      throw new Error(
        `${opts.name} steps: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, ` +
          '/opt/pw-browsers, or ~/.cache/ms-playwright. ' +
          'Install one with `bunx playwright install chromium`.',
      );
    }
    const browser = await launchChromium(executablePath, opts.launchArgs);
    return { browser, dist };
  }

  Given(`the ${opts.name} demo page`, { timeout: 60_000 }, async function (this: object) {
    session ??= startSession();
    const { browser, dist } = await session;
    const p = await browser.newPage();
    p.setDefaultTimeout(opts.pageTimeout ?? 5_000);
    const world = this;
    // Module scripts don't load over file://, so fulfill requests from the
    // bundle dir directly — no HTTP server needed.
    await p.route('**/*', async (route) => {
      if (opts.onRoute && (await opts.onRoute(route, world))) return;
      const { pathname } = new URL(route.request().url());
      const file = join(dist, pathname);
      if (existsSync(file)) await route.fulfill({ path: file });
      else await route.fulfill({ status: 404, body: 'not found' });
    });
    await p.goto(`http://${opts.name}.demo/demo.html`);
    await p.waitForSelector('#out');
    pages.set(world, p);
  });

  After(async function (this: object) {
    await pages.get(this)?.close();
    pages.delete(this);
  });

  AfterAll(async function () {
    if (!session) return;
    const { browser, dist } = await session;
    await browser.close();
    await rm(dist, { recursive: true, force: true });
  });

  return function page(world: object): Page {
    const p = pages.get(world);
    assert.ok(p, `no demo page — missing "Given the ${opts.name} demo page"?`);
    return p;
  };
}

/** Poll until some element matching `selector` shows `expected`, with a
 *  readable failure that includes what the demo showed instead. */
export async function expectText(p: Page, selector: string, expected: string): Promise<void> {
  const pred =
    `[...document.querySelectorAll(${JSON.stringify(selector)})]` +
    `.some((el) => (el.textContent ?? '').includes(${JSON.stringify(expected)}))`;
  try {
    await p.waitForFunction(pred, undefined, { timeout: 5_000 });
  } catch {
    const shown = await p.textContent(selector).catch(() => null);
    assert.fail(`expected ${selector} to show "${expected}"${shown === null ? '' : `; demo shows: ${shown}`}`);
  }
}
