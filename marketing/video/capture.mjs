// Render the demo timeline to WebM, one file per aspect ratio.
// Uses Playwright's built-in VP8 recorder (the bundled ffmpeg only ingests raw
// frames, so a PNG-sequence encode isn't available here — MP4/GIF derivatives
// need a fuller ffmpeg later). window.seek(ms) is driven on a wall clock so the
// recording plays at real speed. Usage: node capture.mjs
import { chromium } from '/home/user/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FF = '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux';
const DUR_MS = 30000;
const RATIOS = [
  { id: '16x9', w: 1280, h: 720 },
  { id: '9x16', w: 720, h: 1280 },
];

const out = path.join(DIR, 'out');
const tmp = path.join(out, '_rec');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
for (const r of RATIOS) {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: r.w, height: r.h }, deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: { width: r.w, height: r.h } },
  });
  const page = await ctx.newPage();       // recording starts here
  const recStart = Date.now();
  const url = 'file://' + path.join(DIR, 'timeline.html') + `?capture=1&ratio=${r.id}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  // pre-roll = load time; the frame on screen through it is seek(0) (blank
  // linen, mark not yet drawing), so it trims away cleanly below.
  const preroll = (Date.now() - recStart) / 1000;
  const start = Date.now();
  for (;;) {
    const t = Date.now() - start;
    if (t >= DUR_MS) break;
    await page.evaluate(ms => window.seek(ms), t);
  }
  const src = await page.video().path();
  await ctx.close();               // finalizes the webm

  const dest = path.join(out, `hero-${r.id}.webm`);
  // trim the pre-roll (0.15s safety, the opening frame is blank until 0.2s) and
  // pin to exactly 30s; re-encode since a copy-trim can't cut on a keyframe here.
  execFileSync(FF, ['-hide_banner', '-y', '-ss', String(Math.max(0, preroll - 0.15)),
    '-i', src, '-t', '30', '-c:v', 'libvpx', '-b:v', '3M', '-crf', '10',
    '-pix_fmt', 'yuv420p', '-an', dest], { stdio: 'inherit' });
  rmSync(src, { force: true });
  console.log(`✓ ${r.id}: ${dest} (preroll ${preroll.toFixed(1)}s)`);
}
rmSync(tmp, { recursive: true, force: true });
rmSync(path.join(out, 'frames-16x9'), { recursive: true, force: true });
await browser.close();
console.log('done');
