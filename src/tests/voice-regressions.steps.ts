// Step defs for the voice-input regression scenarios in
// spec/test-cases/voice.feature — the 2026-07-29 hunt findings RED-VOICE-1,
// -2, -6 and -7, fixed and moved green (-3/-4/-5 are unit tests in
// voice-lifecycle.test.ts). Self-contained: each scenario builds its own
// WebController with stub voice ports, a captured voiceSchedule (so the 30 s
// auto-stop fires on demand), and an offline fetch — either the committed
// cassettes/voice.json replay or a canned Gemini function-call response. No
// network, no API key, no real timers.
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
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
import { cassetteFetch } from './cassette.ts';

const REPO = join(import.meta.dirname, '../..');
const TC = join(REPO, 'spec/test-cases');

/** Minimal FilePort: the voice scenarios never open or save via the picker. */
class RedVoiceFilePort implements FilePort {
  readonly hasFileSystemAccess = true;
  pickOpen(): Promise<PickedFile | null> {
    return Promise.resolve(null);
  }
  pickSave(name: string): Promise<SaveOutcome> {
    return Promise.resolve({ status: 'saved', name });
  }
}

function clip(name: string): Blob {
  return new Blob([readFileSync(join(TC, name))], { type: audioMediaType(name) });
}

interface VoiceRig {
  c: WebController;
  /** The captured 30 s auto-stop, if currently armed. */
  autoStop: () => { fn: () => Promise<void>; ms: number } | undefined;
}

/** Controller wired like the green web profile: captured voiceSchedule plus
 *  an offline fetch (cassette replay unless the scenario injects its own). */
function makeRig(extra: Record<string, unknown> = {}): VoiceRig {
  let pending: { fn: () => Promise<void>; ms: number } | undefined;
  const replay = cassetteFetch({ mode: 'replay', file: join(REPO, 'cassettes/voice.json') });
  const c = createWebController({
    file: new RedVoiceFilePort(),
    fetch: (i, init) => Promise.resolve(replay(i, init)),
    env: {},
    voiceSchedule: (fn: () => Promise<void>, ms: number) => {
      pending = { fn, ms };
      return () => {
        pending = undefined;
      };
    },
    ...extra,
  });
  return { c, autoStop: () => pending };
}

async function loadCustomers(c: WebController): Promise<void> {
  const name = 'customers-input.csv';
  await c.loadFromBytes(name, new Uint8Array(readFileSync(join(TC, name))));
  if (c.largeFileDialog) await c.loadOriginalOrder();
}

async function useGemini(c: WebController): Promise<void> {
  await c.setConfig({ provider: 'gemini', geminiKey: 'AIza-example-key' });
}

interface RedVoiceState {
  rig: VoiceRig;
  /** RED-VOICE-1: the unresolved startVoice() call and the permission grant. */
  startPending?: Promise<void>;
  grant?: () => void;
  recorderLive?: () => boolean;
  /** RED-VOICE-2: recorder/VAD teardown flags and the second (continuous) rig. */
  micReleased?: () => boolean;
  contRig?: VoiceRig;
  contStopped?: () => boolean;
  contEmit?: (b: Blob) => void | Promise<void>;
  /** RED-VOICE-7: the in-flight voice turn and the gate holding its model call. */
  inflight?: Promise<void>;
  release?: () => void;
}

const S = new WeakMap<object, RedVoiceState>();

function state(world: object): RedVoiceState {
  const s = S.get(world);
  if (!s) throw new Error('voice-regressions state missing — did the Given step run?');
  return s;
}

// ── RED-VOICE-1: release during pending getUserMedia ─────────────────────────

Given('a regression voice session whose microphone permission prompt is pending', async function () {
  let grant!: () => void;
  let live = false;
  const port: VoicePort = {
    // getUserMedia is up as the browser permission prompt — resolves on grant.
    startRecording: () =>
      new Promise<void>((res) => {
        grant = () => {
          live = true;
          res();
        };
      }),
    stopRecording: () => {
      live = false;
      return Promise.resolve(clip('voice-normalize-dob.m4a'));
    },
    cancelRecording: () => {
      live = false;
    },
  };
  const rig = makeRig({ voice: port });
  await loadCustomers(rig.c);
  await useGemini(rig.c);
  // MicButton press: onPointerDown fires void onStart() un-awaited.
  const startPending = rig.c.startVoice();
  S.set(this, { rig, startPending, grant: () => grant(), recorderLive: () => live });
});

When('the user releases the mic before the permission is granted', async function () {
  // Pointer-up while the permission prompt is still showing.
  await state(this).rig.c.stopVoice();
});

Then('granting the permission leaves the mic idle and the auto-stop sends nothing', async function () {
  const s = state(this);
  s.grant!();
  await s.startPending;
  // If the (already released) recording armed its 30 s auto-stop anyway, let
  // it fire — the user walked away after granting the prompt.
  const auto = s.rig.autoStop();
  if (auto) await auto.fn();
  const c = s.rig.c;
  const voiceBubbles = c.messages.filter((m) => m.role === 'user' && m.text.startsWith('\u{1F399}'));
  const sent = c.displaySpec().transformations.length;
  assert.ok(
    sent === 0 && voiceBubbles.length === 0 && c.voiceStatus === 'idle' && !s.recorderLive!(),
    `RED-VOICE-1 (spec/behavior.md:1589): "hold the button to record … and release to send" — a release during the pending permission prompt must end the session, never leave the mic hot; instead the release was lost (stopVoice bails while voiceStatus is still 'idle'), the grant lit the mic with nobody holding the button, and the 30 s auto-stop sent ${voiceBubbles.length} unattended voice turn(s) (${JSON.stringify(voiceBubbles.map((m) => m.text))}) applying ${sent} transformation(s)`,
  );
});

// ── RED-VOICE-2: provider/key change mid-recording ───────────────────────────

Given('a regression voice session with a latched mic recording', async function () {
  let released = false;
  const port: VoicePort = {
    startRecording: () => Promise.resolve(),
    stopRecording: () => {
      released = true;
      return Promise.resolve(clip('voice-normalize-dob.m4a'));
    },
    cancelRecording: () => {
      released = true;
    },
  };
  const rig = makeRig({ voice: port });
  await loadCustomers(rig.c);
  await useGemini(rig.c);
  await rig.c.startVoice();
  rig.c.latchVoice(); // quick tap: hands-free ✕/✓ controls, recording live
  S.set(this, { rig, micReleased: () => released });
});

Given('a second regression voice session listening hands-free', async function () {
  const s = state(this);
  let stopped = false;
  let emit: ((b: Blob) => void | Promise<void>) | undefined;
  const cont: ContinuousVoicePort = {
    start: (h) => {
      emit = h.onSegment;
      return Promise.resolve();
    },
    stop: () => {
      stopped = true;
      emit = undefined;
    },
  };
  const contRig = makeRig({ continuousVoice: cont });
  await loadCustomers(contRig.c);
  await useGemini(contRig.c);
  await contRig.c.toggleContinuous();
  s.contRig = contRig;
  s.contStopped = () => stopped;
  s.contEmit = (b) => emit?.(b);
});

When('the provider is switched mid-recording and the key is removed mid-listening', async function () {
  const s = state(this);
  // Settings is reachable while recording/listening — no voiceStatus guard.
  await s.rig.c.clickProviderCard('anthropic');
  await s.contRig!.c.setConfig({ geminiKey: null });
});

Then('both microphones are released and the keyless detected turn is not sent', async function () {
  const s = state(this);
  const problems: string[] = [];
  const a = s.rig.c;
  if (!s.micReleased!() || a.voiceStatus !== 'idle' || s.rig.autoStop() !== undefined) {
    problems.push(
      `the latched recording survives the provider switch with its controls unmounted (recorder released=${s.micReleased!()}, voiceStatus='${a.voiceStatus}', mic button rendered=${a.voiceAvailable()}, 30 s auto-stop still armed=${s.rig.autoStop() !== undefined})`,
    );
  }
  // The VAD — still holding the mic — detects a spoken turn after the key is gone.
  await s.contEmit!(clip('voice-normalize-dob.m4a'));
  const b = s.contRig!.c;
  const sent = b.displaySpec().transformations.length;
  if (!s.contStopped!() || sent > 0) {
    problems.push(
      `hands-free listening survives key removal (VAD stopped=${s.contStopped!()}, continuousStatus='${b.continuousStatus}', waveform rendered=${b.continuousAvailable()}) and the keyless turn was sent via the placeholder-key fallback, applying ${sent} transformation(s)`,
    );
  }
  assert.equal(
    problems.length,
    0,
    `RED-VOICE-2 (spec/behavior.md:1576-1583, 1638): the mic is shown only for a voice-capable model with a key, and "Stopping releases the microphone" — closing the gate mid-session must tear the live session down; instead ${problems.join('; and ')}`,
  );
});

// ── RED-VOICE-6: transcript on a declined patch ──────────────────────────────

/** Canned Gemini function-call turn: one AI mutate plus a transcript — enough
 *  to trip the always-run-all estimate on a 20-row table paged at 10. */
const GEMINI_VOICE_TURN = JSON.stringify({
  candidates: [
    {
      content: {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'apply_spec_patch',
              args: {
                operations: [
                  {
                    op: 'add',
                    path: '/transformations/-',
                    value: JSON.stringify({
                      kind: 'mutate',
                      columns: 'DOB',
                      value: { llm: 'ISO-8601 this DOB: {DOB}' },
                    }),
                  },
                ],
                transcript: 'Normalize DOB column',
              },
            },
          },
        ],
      },
      finishReason: 'STOP',
    },
  ],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
});

Given('a regression voice session in always-run-all mode with a prior cell edit in history', async function () {
  const port: VoicePort = {
    startRecording: () => Promise.resolve(),
    stopRecording: () => Promise.resolve(clip('voice-normalize-dob.m4a')),
    cancelRecording: () => {},
  };
  const rig = makeRig({
    voice: port,
    pageSize: 10, // 20-row CSV on a 10-row page → the run-all estimate asks
    fetch: () =>
      Promise.resolve(
        new Response(GEMINI_VOICE_TURN, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
  });
  await loadCustomers(rig.c);
  await rig.c.setConfig({ provider: 'gemini', geminiKey: 'AIza-example-key', alwaysRunAll: true });
  // An earlier, unrelated undoable action sits on top of the history.
  await rig.c.editCell(0, 'FirstName', 'Zed');
  S.set(this, { rig });
});

When('a spoken request trips the run-all estimate and the user declines it', async function () {
  const s = state(this);
  const c = s.rig.c;
  const turn = (async () => {
    await c.startVoice();
    await c.stopVoice();
  })();
  for (let i = 0; i < 400 && !c.runAllDialog; i++) await new Promise((r) => setTimeout(r, 5));
  if (!c.runAllDialog) throw new Error('precondition: the run-all estimate dialog should appear for the spoken request');
  c.declineRunAll();
  await turn;
});

Then('the prior undo entry keeps its label and no success bubble is posted', function () {
  const c = state(this).rig.c;
  const labels = c.history().map((h) => h.label);
  const doneBubbles = c.messages.filter((m) => m.role === 'assistant' && m.text === 'Done.').length;
  const problems: string[] = [];
  if (labels.some((l) => l.startsWith('\u{1F399}'))) {
    problems.push(`the previous unrelated undo entry was relabeled to the declined turn's transcript (history now ${JSON.stringify(labels)})`);
  }
  if (doneBubbles > 0) {
    problems.push(`a success-style "Done." assistant bubble was posted for the dropped patch`);
  }
  assert.equal(
    problems.length,
    0,
    `RED-VOICE-6 (spec/code-contract.md:1368-1369): the undo-history label is rewritten to the transcript "on success" only, and a declined confirmation means no history entry and no error surface (controller-engine.ts:469-472); instead ${problems.join('; and ')} — while the table correctly kept only the prior cell edit (${c.displaySpec().transformations.length} transformation(s), the declined voice patch itself dropped)`,
  );
});

// ── RED-VOICE-7: Stop button dead for mic voice turns ────────────────────────

Given('a regression voice session with a mic voice turn held mid-flight', async function () {
  const port: VoicePort = {
    startRecording: () => Promise.resolve(),
    stopRecording: () => Promise.resolve(clip('voice-normalize-dob.m4a')),
    cancelRecording: () => {},
  };
  const replay = cassetteFetch({ mode: 'replay', file: join(REPO, 'cassettes/voice.json') });
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  let gated = true;
  const rig = makeRig({
    voice: port,
    fetch: async (i: string | URL | Request, init?: RequestInit) => {
      if (gated) {
        gated = false;
        await gate;
      }
      return replay(i, init);
    },
  });
  await loadCustomers(rig.c);
  await useGemini(rig.c);
  await rig.c.startVoice();
  const inflight = rig.c.stopVoice();
  for (let i = 0; i < 400 && !rig.c.streaming; i++) await new Promise((r) => setTimeout(r, 5));
  if (!rig.c.streaming) throw new Error('precondition: the voice turn should be streaming (Stop button rendered) while its model call is held open');
  S.set(this, { rig, inflight, release });
});

When('the user clicks the chat Stop button and the model reply then lands', async function () {
  const s = state(this);
  s.rig.c.cancelRequest(); // the Stop button (ChatPanel renders it off `streaming`)
  s.release!();
  await s.inflight;
});

Then('the cancelled voice turn applies no transformation', function () {
  const c = state(this).rig.c;
  const sent = c.displaySpec().transformations.length;
  assert.equal(
    sent,
    0,
    `RED-VOICE-7 (spec/behavior.md:905-907): the chat Stop button "cancels either kind of run", but cancelRequest() during a mic voice turn is a no-op — the voice path passes its own signal so engine.activeAbort is never armed (controller-engine.ts:413-415) — and the turn applied ${sent} transformation(s) anyway`,
  );
});
