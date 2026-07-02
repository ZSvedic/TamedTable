// Derive the MP4 and GIF deliverables from the final WebMs.
// MP4 (H.264 + AAC) is the homepage fallback and the social/YouTube master; the
// GIF + poster are for the README, where GitHub won't autoplay a committed
// <video>. Uses the full ffmpeg from imageio-ffmpeg. Usage: node encode.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const ff = (...a) => execFileSync(FF, ['-hide_banner', '-y', ...a], { stdio: 'inherit' });

for (const ratio of ['16x9', '9x16']) {
  const webm = path.join(out, `hero-${ratio}-en.webm`);
  const mp4 = path.join(out, `hero-${ratio}-en.mp4`);
  ff('-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', mp4);
  console.log(`✓ mp4 ${ratio}: ${mp4}`);
}

// README GIF from the 16:9 cut: downscaled + palette-optimized, silent, looping.
const src = path.join(out, 'hero-16x9-en.webm');
const gif = path.join(out, 'hero-16x9-en.gif');
const pal = path.join(out, '_palette.png');
const gifVf = 'fps=12,scale=640:-1:flags=lanczos';
ff('-i', src, '-vf', `${gifVf},palettegen=stats_mode=diff`, pal);
ff('-i', src, '-i', pal, '-lavfi', `${gifVf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  '-loop', '0', gif);
execFileSync('rm', ['-f', pal]);
console.log(`✓ gif: ${gif}`);

// README poster: a representative "watch it" frame.
const poster = path.join(out, 'poster-16x9-en.png');
ff('-ss', '11', '-i', src, '-frames:v', '1', poster);
console.log(`✓ poster: ${poster}`);
console.log('done');
