// #ModelConfig — the settings panel's per-provider instructions and the FAQ's
// BYOK cards say the same thing in two places, on purpose: the panel gets the
// two lines that fit in a 400px sheet, the FAQ gets the long form.
//
// The prose is allowed to differ. The console URL is not — that is the one
// piece a user acts on, and a provider that moves its key page would otherwise
// leave one of the two sending people somewhere that no longer exists.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KEY_SETUP } from '../packages/model-config/index.ts';

const FAQ = readFileSync(join(import.meta.dirname, '../../marketing/web/FAQ.html'), 'utf8');

test('every provider a key can be pasted for has instructions', () => {
  assert.deepEqual(
    KEY_SETUP.map((s) => s.provider),
    ['gemini', 'openai', 'anthropic', 'openrouter', 'groq'],
    'the instructions row lists the five providers a pasted key can belong to — Puter comes from the sign-in button',
  );
  for (const setup of KEY_SETUP) {
    assert.ok(setup.steps.length > 0, `${setup.provider} has no steps`);
    assert.match(setup.url, /^https:\/\//, `${setup.provider}'s key URL is not https`);
  }
});

test("each panel instruction's key URL is the one the FAQ sends people to", () => {
  for (const setup of KEY_SETUP) {
    assert.ok(
      FAQ.includes(setup.url),
      `the settings panel sends ${setup.provider} users to ${setup.url}, which FAQ.html does not mention — one of the two is out of date`,
    );
  }
});
