// Gemini-TTS voiceover for the demo — finalizer for the chosen voice.
// Renders the WHOLE script in ONE call (one coherent take, consistent voice),
// splits that read at its five longest pauses, and lays the phrases onto the
// beats by CONCATENATING them with silence in between — sequential, so two
// phrases can never overlap (that overlap is what caused the "double voice").
// Produces out/voice-<VOICE>.wav (raw read) and hero-<ratio>-en.webm.
// Needs GEMINI_API_KEY. Usage: node gemini-tts.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const tmp = path.join(out, '_gem');
const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE = 'Algieba';               // smooth, middle-aged male
const RATIOS = ['16x9', '9x16'];
const DUR = 20;
const BEATS = [0.0, 2.0, 6.5, 9.0, 13.5, 16.0];   // 6 phrase start times

const SCRIPT =
  'Talk to your data. Real data is messy, formats vary by country. ' +
  'Just say what you want. Watch every row change, right in front of you. ' +
  'Ask in any language. Keep the steps, or export to Python.';
const STYLE = 'Read this as one continuous, warm, friendly product narration, ' +
  'at a natural pace with light emphasis on the key words: ';

const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const ff = (...a) => execFileSync(FF, ['-hide_banner', '-y', ...a], { stdio: 'ignore' });
function dur(file) {
  const e = spawnSync(FF, ['-hide_banner', '-i', file]).stderr.toString();
  const m = e.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : 0;
}

async function continuousWav(file) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE + SCRIPT }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    });
    if (res.ok) {
      const j = await res.json();
      const pcm = Buffer.from(j.candidates[0].content.parts[0].inlineData.data, 'base64');
      const raw = file + '.pcm'; writeFileSync(raw, pcm);
      ff('-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw, file);
      rmSync(raw, { force: true });
      return;
    }
    if (attempt === 4) throw new Error(`Gemini TTS ${res.status}: ${await res.text()}`);
    await new Promise(r => setTimeout(r, 2500 * (attempt + 1)));
  }
}

// cumulative word-count fraction at each of the 5 sentence boundaries — where a
// cut *should* fall in the read. "Longest silence" alone mis-splits when pacing
// varies, so anchor each cut to its expected spot, then snap to the best pause
// nearby (prefer longer, i.e. a real sentence break over a comma).
const FRACS = [4, 12, 17, 26, 30].map(w => w / 37);
function boundaries(file) {
  const e = spawnSync(FF, ['-hide_banner', '-i', file, '-af',
    'silencedetect=noise=-32dB:d=0.12', '-f', 'null', '-']).stderr.toString();
  const sil = [];
  const re = /silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
  let m; while ((m = re.exec(e))) sil.push({ start: +m[1], end: +m[2], mid: (+m[1] + +m[2]) / 2, dur: +m[3] });
  const total = dur(file);
  const lead = sil.find(s => s.start <= 0.1);
  const tail = [...sil].reverse().find(s => s.end >= total - 0.1);
  const t0 = lead ? lead.end : 0.1;
  const t1 = tail ? tail.start : total - 0.1;
  const cuts = FRACS.map(f => {
    const target = t0 + f * (t1 - t0);
    const near = sil.filter(s => Math.abs(s.mid - target) < 1.8);
    if (!near.length) return target;
    // best = longest pause near the expected spot, lightly penalized by distance
    return near.sort((a, b) => (b.dur - Math.abs(b.mid - target) * 0.15)
                             - (a.dur - Math.abs(a.mid - target) * 0.15))[0].mid;
  });
  console.log(`  cuts: ${cuts.map(c => c.toFixed(2)).join(', ')}`);
  return cuts;
}

// aligned 20s track: split at boundaries, then concat phrase + silence-to-next-beat
function alignedTrack(cont, dest) {
  const cuts = boundaries(cont);
  const edges = [0, ...cuts, dur(cont)];
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const seg = path.join(tmp, `seg${i}.wav`);
    ff('-ss', String(edges[i]), '-to', String(edges[i + 1]), '-i', cont,
      '-ar', '48000', '-ac', '2', seg);
    parts.push(seg);
    if (i < 5) {
      const gap = Math.max(0.05, BEATS[i + 1] - BEATS[i] - dur(seg));
      if (BEATS[i + 1] - BEATS[i] - dur(seg) < 0)
        console.log(`  ! phrase ${i} longer than its slot; timing may drift`);
      const sil = path.join(tmp, `gap${i}.wav`);
      ff('-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`, '-t', String(gap), sil);
      parts.push(sil);
    }
  }
  const list = path.join(tmp, 'list.txt');
  writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  const raw = path.join(tmp, 'raw.wav');
  ff('-f', 'concat', '-safe', '0', '-i', list, '-ar', '48000', '-ac', '2', raw);
  ff('-i', raw, '-af', 'apad', '-t', String(DUR), '-ar', '48000', '-ac', '2', dest);
}

mkdirSync(tmp, { recursive: true });
const cont = path.join(out, `voice-${VOICE}.wav`);
if (existsSync(cont)) {                 // reuse the approved read; don't re-roll
  console.log(`↺ reusing existing read: ${cont} (${dur(cont).toFixed(1)}s)`);
} else {
  await continuousWav(cont);
  console.log(`✓ continuous read: ${cont} (${dur(cont).toFixed(1)}s)`);
}

const track = path.join(out, 'track-algieba.wav');   // persisted for reuse (real cut)
alignedTrack(cont, track);
for (const ratio of RATIOS) {
  const silent = path.join(out, `silent-${ratio}-en.webm`);
  const destWebm = path.join(out, `hero-${ratio}-en.webm`);
  ff('-i', silent, '-i', track, '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '160k', '-shortest', destWebm);
  console.log(`✓ ${ratio}: ${destWebm}`);
}
rmSync(tmp, { recursive: true, force: true });
console.log('done — now run: node encode.mjs  (for MP4 + GIF)');
