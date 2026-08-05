// RED-MC-3 regression (2026-07-29 hunt, fixed and moved green): merely
// loading the model-config demo page must leave the stored config blob
// byte-for-byte untouched — a page load is not a change, and the persisted
// alwaysRunAll:true must survive it. The demo's persist effect now skips its
// mount run and merges changed fields over the stored blob.
//
// Spec: spec/packages/model-config/behavior.md § Demo page;
// spec/code-contract.md — alwaysRunAll is "persisted alongside the provider
// settings".
//
// This drives the real built demo in headless Chromium (same build + serve
// shape as tests/demo.smoke.test.ts) because the demo mounts React at module
// scope — there is no browser-free way to exercise its mount effect. Like
// the smoke suite it is gated on SMOKE=1 (`bun run test:smoke`), so plain
// `bun test` stays offline and browser-free.
//
// NOTE: this deliberately asserts only the no-unsolicited-write/clobber half
// of the finding. The fresh-visit 'anthropic' default is pinned by the green
// smoke test (tests/demo.smoke.test.ts:183) and is not asserted here.
import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser } from 'playwright';
import { assertBrowserTestsSupported, findChromium } from './demo-harness.ts';

const SRC_DIR = join(import.meta.dir, '..');

const smoke = process.env.SMOKE === '1';

let outDir: string;
let server: ReturnType<typeof Bun.serve>;
let browser: Browser;

beforeAll(async () => {
  if (!smoke) return;
  assertBrowserTestsSupported();
  const { chromium } = await import('playwright');
  const chromePath = findChromium(chromium);
  if (!chromePath) {
    // Environment failure, not the bug — fail loudly so it is never mistaken
    // for RED-MC-3 itself.
    throw new Error(
      'RED-MC-3 harness: no Chromium found under $PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers, ' +
        'or ~/.cache/ms-playwright — install one with `bunx playwright install chromium`.',
    );
  }

  outDir = await mkdtemp(join(tmpdir(), 'red-mc3-demo-'));
  const build = Bun.spawn(
    ['bun', 'build', 'packages/model-config/demo.html', '--outdir', outDir],
    { cwd: SRC_DIR, stdout: 'pipe', stderr: 'pipe' },
  );
  if ((await build.exited) !== 0) {
    throw new Error(
      `RED-MC-3 harness: bun build model-config/demo.html failed:\n${await new Response(build.stderr).text()}`,
    );
  }

  // Module scripts don't load over file://, so serve the build like Pages does.
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      const file = Bun.file(join(outDir, path === '/' ? '/demo.html' : path));
      return (await file.exists()) ? new Response(file) : new Response('not found', { status: 404 });
    },
  });

  browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
}, 30_000);

afterAll(async () => {
  await browser?.close();
  server?.stop(true);
  if (outDir) await rm(outDir, { recursive: true, force: true });
});

test.skipIf(!smoke)('RED-MC-3: merely loading the demo page leaves the stored config blob untouched', async () => {
  // The blob exactly as the main app persists it, with Simple mode on.
  const seed = {
    provider: 'gemini',
    anthropicKey: null,
    geminiKey: 'AIza-red-mc-3',
    openaiKey: null,
    openrouterKey: null,
    puterKey: null,
    model: 'gemini-3.6-flash',
    cellModel: 'gemini-3.1-flash-lite',
    alwaysRunAll: true,
  };

  const ctx = await browser.newContext();
  // Browser-side snippets are strings so tsc doesn't check them against Node libs.
  await ctx.addInitScript(
    `localStorage.setItem('tamedtable.config', ${JSON.stringify(JSON.stringify(seed))})`,
  );
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${server.port}/demo.html`);
  await page.waitForFunction(`(document.querySelector('#out')?.textContent ?? '').trim().length > 0`);
  await page.waitForTimeout(400); // let the mount persist-effect flush

  const blobAfter = (await page.evaluate(`localStorage.getItem('tamedtable.config')`)) as string | null;
  await ctx.close();

  assert.ok(blobAfter, 'RED-MC-3 harness: seeded tamedtable.config blob disappeared entirely');
  assert.deepEqual(
    JSON.parse(blobAfter),
    seed,
    'RED-MC-3 (spec/packages/model-config/behavior.md:278-281 § Demo page; spec/code-contract.md:1076-1077): loading the demo with no user interaction must leave the stored config unchanged — a load is not a change, yet the mount effect rewrote the blob and reset the persisted alwaysRunAll:true to false (demo.tsx:35-48)',
  );
}, 30_000);
