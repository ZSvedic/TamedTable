// #VoiceInput
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WebController, VoicePort } from '@tamedtable/web';
import { audioMediaType } from '@tamedtable/voice-input';
import { TamedTableWorld, SPEC_TC_DIR } from './world.ts';
import { webScenarios } from './web-file-port.ts';

function controller(world: TamedTableWorld): WebController {
  return world.ensureRunner() as unknown as WebController;
}

function ctxOf(world: TamedTableWorld) {
  const ctx = webScenarios.get(world);
  if (!ctx) throw new Error('web scenario context missing — is the @web Before hook wired?');
  return ctx;
}

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

Given('a stub microphone that plays {string}', function (this: TamedTableWorld, clip: string) {
  // Must be set before the controller builds lazily on the next "load".
  ctxOf(this).voicePort = stubVoicePort(clip);
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

// The tour `Play voiceover: "X"` step, exercised here as a plain @web scenario so
// the recorder taps the cassette: it builds the same RequestAudio the mic release
// would and runs it through the shared voice patch-turn path. Played as a
// @tutorial tour, TutorialManager.executeTutorialStep drives the identical
// request and replays this same recording, key-free.
When('Play voiceover: {string}', async function (this: TamedTableWorld, clip: string) {
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

When('user presses Escape to cancel the recording', function (this: TamedTableWorld) {
  controller(this).cancelVoice();
});

Then('the mic button is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).voiceAvailable(), true, 'expected the mic button to be shown');
});

Then('the mic button is hidden', function (this: TamedTableWorld) {
  assert.equal(controller(this).voiceAvailable(), false, 'expected the mic button to be hidden');
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
