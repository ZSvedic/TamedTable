// #VoiceMode demo logic. Wires the public API to a dead-simple UI: a toggle, a
// shopping list the voice mutates live, a status readout, and capability +
// memory probes. No table, no LLM — commands are parsed locally so the demo
// proves the hands-free loop in isolation.
import {
  createVoiceSession,
  geminiSTT,
  checkSupport,
  type VoiceSession,
  type VoiceState,
  type VadTuning,
} from './src/index.ts';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

// ---- Capability check (PASS/FAIL on load) ---------------------------------
const support = checkSupport();
const caps = $('caps');
// #out is the demo's ready signal — the smoke harness waits for it to fill.
$('out').textContent = support.getUserMedia
  ? 'Ready. Paste a Gemini key and turn Full Voice Mode on.'
  : 'This browser cannot capture the mic (getUserMedia missing).';
const labels: Record<keyof typeof support, string> = {
  getUserMedia: 'getUserMedia',
  webAssembly: 'WebAssembly',
  audioWorklet: 'AudioWorklet',
};
caps.innerHTML = (Object.keys(labels) as (keyof typeof support)[])
  .map((k) => {
    const ok = support[k];
    return `<dt>${labels[k]}</dt><dd class="${ok ? 'pass' : 'fail'}">${ok ? 'PASS' : 'FAIL'}</dd>`;
  })
  .join('');

// ---- Shopping list — the live-mutating target -----------------------------
let list: string[] = [];

function renderList(): void {
  $('list').innerHTML = list.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
}

/** Parse a handful of trivial commands. Returns what happened, for the readout. */
function applyCommand(textRaw: string): string {
  const text = textRaw.trim().toLowerCase().replace(/[.!?]+$/, '');
  if (/^(clear|empty|reset)( (the|everything|all|list|the list))?$/.test(text)) {
    list = [];
    renderList();
    return 'cleared the list';
  }
  let m = text.match(/^(?:add|put|buy)\s+(.+?)(?:\s+to(?:\s+the)?\s+list)?$/);
  if (m) {
    const item = m[1]!.trim();
    list.push(item);
    renderList();
    return `added “${item}”`;
  }
  m = text.match(/^(?:remove|delete|drop|take off)\s+(.+?)(?:\s+from(?:\s+the)?\s+list)?$/);
  if (m) {
    const item = m[1]!.trim();
    const before = list.length;
    list = list.filter((x) => x.toLowerCase() !== item);
    renderList();
    return before === list.length ? `“${item}” not on the list` : `removed “${item}”`;
  }
  return `(no command matched)`;
}

// ---- VAD tuning panel ------------------------------------------------------
let session: VoiceSession | null = null; // declared here so the preset below can re-tune a running session
type VadField = 'redemptionMs' | 'minSpeechMs' | 'positiveSpeechThreshold' | 'negativeSpeechThreshold';
const VAD_FIELDS: VadField[] = ['redemptionMs', 'minSpeechMs', 'positiveSpeechThreshold', 'negativeSpeechThreshold'];

const PRESETS: Record<string, Record<VadField, number>> = {
  // redemptionMs is the felt delay; snappier presets cut it hard.
  snappy: { redemptionMs: 300, minSpeechMs: 200, positiveSpeechThreshold: 0.5, negativeSpeechThreshold: 0.35 },
  balanced: { redemptionMs: 700, minSpeechMs: 300, positiveSpeechThreshold: 0.4, negativeSpeechThreshold: 0.3 },
  relaxed: { redemptionMs: 1400, minSpeechMs: 400, positiveSpeechThreshold: 0.3, negativeSpeechThreshold: 0.25 },
};

function readVad(): Partial<VadTuning> {
  const out: Partial<VadTuning> = {};
  for (const f of VAD_FIELDS) out[f] = Number(($(f) as HTMLInputElement).value);
  return out;
}

function applyPreset(name: keyof typeof PRESETS): void {
  const p = PRESETS[name]!;
  for (const f of VAD_FIELDS) ($(f) as HTMLInputElement).value = String(p[f]);
  session?.updateVad(readVad()); // live if running
}

document.querySelectorAll<HTMLButtonElement>('button[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset as keyof typeof PRESETS));
});
VAD_FIELDS.forEach((f) => {
  $(f).addEventListener('change', () => session?.updateVad(readVad()));
});
applyPreset('balanced'); // start snappier than the library default

// ---- Session wiring --------------------------------------------------------
let speechEndAt = 0;

function setStateBadge(s: VoiceState): void {
  $('state').textContent = s;
}

async function turnOn(): Promise<void> {
  $('err').textContent = '';
  const apiKey = ($('apikey') as HTMLInputElement).value.trim();
  if (!apiKey) {
    $('err').textContent = 'Paste your Gemini API key first.';
    return;
  }
  const model = ($('model') as HTMLInputElement).value.trim();

  session = createVoiceSession({
    // The context is pulled fresh each turn, so editing the keyword box takes
    // effect on the very next thing you say.
    stt: geminiSTT({ apiKey, model, context: () => ($('context') as HTMLTextAreaElement).value }),
    vad: readVad(), // current panel values; live-tuned afterwards via session.updateVad

    onStateChange: (s) => {
      setStateBadge(s);
      if (s === 'transcribing') speechEndAt = performance.now();
    },
    onTranscript: (t) => {
      const ref = speechEndAt || performance.now();
      $('ttft').textContent = `${Math.round(performance.now() - ref)} ms`;
      $('final').textContent = t;
      $('cmd').textContent = applyCommand(t);
    },
    onError: (err) => {
      $('err').textContent = `[${err.stage}] ${err.message}`;
    },
  });

  try {
    await session.start();
    setToggle(true);
  } catch (e) {
    $('err').textContent = (e as Error).message ?? String(e);
    session?.destroy();
    session = null;
    setToggle(false);
  }
}

function turnOff(): void {
  session?.destroy();
  session = null;
  setStateBadge('idle');
  setToggle(false);
}

function setToggle(on: boolean): void {
  const btn = $('toggle') as HTMLButtonElement;
  btn.textContent = on ? '■ Turn Full Voice Mode off' : '▶ Turn Full Voice Mode on';
  btn.classList.toggle('on', on);
  // Lock the key and model while running; the context box stays editable so you
  // can change keywords live.
  ($('apikey') as HTMLInputElement).disabled = on;
  ($('model') as HTMLInputElement).disabled = on;
}

$('toggle').addEventListener('click', () => {
  if (session) turnOff();
  else void turnOn();
});

// ---- Memory readout (Chrome only) -----------------------------------------
interface PerfMemory { usedJSHeapSize: number; totalJSHeapSize: number; }
const perfMem = (performance as unknown as { memory?: PerfMemory }).memory;
if (perfMem) {
  const fmt = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
  setInterval(() => {
    $('mem').textContent = `${fmt(perfMem.usedJSHeapSize)} used / ${fmt(perfMem.totalJSHeapSize)} total`;
  }, 1000);
} else {
  $('mem').textContent = 'unavailable (Chrome-only)';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

renderList();
