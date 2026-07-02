// Gemini-TTS alternative to audio.mjs, for auditioning voices.
// Synthesizes the voiceover with google's gemini-2.5-flash-preview-tts (returns
// 24kHz PCM), assembles a 20s track per candidate voice at out/track-gemini-
// <voice>.wav, and muxes the primary voice into both ratios as
// hero-<ratio>-en-gemini.webm (kept separate from the OpenAI hero-*.webm so the
// two can be compared). Needs GEMINI_API_KEY. Usage: node gemini-tts.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(DIR, 'out');
const tmp = path.join(out, '_gem');
const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-preview-tts';
const STYLE = 'Say warmly and naturally, like a friendly product narrator, at a ' +
  'normal pace with light emphasis on the key words: ';
// warm / friendly candidates; primary is muxed into the videos
const VOICES = ['Sulafat', 'Achird', 'Vindemiatrix'];
const PRIMARY = 'Sulafat';
const RATIOS = ['16x9', '9x16'];
const DUR = 20;

const FF = execFileSync('python3',
  ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

const VO = [
  [0.0, 'Talk to your data.'],
  [2.0, 'Real data is messy. Formats vary by country.'],
  [6.5, 'Just say what you want.'],
  [9.0, 'Watch every row change, right in front of you.'],
  [13.5, 'Ask in any language.'],
  [16.0, 'Keep the steps, or export to Python.'],
];

async function ttsPCM(text, voice) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE + text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    });
    if (res.ok) {
      const j = await res.json();
      const b64 = j.candidates[0].content.parts[0].inlineData.data;
      return Buffer.from(b64, 'base64');
    }
    if (attempt === 4) throw new Error(`Gemini TTS ${res.status}: ${await res.text()}`);
    await new Promise(r => setTimeout(r, 2500 * (attempt + 1)));
  }
}

mkdirSync(tmp, { recursive: true });
const tracks = {};
for (const voice of VOICES) {
  const clips = [];
  for (let i = 0; i < VO.length; i++) {
    const pcm = await ttsPCM(VO[i][1], voice);
    const raw = path.join(tmp, `${voice}-${i}.pcm`);
    const wav = path.join(tmp, `${voice}-${i}.wav`);
    writeFileSync(raw, pcm);
    execFileSync(FF, ['-hide_banner', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1',
      '-i', raw, wav], { stdio: 'ignore' });
    clips.push({ start: VO[i][0], file: wav });
  }
  const inputs = clips.flatMap(c => ['-i', c.file]);
  const filt = clips.map((c, i) =>
    `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,` +
    `adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)}[a${i}]`).join(';');
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${DUR}[aout]`;
  const track = path.join(out, `track-gemini-${voice}.wav`);
  execFileSync(FF, ['-hide_banner', '-y', ...inputs, '-filter_complex', `${filt};${mix}`,
    '-map', '[aout]', '-ac', '2', '-ar', '48000', track], { stdio: 'inherit' });
  tracks[voice] = track;
  console.log(`✓ voice ${voice}: ${track}`);
}

for (const ratio of RATIOS) {
  const silent = path.join(out, `silent-${ratio}-en.webm`);
  const dest = path.join(out, `hero-${ratio}-en-gemini.webm`);
  execFileSync(FF, ['-hide_banner', '-y', '-i', silent, '-i', tracks[PRIMARY],
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '160k',
    '-shortest', dest], { stdio: 'inherit' });
  console.log(`✓ ${ratio} (${PRIMARY}): ${dest}`);
}
rmSync(tmp, { recursive: true, force: true });
console.log('done');
