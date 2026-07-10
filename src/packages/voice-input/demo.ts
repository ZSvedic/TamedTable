// #VoicePort + #VoiceInput demo logic — referenced by demo.html so `bun build`
// bundles it. Three sections: press-and-hold recording (browserVoicePort),
// hands-free VAD capture (browserContinuousPort), and the buildVoicePrompt
// sample rendered into #out (the smoke test's ready signal). No LLM — a captured
// turn is just a clip you can play; the app makes the model call.
import { buildVoicePrompt, type VadTuning } from './index.ts';
import { browserVoicePort } from './browser-voice.ts';
import { browserContinuousPort } from './browser-vad.ts';
import type { ContinuousVoicePort } from './continuous.ts';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

// ---- buildVoicePrompt sample (the smoke test's ready signal) --------------
$('out').textContent = buildVoicePrompt({
  filename: 'people.csv',
  columns: ['name', 'phone', 'country'],
  selectedCell: { col: 'phone', row: 2, value: '555-0199' },
});

// ---- Capabilities ---------------------------------------------------------
const caps: Record<string, boolean> = {
  getUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  WebAssembly: typeof WebAssembly !== 'undefined',
  AudioWorklet: typeof AudioContext !== 'undefined' && 'audioWorklet' in AudioContext.prototype,
};
$('caps').innerHTML = Object.entries(caps)
  .map(([k, v]) => `<dt>${k}</dt><dd class="${v ? 'pass' : 'fail'}">${v ? 'PASS' : 'FAIL'}</dd>`)
  .join('');

// ---- Press-and-hold (VoicePort) -------------------------------------------
const startBtn = $('vi-start') as HTMLButtonElement;
const stopBtn = $('vi-stop') as HTMLButtonElement;
const cancelBtn = $('vi-cancel') as HTMLButtonElement;
const port = browserVoicePort();

function setRecState(state: 'idle' | 'recording' | 'stopped'): void {
  $('vi-state').textContent = state;
  startBtn.disabled = state === 'recording';
  stopBtn.disabled = state !== 'recording';
  cancelBtn.disabled = state !== 'recording';
}

startBtn.addEventListener('click', async () => {
  if (!port) {
    $('vi-result').textContent = 'microphone capture APIs unavailable in this browser';
    return;
  }
  try {
    await port.startRecording();
    setRecState('recording');
  } catch (e) {
    $('vi-result').textContent = (e as Error).message;
  }
});

stopBtn.addEventListener('click', async () => {
  if (!port) return; // recording can't have started without a port
  try {
    const blob = await port.stopRecording();
    $('vi-result').textContent = `${blob.type} · ${blob.size.toLocaleString('en-US')} bytes`;
    const audio = $('vi-audio') as HTMLAudioElement;
    audio.src = URL.createObjectURL(blob);
    audio.style.display = '';
    setRecState('stopped');
  } catch (e) {
    $('vi-result').textContent = (e as Error).message;
    setRecState('idle');
  }
});

cancelBtn.addEventListener('click', () => {
  port?.cancelRecording();
  $('vi-result').textContent = 'cancelled';
  setRecState('idle');
});

setRecState('idle');

// ---- Hands-free (ContinuousVoicePort + VAD) -------------------------------
const PRESETS: Record<string, Pick<VadTuning, 'redemptionMs' | 'minSpeechMs'>> = {
  snappy: { redemptionMs: 300, minSpeechMs: 200 },
  balanced: { redemptionMs: 700, minSpeechMs: 300 },
  relaxed: { redemptionMs: 1400, minSpeechMs: 400 },
};
let cont: ContinuousVoicePort | null = null;
let turns = 0;

function readTuning(): Partial<VadTuning> {
  return {
    redemptionMs: Number(($('redemptionMs') as HTMLInputElement).value),
    minSpeechMs: Number(($('minSpeechMs') as HTMLInputElement).value),
  };
}

function setHfState(listening: boolean): void {
  $('hf-state').textContent = listening ? 'listening' : 'idle';
  const btn = $('hf-toggle') as HTMLButtonElement;
  btn.textContent = listening ? '■ Stop hands-free' : '▶ Start hands-free';
  btn.classList.toggle('on', listening);
}

function applyPreset(name: keyof typeof PRESETS): void {
  const p = PRESETS[name]!;
  ($('redemptionMs') as HTMLInputElement).value = String(p.redemptionMs);
  ($('minSpeechMs') as HTMLInputElement).value = String(p.minSpeechMs);
  cont?.setTuning?.(readTuning()); // live if already listening
}

document.querySelectorAll<HTMLButtonElement>('button[data-preset]').forEach((b) => {
  b.addEventListener('click', () => applyPreset(b.dataset.preset as keyof typeof PRESETS));
});
['redemptionMs', 'minSpeechMs'].forEach((id) => {
  $(id).addEventListener('change', () => cont?.setTuning?.(readTuning()));
});
applyPreset('balanced'); // start snappier than the library default

$('hf-toggle').addEventListener('click', async () => {
  if (cont) {
    cont.stop();
    cont = null;
    setHfState(false);
    return;
  }
  $('hf-err').textContent = '';
  cont = browserContinuousPort(readTuning());
  if (!cont) {
    $('hf-err').textContent = 'microphone capture APIs unavailable in this browser';
    return;
  }
  try {
    await cont.start({
      onSpeechStart: () => {
        $('hf-result').textContent = '… speaking …';
      },
      onSegment: (clip) => {
        turns++;
        $('hf-result').textContent = `turn ${turns}: ${clip.type} · ${clip.size.toLocaleString('en-US')} bytes`;
        const audio = $('hf-audio') as HTMLAudioElement;
        audio.src = URL.createObjectURL(clip);
        audio.style.display = '';
      },
      onError: (e) => {
        $('hf-err').textContent = e.message;
      },
    });
    setHfState(true);
  } catch (e) {
    $('hf-err').textContent = (e as Error).message;
    cont = null;
    setHfState(false);
  }
});
