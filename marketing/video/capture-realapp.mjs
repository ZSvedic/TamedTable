// Capture the REAL web app running the phone-normalize tour, key-free, and trim
// the clean flow to out/realapp-flow.webm (the footage realtimeline.html plays).
// The tour replays from a committed cassette, so no API key is needed.
//
// Prereq: serve the app locally first (localhost avoids the egress proxy):
//     cd src/packages/web && TAMEDTABLE_WEB_BASE=/ bun run dev     # -> :5173
// Then: node capture-realapp.mjs
// Do NOT wrap in a `pkill chrome` — it kills this run's own browser.
import { chromium } from '/home/user/node_modules/playwright/index.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const tmp = path.join(out, '_app');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const URL = 'http://localhost:5173/?feature=clean-up.feature&scenario=Normalize+the+phone+numbers';
const sleep = ms => new Promise(r => setTimeout(r, ms));

rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 },
  recordVideo: { dir: tmp, size: { width: 1440, height: 900 } } });
const page = await ctx.newPage();
const rec0 = Date.now();
const at = () => (Date.now() - rec0) / 1000;
await page.goto(URL, { waitUntil: 'networkidle' });
// hide the Driver.js tour overlay/popover so the app reads clean
await page.addStyleTag({ content:
  `.driver-overlay,.driver-popover,svg.driver-overlay,.driver-stage,#driver-page-overlay{display:none!important}` });
await sleep(1200);
const next = () => page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /next|→/i.test(x.textContent || ''));
  if (b) b.click();
});
await next();                                   // step 1: load the sample
await page.waitForSelector('table tbody tr', { timeout: 15000 });
const tTable = at();
await sleep(2200);
await next();                                   // step 2: submit the query -> stream
await sleep(9500);                              // let the cells stream in and settle
await sleep(1200);
const src = await page.video().path();
await ctx.close();
await browser.close();

// trim the clean flow: from just before the table appears through the settle
const from = Math.max(0, tTable - 0.3);
const dest = path.join(out, 'realapp-flow.webm');
execFileSync(FF, ['-hide_banner', '-y', '-ss', String(from), '-t', '12.5', '-i', src,
  '-c:v', 'libvpx', '-b:v', '3M', '-crf', '8', '-an', dest], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
console.log(`✓ ${dest} (table at ${tTable.toFixed(1)}s, trimmed from ${from.toFixed(1)}s)`);
