// Render add-category.html to the square 6-second deliverables: MP4 + GIF, both
// silent. Frame-accurate by construction: Playwright screenshots one PNG per
// frame at window.seek(ms), so nothing depends on wall-clock speed and there is
// no pre-roll to trim. Frames land in out/ (gitignored); the two finals land
// beside this script, next to the 20-second demo-*.mp4.
// Usage: node capture-add-category.mjs   (run `cd src && bun install` first, and
// `pip install imageio-ffmpeg` for the full ffmpeg: the one Playwright bundles
// has no H.264 or GIF encoder)
import { chromium } from '../../src/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FRAMES = path.join(DIR, 'out', 'add-category-frames');
const SIZE = 720;        // square, so one file works on desktop and phone
const SCALE = 2;         // shoot at 2x, downscale on encode: crisper small text
const FPS = 30;
const GIF_FPS = 15;      // half rate, half size: keeps the GIF README-friendly
const GIF_SIZE = 480;

const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const ff = (...a) => execFileSync(FF, ['-hide_banner', '-y', ...a], { stdio: 'inherit' });

// A pre-baked container often ships one Chromium build while the installed
// Playwright wants another, and downloading is blocked there. Point at whatever
// chromium-<rev> is on disk when the expected binary is missing.
function launch() {
  if (existsSync(chromium.executablePath())) return chromium.launch();
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
    || path.join(os.homedir(), '.cache', 'ms-playwright');
  const rev = readdirSync(root).find(d => /^chromium-\d+$/.test(d));
  if (!rev) throw new Error(`no chromium under ${root}; run: bunx playwright install chromium`);
  return chromium.launch({ executablePath: path.join(root, rev, 'chrome-linux', 'chrome') });
}

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await launch();
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: SCALE,
});
await page.goto('file://' + path.join(DIR, 'add-category.html') + '?capture=1',
  { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const dur = await page.evaluate(() => window.DUR);
const total = Math.round(dur / 1000 * FPS);
for (let i = 0; i < total; i++) {
  await page.evaluate(ms => window.seek(ms), Math.round(i * 1000 / FPS));
  await page.screenshot({ path: path.join(FRAMES, String(i).padStart(4, '0') + '.png') });
}
await browser.close();
console.log(`✓ ${total} frames at ${FPS}fps (${(dur / 1000).toFixed(1)}s)`);

const seq = path.join(FRAMES, '%04d.png');
const mp4 = path.join(DIR, 'demo-category-1x1.mp4');
ff('-framerate', String(FPS), '-i', seq,
  '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4);
console.log(`✓ mp4: ${mp4}`);

// GIF for the README, where GitHub will not autoplay a committed <video>.
const gif = path.join(DIR, 'demo-category-1x1.gif');
const pal = path.join(DIR, 'out', '_palette.png');
const vf = `fps=${GIF_FPS},scale=${GIF_SIZE}:${GIF_SIZE}:flags=lanczos`;
ff('-framerate', String(FPS), '-i', seq, '-vf', `${vf},palettegen=stats_mode=diff`, pal);
ff('-framerate', String(FPS), '-i', seq, '-i', pal,
  '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`, '-loop', '0', gif);
rmSync(pal, { force: true });
console.log(`✓ gif: ${gif}`);
console.log('done');
