// Render the demo timeline to silent WebM, one per ratio x language.
// Uses Playwright's built-in VP8 recorder; window.seek(ms) is driven on a wall
// clock so the recording plays at real speed, then the font-load pre-roll is
// trimmed with the bundled (video-only) ffmpeg. audio.mjs adds the voiceover.
// Usage: node capture.mjs
import { chromium } from '/home/user/node_modules/playwright/index.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
// probe a webm's duration (seconds) with the bundled ffmpeg
function probeDur(FF, file) {
  const e = spawnSync(FF, ['-hide_banner', '-i', file]).stderr.toString();
  const m = e.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : 0;
}
// wait until the file size stops growing (Playwright flushes the webm on close)
async function waitStable(file) {
  let prev = -1;
  for (let k = 0; k < 30; k++) {
    const sz = statSync(file).size;
    if (sz > 0 && sz === prev) return;
    prev = sz; await sleep(200);
  }
}

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FF = '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux';
const DUR_MS = 20000;
const RATIOS = [
  { id: '16x9', w: 1280, h: 720 },
  { id: '9x16', w: 720, h: 1280 },
];
const LANGS = ['en'];   // the video is English; its one Spanish moment is the
                        // prompt swap in the "any language" beat (timeline.html)

const out = path.join(DIR, 'out');
const tmp = path.join(out, '_rec');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
for (const r of RATIOS) {
  for (const lang of LANGS) {
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });

    const ctx = await browser.newContext({
      viewport: { width: r.w, height: r.h }, deviceScaleFactor: 1,
      recordVideo: { dir: tmp, size: { width: r.w, height: r.h } },
    });
    const page = await ctx.newPage();       // recording starts here
    const url = 'file://' + path.join(DIR, 'timeline.html') + `?capture=1&ratio=${r.id}&lang=${lang}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    const start = Date.now();
    for (;;) {
      const t = Date.now() - start;
      if (t >= DUR_MS) break;
      await page.evaluate(ms => window.seek(ms), t);
      // yield so Playwright's frame recorder isn't starved by the seek loop
      // (a busy loop drops captured frames, worst on the taller portrait frame)
      await sleep(12);
    }
    const src = await page.video().path();
    await ctx.close();
    await waitStable(src);           // let Playwright finish writing the webm

    // the raw = font-load preroll + 20s of animation, so the content is the
    // final 20s; trim by the measured duration, not the (variable) preroll.
    const raw = probeDur(FF, src);
    const ss = Math.max(0, raw - DUR_MS / 1000 - 0.05);
    const dest = path.join(out, `silent-${r.id}-${lang}.webm`);
    execFileSync(FF, ['-hide_banner', '-y', '-ss', String(ss),
      '-i', src, '-t', String(DUR_MS / 1000), '-c:v', 'libvpx', '-b:v', '3M', '-crf', '10',
      '-pix_fmt', 'yuv420p', '-an', dest], { stdio: 'inherit' });
    rmSync(src, { force: true });
    console.log(`✓ ${r.id}/${lang}: ${dest} (raw ${raw.toFixed(1)}s)`);
  }
}
rmSync(tmp, { recursive: true, force: true });
await browser.close();
console.log('done');
