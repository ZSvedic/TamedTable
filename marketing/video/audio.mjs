// Add the English voiceover to the silent renders capture.mjs produced.
// Synthesizes one TTS clip per line (OpenAI, with delivery instructions), places
// each at its beat with NO speed-up (speeding a line to fit is what made the old
// track sound rushed), assembles a 20s track, and muxes it into both ratios as
// Opus. Needs OPENAI_API_KEY and a full ffmpeg (imageio-ffmpeg supplies one).
//
// To use a better voice from an external tool instead of OpenAI, drop a finished
// 20s track at out/voiceover-en.wav and this script muxes that verbatim, skipping
// TTS. See voiceover.ssml for a script you can paste into Azure/Google/Polly.
// Usage: node audio.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const tmp = path.join(out, '_aud');
const KEY = process.env.OPENAI_API_KEY;
const VOICE = 'coral', MODEL = 'gpt-4o-mini-tts';
const INSTRUCTIONS =
  'Warm, friendly, natural conversational tone with light emphasis on key ' +
  'words. Clear and confident, at a normal pace. Not robotic.';
const RATIOS = ['16x9', '9x16'];
const LANG = 'en';
const DUR = 20;

const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

// [startSec, text] per line, aligned to timeline.html's beats. Each line fits
// its slot at natural pace, so nothing is time-compressed. No spoken outro line
// (the logo speaks for itself), which gives the "keep the steps" line room.
// Kept short so each fits its beat at natural pace (no speed-up). The on-screen
// captions carry the fuller wording; the voiceover is the punchier version.
const VO = [
  [0.0, 'Talk to your data.'],
  [2.0, 'Real data is messy. Formats vary by country.'],
  [6.5, 'Just say what you want.'],
  [9.0, 'Watch every row change, right in front of you.'],
  [13.5, 'Ask in any language.'],
  [16.0, 'Keep the steps, or export to Python.'],
];

async function tts(text, file) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: text,
        instructions: INSTRUCTIONS, response_format: 'mp3' }),
    });
    if (res.ok) { writeFileSync(file, Buffer.from(await res.arrayBuffer())); return; }
    if (attempt === 3) throw new Error(`TTS ${res.status}: ${await res.text()}`);
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
}

const external = path.join(out, `voiceover-${LANG}.wav`);
let track;
if (existsSync(external)) {
  track = external;
  console.log(`using external voiceover: ${external}`);
} else {
  mkdirSync(tmp, { recursive: true });
  const clips = [];
  for (let i = 0; i < VO.length; i++) {
    const f = path.join(tmp, `${i}.mp3`);
    await tts(VO[i][1], f);
    clips.push({ start: VO[i][0], file: f });
  }
  // place each clip at its start, no tempo change; pad/trim the mix to 20s
  const inputs = clips.flatMap(c => ['-i', c.file]);
  const filt = clips.map((c, i) =>
    `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,` +
    `adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)}[a${i}]`).join(';');
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${DUR}[aout]`;
  track = path.join(tmp, `track-${LANG}.wav`);
  execFileSync(FF, ['-hide_banner', '-y', ...inputs, '-filter_complex', `${filt};${mix}`,
    '-map', '[aout]', '-ac', '2', '-ar', '48000', track], { stdio: 'inherit' });
}

for (const ratio of RATIOS) {
  const silent = path.join(out, `silent-${ratio}-${LANG}.webm`);
  const dest = path.join(out, `hero-${ratio}-${LANG}.webm`);
  execFileSync(FF, ['-hide_banner', '-y', '-i', silent, '-i', track,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '160k',
    '-shortest', dest], { stdio: 'inherit' });
  console.log(`✓ ${ratio}/${LANG}: ${dest}`);
}
if (track !== external) rmSync(tmp, { recursive: true, force: true });
console.log('done');
