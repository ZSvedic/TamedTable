// Add the voiceover to the silent renders capture.mjs produced.
// For each language: synthesize one TTS clip per line (OpenAI), time-fit each
// to its beat slot so lines never overlap, assemble a 20s track, then mux it
// into both ratios as Opus audio. Needs OPENAI_API_KEY and a full ffmpeg
// (imageio-ffmpeg supplies one with libopus). Usage: node audio.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const tmp = path.join(out, '_aud');
const KEY = process.env.OPENAI_API_KEY;
const VOICE = 'nova', MODEL = 'gpt-4o-mini-tts';
const RATIOS = ['16x9', '9x16'];
const DUR = 20;

// resolve the full ffmpeg (audio-capable) that imageio-ffmpeg installed
const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

// voiceover: [startMs, text] per line, aligned to timeline.html's beats.
const VO = {
  en: [
    [0, 'Talk to your data.'],
    [2000, 'Real data is messy. Phones need to be normalized based on the country.'],
    [6500, 'Just say what you want.'],
    [9000, 'Watch every row change, right in front of you.'],
    [13500, 'Ask in any language. Same result.'],
    [16000, 'Keep the steps. Replay them free, or export to Python.'],
    [18500, 'TamedTable.'],
  ],
  es: [
    [0, 'Habla con tus datos.'],
    [2000, 'Los datos reales son un desastre. Los teléfonos deben normalizarse según el país.'],
    [6500, 'Solo di lo que quieres.'],
    [9000, 'Mira cambiar cada fila, ante tus ojos.'],
    [13500, 'Pregunta en cualquier idioma. El mismo resultado.'],
    [16000, 'Guarda los pasos. Repítelos gratis, o expórtalos a Python.'],
    [18500, 'TamedTable.'],
  ],
};

async function tts(text, file) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: 'mp3' }),
    });
    if (res.ok) { writeFileSync(file, Buffer.from(await res.arrayBuffer())); return; }
    if (attempt === 3) throw new Error(`TTS ${res.status}: ${await res.text()}`);
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
}

function durationSec(file) {
  const err = spawnSync(FF, ['-hide_banner', '-i', file]).stderr.toString();
  const m = err.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : 0;
}

mkdirSync(tmp, { recursive: true });
for (const lang of Object.keys(VO)) {
  const segs = VO[lang];
  const clips = [];
  for (let i = 0; i < segs.length; i++) {
    const f = path.join(tmp, `${lang}-${i}.mp3`);
    await tts(segs[i][1], f);
    clips.push({ start: segs[i][0] / 1000, file: f, dur: durationSec(f) });
  }
  // time-fit: speed a line up only if it would spill into the next slot
  clips.forEach((c, i) => {
    const slotEnd = i < clips.length - 1 ? clips[i + 1].start - 0.12 : DUR - 0.05;
    const slot = slotEnd - c.start;
    c.tempo = c.dur > slot ? Math.min(c.dur / slot, 1.6) : 1.0;
  });

  // assemble the 20s track
  const inputs = clips.flatMap(c => ['-i', c.file]);
  const filt = clips.map((c, i) =>
    `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atempo=${c.tempo.toFixed(3)},` +
    `adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)}[a${i}]`).join(';');
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${DUR}[aout]`;
  const track = path.join(tmp, `track-${lang}.wav`);
  execFileSync(FF, ['-hide_banner', '-y', ...inputs, '-filter_complex', `${filt};${mix}`,
    '-map', '[aout]', '-ac', '2', '-ar', '48000', track], { stdio: 'inherit' });

  // mux into both ratios
  for (const ratio of RATIOS) {
    const silent = path.join(out, `silent-${ratio}-${lang}.webm`);
    const dest = path.join(out, `hero-${ratio}-${lang}.webm`);
    execFileSync(FF, ['-hide_banner', '-y', '-i', silent, '-i', track,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '128k',
      '-shortest', dest], { stdio: 'inherit' });
    console.log(`✓ ${ratio}/${lang}: ${dest}`);
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log('done');
