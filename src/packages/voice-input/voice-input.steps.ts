// #VoiceInput
// Step defs for the @headless voice-input scenarios — pure prompt assembly,
// no browser. The package's own steps live next to the code (see
// spec/packages/README.md); they import nothing from the app harness.
import { Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { buildVoicePrompt, type VoiceContext } from './index.ts';

interface VoiceWorld {
  _vi?: { ctx?: VoiceContext; prompt?: string };
}

function ctx(world: VoiceWorld): NonNullable<VoiceWorld['_vi']> {
  world._vi ??= {};
  return world._vi;
}

Given(
  'a voice context for file {string} with columns {string}',
  function (this: VoiceWorld, filename: string, columns: string) {
    ctx(this).ctx = { filename, columns: columns.split(',').map((c) => c.trim()) };
  },
);

Given(
  'the context selects cell {string} row {int} value {string}',
  function (this: VoiceWorld, col: string, row: number, value: string) {
    ctx(this).ctx!.selectedCell = { col, row, value };
  },
);

When('buildVoicePrompt is called', function (this: VoiceWorld) {
  ctx(this).prompt = buildVoicePrompt(ctx(this).ctx!);
});

Then('the prompt contains {string}', function (this: VoiceWorld, expected: string) {
  const prompt = ctx(this).prompt!;
  assert.ok(prompt.includes(expected), `prompt does not contain "${expected}":\n${prompt}`);
});

Then('the prompt does not contain {string}', function (this: VoiceWorld, text: string) {
  assert.ok(!ctx(this).prompt!.includes(text));
});
