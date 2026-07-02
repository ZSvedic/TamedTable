// Gemini-TTS voiceover for the demo, continuous-read version.
// The old approach synthesized each line separately, so the clips had different
// tone and sounded cut-and-pasted. This renders the WHOLE script in ONE call
// (one coherent take), then splits it at its natural sentence pauses and only
// inserts silence to line the phrases up with the video beats. The voice stays
// continuous; nothing is re-recorded per line.
//
// Produces, per voice: out/voice-<voice>.wav (the raw continuous read) and
// out/hero-16x9-en-<voice>.webm (aligned, for A/B). Needs GEMINI_API_KEY.
// Usage: node gemini-tts.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const tmp = path.join(out, '_gem');
const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-preview-tts';
// young-to-middle-aged male voices
const VOICES = ['Puck', 'Charon', 'Algieba'];
const RATIOS = ['16x9'];              // audition in landscape; add 9x16 once picked
const DUR = 20;
const BEATS = [0.0, 2.0, 6.5, 9.0, 13.5, 16.0];   // 6 phrase start times

// six sentences, one per beat (sentence 2/4/6 keep an internal comma pause that
// stays shorter than the sentence-boundary pauses, so the split finds 5 clean cuts)
const SCRIPT =
  'Talk to your data. Real data is messy, formats vary by country. ' +
  'Just say what you want. Watch every row change, right in front of you. ' +
  'Ask in any language. Keep the steps, or export to Python.';
const STYLE = 'Read this as one continuous, warm, friendly product narration, ' +
  'at a natural pace with light emphasis on the key words: ';

const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

async function continuousWav(voice, file) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE + SCRIPT }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    });
    if (res.ok) {
      const j = await res.json();
      const pcm = Buffer.from(j.candidates[0].content.parts[0].inlineData.data, 'base64');
      const raw = file + '.pcm'; writeFileSync(raw, pcm);
      execFileSync(FF, ['-hide_banner', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1',
        '-i', raw, file], { stdio: 'ignore' });
      rmSync(raw, { force: true });
      return;
    }
    if (attempt === 4) throw new Error(`Gemini TTS ${res.status}: ${await res.text()}`);
    await new Promise(r => setTimeout(r, 2500 * (attempt + 1)));
  }
}

function totalDur(file) {
  const e = spawnSync(FF, ['-hide_banner', '-i', file]).stderr.toString();
  const m = e.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : 0;
}

// the 5 sentence boundaries = the 5 longest silences (comma pauses are shorter)
function boundaries(file) {
  const e = spawnSync(FF, ['-hide_banner', '-i', file, '-af',
    'silencedetect=noise=-32dB:d=0.15', '-f', 'null', '-']).stderr.toString();
  const sil = [];
  const re = /silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
  let m; while ((m = re.exec(e))) sil.push({ mid: (+m[1] + +m[2]) / 2, dur: +m[3] });
  return sil.sort((a, b) => b.dur - a.dur).slice(0, 5).map(s => s.mid).sort((a, b) => a - b);
}

// build the aligned 20s track: split the continuous read at the boundaries, then
// place each phrase at its beat with adelay (only silence between phrases)
function alignedTrack(cont, dest) {
  const cuts = boundaries(cont);
  const total = totalDur(cont);
  const edges = [0, ...cuts, total];               // 6 segments
  const segs = [];
  for (let i = 0; i < 6; i++) {
    const seg = path.join(tmp, `seg${i}.wav`);
    execFileSync(FF, ['-hide_banner', '-y', '-ss', String(edges[i]), '-to', String(edges[i + 1]),
      '-i', cont, seg], { stdio: 'ignore' });
    segs.push(seg);
  }
  const inputs = segs.flatMap(s => ['-i', s]);
  const filt = segs.map((_, i) =>
    `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,` +
    `adelay=${Math.round(BEATS[i] * 1000)}|${Math.round(BEATS[i] * 1000)}[a${i}]`).join(';');
  const mix = `${segs.map((_, i) => `[a${i}]`).join('')}amix=inputs=6:normalize=0:dropout_transition=0,apad,atrim=0:${DUR}[aout]`;
  execFileSync(FF, ['-hide_banner', '-y', ...inputs, '-filter_complex', `${filt};${mix}`,
    '-map', '[aout]', '-ac', '2', '-ar', '48000', dest], { stdio: 'inherit' });
}

mkdirSync(tmp, { recursive: true });
for (const voice of VOICES) {
  const cont = path.join(out, `voice-${voice}.wav`);
  await continuousWav(voice, cont);
  console.log(`✓ continuous read: ${cont} (${totalDur(cont).toFixed(1)}s)`);

  const track = path.join(tmp, `track-${voice}.wav`);
  alignedTrack(cont, track);
  for (const ratio of RATIOS) {
    const silent = path.join(out, `silent-${ratio}-en.webm`);
    const dest = path.join(out, `hero-${ratio}-en-${voice}.webm`);
    execFileSync(FF, ['-hide_banner', '-y', '-i', silent, '-i', track,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '160k',
      '-shortest', dest], { stdio: 'inherit' });
    console.log(`✓ ${ratio} (${voice}): ${dest}`);
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log('done');
