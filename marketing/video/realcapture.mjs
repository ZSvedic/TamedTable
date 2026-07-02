// Render the real-footage cut (realtimeline.html) frame-accurately, then encode
// WebM + MP4 + GIF + poster and mux the Algieba voiceover. Frame-accurate: each
// frame awaits the video scrub (window.seek resolves on 'seeked'), so the real
// app content lands exactly on the beats. Fonts are bundled (fonts.css), so page
// load is instant. Uses the full imageio-ffmpeg (image2 + libx264 + aac).
// Needs out/realapp-flow.webm and out/track-algieba.wav.
//
// NOTE: run it plainly (`node realcapture.mjs`). Do NOT prefix with a `pkill`
// that matches the chromium path — that kills this run's own browser.
import { chromium } from '/home/user/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const ff = (...a) => execFileSync(FF, ['-hide_banner', '-y', ...a], { stdio: 'inherit' });
const race = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(r, ms))]);
const FPS = 15, FRAMES = FPS * 20;
const track = path.join(out, 'track-algieba.wav');
const RATIOS = [{ id: '16x9', w: 1280, h: 720 }];

const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
for (const r of RATIOS) {
  const fdir = path.join(out, `frames-real-${r.id}`);
  rmSync(fdir, { recursive: true, force: true }); mkdirSync(fdir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: r.w, height: r.h }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(DIR, 'realtimeline.html') + `?capture=1&ratio=${r.id}`,
    { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await race(page.evaluate(() => window.ready()), 8000);

  const pad = n => String(n).padStart(5, '0');
  for (let f = 0; f < FRAMES; f++) {
    await race(page.evaluate(ms => window.seek(ms), (f * 1000) / FPS), 1500);
    await page.screenshot({ path: path.join(fdir, pad(f) + '.png'),
      clip: { x: 0, y: 0, width: r.w, height: r.h } });
  }
  await page.close();

  const inp = ['-framerate', String(FPS), '-i', path.join(fdir, '%05d.png'), '-i', track];
  const webm = path.join(out, `hero-${r.id}-en-real.webm`);
  ff(...inp, '-c:v', 'libvpx', '-b:v', '3M', '-crf', '10', '-pix_fmt', 'yuv420p',
    '-c:a', 'libopus', '-b:a', '160k', '-shortest', webm);
  const mp4 = path.join(out, `hero-${r.id}-en-real.mp4`);
  ff(...inp, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', mp4);
  console.log(`✓ ${r.id}: ${webm} + mp4`);

  if (r.id === '16x9') {
    const gvf = 'fps=12,scale=640:-1:flags=lanczos', pal = path.join(out, '_pr.png');
    ff('-i', mp4, '-vf', `${gvf},palettegen=stats_mode=diff`, pal);
    ff('-i', mp4, '-i', pal, '-lavfi', `${gvf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
      '-loop', '0', path.join(out, `hero-${r.id}-en-real.gif`));
    execFileSync('rm', ['-f', pal]);
    ff('-ss', '11', '-i', mp4, '-frames:v', '1', path.join(out, `poster-${r.id}-en-real.png`));
  }
  rmSync(fdir, { recursive: true, force: true });
}
await browser.close();
console.log('done');
