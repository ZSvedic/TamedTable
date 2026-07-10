// #VoiceInput
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VoicePort, ContinuousVoicePort } from '@tamedtable/web';
import { audioMediaType } from '@tamedtable/voice-input';
import { TamedTableWorld, SPEC_TC_DIR } from './world.ts';
import { webController as controller, webCtx as ctxOf } from './web-file-port.ts';

// A deterministic mic: it plays a committed audio fixture (a real clip), so
// the Gemini request fingerprints identically on every run, which is what
// lets the cassette replay it. `audioMediaType` (shared with the tutorial
// play-audio step) keeps the clip's MIME type identical across both paths.
function fixtureAudio(clip: string): Blob {
  const path = join(SPEC_TC_DIR, clip);
  if (!existsSync(path)) throw new Error(`voice steps: no audio fixture at ${path}`);
  return new Blob([readFileSync(path)], { type: audioMediaType(clip) });
}

function stubVoicePort(clip: string): VoicePort {
  return {
    startRecording: () => Promise.resolve(),
    stopRecording: () => Promise.resolve(fixtureAudio(clip)),
    cancelRecording: () => {},
  };
}

Given('a stub microphone that records {string}', function (this: TamedTableWorld, clip: string) {
  // Must be set before the controller builds lazily on the next "load".
  ctxOf(this).voicePort = stubVoicePort(clip);
});

// A stub continuous (hands-free) port: start() captures the segment handler and
// parks an emitter on the scenario context, so a later step can fire one
// "detected turn" with a committed clip — same bytes the mic stub plays, so the
// patch turn fingerprints identically and the same cassette replays it.
function stubContinuousPort(world: TamedTableWorld, clip: string): ContinuousVoicePort {
  return {
    start(handlers) {
      ctxOf(world).continuousEmit = () => Promise.resolve(handlers.onSegment(fixtureAudio(clip)));
      return Promise.resolve();
    },
    stop() {
      ctxOf(world).continuousEmit = undefined;
    },
    setTuning() {},
  };
}

Given('a stub continuous mic that emits {string}', function (this: TamedTableWorld, clip: string) {
  ctxOf(this).continuousPort = stubContinuousPort(this, clip);
});

Given('a stub continuous mic', function (this: TamedTableWorld) {
  // Visibility/toggle scenarios never fire a turn; any committed clip works.
  ctxOf(this).continuousPort = stubContinuousPort(this, 'voice-validate-dob.m4a');
});

Given('a stub microphone that returns recorded audio', function (this: TamedTableWorld) {
  // Scenarios that never fire a request (visibility, cancel, error) don't
  // care what the clip says — any committed fixture works.
  ctxOf(this).voicePort = stubVoicePort('voice-validate-dob.m4a');
});

Given('the Gemini endpoint returns an error', function (this: TamedTableWorld) {
  // 401 (not retried by the SDK) so the patch turn fails immediately and the
  // controller turns it into the "Voice input failed" toast.
  ctxOf(this).mockLlmFetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          error: { code: 401, message: 'API key not valid.', status: 'UNAUTHENTICATED' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
});

// The tour `speak "X"` step, exercised here as a plain @web scenario so the
// recorder taps the cassette: it builds the same RequestAudio the mic release
// would and runs it through the shared voice patch-turn path. Played as a
// @tour tour, TutorialManager.executeTutorialStep drives the identical
// request and replays this same recording, key-free.
When('speak {string}', async function (this: TamedTableWorld, clip: string) {
  const blob = fixtureAudio(clip);
  const audio = { data: new Uint8Array(await blob.arrayBuffer()), mediaType: blob.type };
  await controller(this).voice.sendAudioRequest(audio);
});

When('user presses and holds the mic button', async function (this: TamedTableWorld) {
  await controller(this).startVoice();
});

When('user releases the mic button', async function (this: TamedTableWorld) {
  await controller(this).stopVoice();
});

// A quick tap: recording starts and then latches (instead of a hold-release),
// so the recording keeps running under the explicit cancel/send controls.
When('user taps the mic button', async function (this: TamedTableWorld) {
  await controller(this).startVoice();
  controller(this).latchVoice();
});

// The send (✓) control on a latched recording — stops and sends, same path as a
// hold-release.
When('user sends the latched recording', async function (this: TamedTableWorld) {
  await controller(this).stopVoice();
});

// The 30 s cap elapsing: the web hook's injected voiceSchedule captured the
// auto-stop callback instead of arming a real timer — firing it here IS the
// timeout, so the scenario needs no 30-second wait.
When('30 seconds pass without a release', async function (this: TamedTableWorld) {
  const pending = ctxOf(this).voiceAutoStop;
  if (!pending) throw new Error('no auto-stop scheduled — is a recording live?');
  assert.equal(pending.ms, 30_000, 'the auto-stop must be armed for 30 s');
  await pending.fn();
});

When('user presses Escape to cancel the recording', function (this: TamedTableWorld) {
  controller(this).cancelVoice();
});

When('user turns continuous voice on', async function (this: TamedTableWorld) {
  await controller(this).toggleContinuous();
});

When('user turns continuous voice off', async function (this: TamedTableWorld) {
  await controller(this).toggleContinuous();
});

When('a voice turn is detected', async function (this: TamedTableWorld) {
  const emit = ctxOf(this).continuousEmit;
  if (!emit) throw new Error('continuous voice is not listening — turn it on first');
  await emit();
});

Then('the mic button is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).voiceAvailable(), true, 'expected the mic button to be shown');
});

Then('the mic button is hidden', function (this: TamedTableWorld) {
  assert.equal(controller(this).voiceAvailable(), false, 'expected the mic button to be hidden');
});

Then('the waveform button is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).continuousAvailable(), true, 'expected the waveform button to be shown');
});

Then('the waveform button is hidden', function (this: TamedTableWorld) {
  assert.equal(controller(this).continuousAvailable(), false, 'expected the waveform button to be hidden');
});

Then('the continuous status is {string}', function (this: TamedTableWorld, status: string) {
  assert.equal(controller(this).continuousStatus, status);
});

Then('the mic status is {string}', function (this: TamedTableWorld, status: string) {
  assert.equal(controller(this).voiceStatus, status);
});

Then('a user bubble shows {string}', function (this: TamedTableWorld, text: string) {
  const found = controller(this).messages.some((m) => m.role === 'user' && m.text === text);
  assert.ok(found, `no user bubble with text "${text}"`);
});

Then('no user bubble shows {string}', function (this: TamedTableWorld, text: string) {
  const found = controller(this).messages.some((m) => m.role === 'user' && m.text === text);
  assert.ok(!found, `unexpected user bubble with text "${text}"`);
});

Then('an assistant bubble shows {string}', function (this: TamedTableWorld, text: string) {
  const found = controller(this).messages.some((m) => m.role === 'assistant' && m.text.includes(text));
  assert.ok(found, `no assistant bubble containing "${text}"`);
});

Then('an assistant bubble is shown', function (this: TamedTableWorld) {
  const found = controller(this).messages.some((m) => m.role === 'assistant');
  assert.ok(found, 'no assistant bubble present');
});

Then('no chat message is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).messages.length, 0, 'expected no chat messages');
});
