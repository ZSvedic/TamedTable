// #VoiceInput
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { WebController, VoicePort } from '@tamedtable/web';
import { TamedTableWorld } from './world.ts';
import { webScenarios } from './web-file-port.ts';

function controller(world: TamedTableWorld): WebController {
  return world.ensureRunner() as unknown as WebController;
}

function ctxOf(world: TamedTableWorld) {
  const ctx = webScenarios.get(world);
  if (!ctx) throw new Error('web scenario context missing — is the @web Before hook wired?');
  return ctx;
}

// A deterministic mic: fixed audio bytes so the Gemini request fingerprints
// identically on every run, which is what lets the cassette replay it.
const FIXED_AUDIO = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);

function stubVoicePort(): VoicePort {
  return {
    startRecording: () => Promise.resolve(),
    stopRecording: () => Promise.resolve(new Blob([FIXED_AUDIO], { type: 'audio/webm' })),
    cancelRecording: () => {},
  };
}

Given('a stub microphone that returns recorded audio', function (this: TamedTableWorld) {
  // Must be set before the controller builds lazily on the next "load".
  ctxOf(this).voicePort = stubVoicePort();
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

Then('an assistant bubble is shown', function (this: TamedTableWorld) {
  const found = controller(this).messages.some((m) => m.role === 'assistant');
  assert.ok(found, 'no assistant bubble present');
});

Then('no chat message is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).messages.length, 0, 'expected no chat messages');
});
