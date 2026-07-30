// RED-VOICE-3..5 — red unit tests (bug inventory): voice-input defects driven
// through WebController with stub voice/continuous ports, offline — the model
// call replays the committed cassettes/voice.json; no network, no API key, no
// real timers (promise gates only). RED-VOICE-1, -2, -6 and -7 are Gherkin
// scenarios in spec/test-cases/red/red-voice.feature.
//
// Excluded from plain `bun test` by bunfig [test] pathIgnorePatterns; run via
// `bun run test:red:unit`.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createWebController,
  type WebController,
  type FilePort,
  type PickedFile,
  type SaveOutcome,
  type VoicePort,
  type ContinuousVoicePort,
} from '@tamedtable/web';
import { audioMediaType } from '@tamedtable/voice-input';
import { cassetteFetch } from '../cassette.ts';

const REPO = join(import.meta.dirname, '../../..');
const TC = join(REPO, 'spec/test-cases');

class RedVoiceFilePort implements FilePort {
  readonly hasFileSystemAccess = true;
  pickOpen(): Promise<PickedFile | null> {
    return Promise.resolve(null);
  }
  pickSave(name: string): Promise<SaveOutcome> {
    return Promise.resolve({ status: 'saved', name });
  }
}

const clip = (name: string): Blob =>
  new Blob([readFileSync(join(TC, name))], { type: audioMediaType(name) });

function makeController(extra: Record<string, unknown> = {}): WebController {
  const replay = cassetteFetch({ mode: 'replay', file: join(REPO, 'cassettes/voice.json') });
  return createWebController({
    file: new RedVoiceFilePort(),
    fetch: (i, init) => Promise.resolve(replay(i, init)),
    env: {},
    voiceSchedule: () => () => {},
    ...extra,
  });
}

async function loadCustomers(c: WebController): Promise<void> {
  const name = 'customers-input.csv';
  await c.loadFromBytes(name, new Uint8Array(readFileSync(join(TC, name))));
  if (c.largeFileDialog) await c.loadOriginalOrder();
}

const useGemini = (c: WebController): Promise<void> =>
  c.setConfig({ provider: 'gemini', geminiKey: 'AIza-example-key' });

const micPort = (): VoicePort => ({
  startRecording: () => Promise.resolve(),
  stopRecording: () => Promise.resolve(clip('voice-normalize-dob.m4a')),
  cancelRecording: () => {},
});

// RED-VOICE-3 (minor). Cause: controller-voice.ts:230 — the continuous drop
// guard is `continuousBusy || continuousStatus === 'idle'`; `continuousBusy`
// is set only by continuous's own segments, so an in-flight typed or mic turn
// (engine busy) is invisible to it and the clip errors instead of dropping.
test('RED-VOICE-3: a continuous clip landing while a mic turn applies errors instead of being dropped', async () => {
  let emit: ((b: Blob) => void | Promise<void>) | undefined;
  const cont: ContinuousVoicePort = {
    start: (h) => {
      emit = h.onSegment;
      return Promise.resolve();
    },
    stop: () => {
      emit = undefined;
    },
  };
  const replay = cassetteFetch({ mode: 'replay', file: join(REPO, 'cassettes/voice.json') });
  let open!: () => void;
  const gate = new Promise<void>((r) => {
    open = r;
  });
  let gated = true;
  const c = makeController({
    voice: micPort(),
    continuousVoice: cont,
    fetch: async (i: string | URL | Request, init?: RequestInit) => {
      if (gated) {
        gated = false;
        await gate;
      }
      return replay(i, init);
    },
  });
  await loadCustomers(c);
  await useGemini(c);
  await c.toggleContinuous();

  // Mic turn goes out and hangs at the model; hands-free is still listening.
  await c.startVoice();
  const mic = c.stopVoice();
  for (let i = 0; i < 400 && !c.streaming; i++) await new Promise((r) => setTimeout(r, 5));
  assert.ok(c.streaming, 'precondition: the mic turn should be in flight while its model call is held open');

  // The VAD detects a spoken turn mid-request.
  await emit!(clip('voice-normalize-dob.m4a'));

  const errorToasts = c.toasts.filter((t) => t.kind === 'error').map((t) => t.message);
  const placeholders = c.messages.filter(
    (m) => m.role === 'user' && m.text === '\u{1F399} Voice request',
  ).length;
  const errorBubbles = c.messages.filter(
    (m) => m.role === 'assistant' && m.text.startsWith('Error:'),
  ).length;
  open();
  await mic;
  assert.ok(
    errorToasts.length === 0 && placeholders <= 1 && errorBubbles === 0,
    `RED-VOICE-3 (spec/code-contract.md:1350-1351): "A clip that lands while a turn is still applying is dropped" — any turn, not only a continuous one; instead the overlapping clip produced ${errorToasts.length} error toast(s) (${JSON.stringify(errorToasts)}), ${errorBubbles} assistant Error bubble(s), and ${placeholders} \u{1F399} Voice request placeholder bubble(s) — the second stranded forever`,
  );
});

// RED-VOICE-4 (minor). Cause: controller-voice.ts:97-103 — a stopRecording
// failure pushes a toast only and returns, skipping host.fail(), so no
// assistant chat message is posted for a microphone failure.
test('RED-VOICE-4: a microphone failure at release produces a toast but no assistant chat message', async () => {
  const port: VoicePort = {
    startRecording: () => Promise.resolve(),
    stopRecording: () => Promise.reject(new Error('recording device lost')),
    cancelRecording: () => {},
  };
  const c = makeController({ voice: port });
  await loadCustomers(c);
  await useGemini(c);
  await c.startVoice();
  await c.stopVoice();

  const toast = c.toasts.find((t) => t.kind === 'error' && t.message.startsWith('Voice input failed'));
  assert.ok(toast, 'precondition: the "Voice input failed" error toast should be pushed (it is today)');
  const assistantError = c.messages.find(
    (m) => m.role === 'assistant' && m.text.includes('Voice input failed'),
  );
  assert.ok(
    assistantError !== undefined,
    `RED-VOICE-4 (spec/behavior.md:1606-1609): "On any failure (microphone, network, or a model error) a toast reading \\"Voice input failed\\" reports it, the same error also appears as an assistant message in the chat" — the toast was pushed (${JSON.stringify(toast?.message)}) but no assistant message exists; the toast fades and the chat keeps no trace of the microphone failure (assistant bubbles: ${JSON.stringify(c.messages.filter((m) => m.role === 'assistant').map((m) => m.text.slice(0, 40)))})`,
  );
});

// RED-VOICE-5 (major). Cause: controller-voice.ts:198-212 — startContinuous
// guards on continuousStatus but sets 'listening' only after the awaited
// port.start(), so every click during the seconds-long VAD load re-enters
// start; browser-vad.ts keeps a single `vad` slot, so stop() destroys only
// the last session and the first keeps the microphone forever.
test('RED-VOICE-5: double-clicking the waveform during the VAD load opens two listening sessions; stop releases only one', async () => {
  let startCalls = 0;
  let stopCalls = 0;
  const liveSessions: number[] = [];
  let resolvers: Array<() => void> = [];
  // Mirrors browserContinuousPort: one `vad` variable; stop() kills only the
  // most recent session (browser-vad.ts:18,22,35-37).
  const cont: ContinuousVoicePort = {
    start: () => {
      const id = ++startCalls;
      return new Promise<void>((res) => {
        resolvers.push(() => {
          liveSessions.push(id);
          res();
        });
      });
    },
    stop: () => {
      stopCalls++;
      liveSessions.pop();
    },
  };
  const c = makeController({ continuousVoice: cont });
  await loadCustomers(c);
  await useGemini(c);

  const t1 = c.toggleContinuous(); // click 1 — VAD model + WASM downloading
  const t2 = c.toggleContinuous(); // click 2 — impatient, or toggling back off
  resolvers.forEach((r) => r());
  resolvers = [];
  await t1;
  await t2;
  await c.toggleContinuous(); // the user clicks to stop

  assert.ok(
    startCalls <= 1 && liveSessions.length === 0,
    `RED-VOICE-5 (spec/behavior.md:1620-1623, 1638): the waveform button "is a toggle: click it once and the app listens continuously, click again to stop", and "Stopping releases the microphone" — a second click during the async VAD start must stop or be ignored; instead port.start ran ${startCalls} times (stop ran ${stopCalls}) and ${liveSessions.length} session(s) are still live holding the microphone (status now '${c.continuousStatus}')`,
  );
});
