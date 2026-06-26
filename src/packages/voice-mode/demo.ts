// #VoiceMode demo logic. Wires the public API to a dead-simple UI: a toggle, a
// shopping list the voice mutates live, a status readout, and capability +
// memory probes. No table, no LLM — commands are parsed locally so the demo
// proves the hands-free loop in isolation.
import {
  createVoiceSession,
  webSpeechSTT,
  whisperSTT,
  checkSupport,
  type VoiceSession,
  type VoiceState,
  type STTProvider,
} from './src/index.ts';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

// ---- Capability check (PASS/FAIL on load) ---------------------------------
const support = checkSupport();
const caps = $('caps');
// #out is the demo's ready signal — the smoke harness waits for it to fill.
$('out').textContent = support.getUserMedia
  ? 'Ready. Pick a provider and turn Full Voice Mode on.'
  : 'This browser cannot capture the mic (getUserMedia missing).';
const labels: Record<keyof typeof support, string> = {
  getUserMedia: 'getUserMedia',
  webAssembly: 'WebAssembly',
  audioWorklet: 'AudioWorklet',
  speechRecognition: 'SpeechRecognition',
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

// ---- Session wiring --------------------------------------------------------
let session: VoiceSession | null = null;
let speechStartAt = 0;
let speechEndAt = 0;

function buildProvider(): STTProvider {
  const which = (document.querySelector('input[name="provider"]:checked') as HTMLInputElement).value;
  if (which === 'whisper') {
    const [baseUrl, model] = ($('endpoint') as HTMLSelectElement).value.split('|');
    const apiKey = ($('apikey') as HTMLInputElement).value.trim();
    if (!apiKey) throw new Error('Paste an API key for the Whisper provider first.');
    return whisperSTT({ apiKey, baseUrl, model });
  }
  return webSpeechSTT();
}

function setStateBadge(s: VoiceState): void {
  $('state').textContent = s;
}

async function turnOn(): Promise<void> {
  $('err').textContent = '';
  let provider: STTProvider;
  try {
    provider = buildProvider();
  } catch (e) {
    $('err').textContent = (e as Error).message;
    return;
  }

  session = createVoiceSession({
    stt: provider,
    onStateChange: (s) => {
      setStateBadge(s);
      if (s === 'speech') {
        speechStartAt = performance.now();
        speechEndAt = 0;
      } else if (s === 'transcribing') {
        speechEndAt = performance.now();
      }
    },
    onPartialTranscript: (t) => {
      $('partial').textContent = t;
    },
    onTranscript: (t) => {
      const ref = speechEndAt || speechStartAt || performance.now();
      $('ttft').textContent = `${Math.round(performance.now() - ref)} ms`;
      $('final').textContent = t;
      $('partial').textContent = '—';
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
  // Lock the provider choice while running.
  document.querySelectorAll<HTMLInputElement>('input[name="provider"], #endpoint, #apikey').forEach((el) => {
    el.disabled = on;
  });
}

$('toggle').addEventListener('click', () => {
  if (session) turnOff();
  else void turnOn();
});

// Show the Whisper key/endpoint inputs only when that provider is picked.
document.querySelectorAll<HTMLInputElement>('input[name="provider"]').forEach((el) => {
  el.addEventListener('change', () => {
    const whisper = (document.querySelector('input[name="provider"]:checked') as HTMLInputElement).value === 'whisper';
    ($('whisper-cfg') as HTMLElement).hidden = !whisper;
  });
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
