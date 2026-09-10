// #LoadSuggestions
// Steps for spec/test-cases/load-suggestions.feature: the after-load
// suggestion call on the headless, CLI, and web surfaces. Assertions are
// structural (count, shape, grounding, executability), never on the model's
// wording: the recording fixes the text, a fresh recording may not.
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import type { HeadlessRunner } from '@tamedtable/headless';
import { TamedTableWorld, fixturePath } from './world.ts';
import { webController } from './web-file-port.ts';

interface SuggestionState {
  suggestions?: string[];
  picked?: string;
  shown?: number;
  /** Per suggestion: the error a request threw, or null when it committed. */
  outcomes?: Array<{ text: string; added: number; error: string | null }>;
}

const states = new WeakMap<object, SuggestionState>();
function stateOf(world: object): SuggestionState {
  let s = states.get(world);
  if (!s) { s = {}; states.set(world, s); }
  return s;
}

function headless(world: TamedTableWorld): HeadlessRunner {
  return world.ensureRunner() as unknown as HeadlessRunner;
}

// ── Opt-in ─────────────────────────────────────────────────────────────────

Given('load suggestions are on', function (this: TamedTableWorld) {
  // Hosts opt in (spec/code-contract.md § Load suggestions). The per-surface
  // Before hook handed the same options object to its runner factory and the
  // CLI invocation spreads it at call time, so flip the flag in place. A web
  // controller already built gets its own flag flipped too.
  if (!this.runnerOpts) throw new Error('no runner options bound: did a per-tag Before hook run?');
  this.runnerOpts.suggestions = true;
  if (this.surface === 'web' && this.runner) webController(this).suggestionsEnabled = true;
});

// ── Headless ───────────────────────────────────────────────────────────────

When('suggestions are requested', async function (this: TamedTableWorld) {
  stateOf(this).suggestions = await headless(this).suggest();
});

Then('between {int} and {int} suggestions are returned', function (this: TamedTableWorld, lo: number, hi: number) {
  const list = stateOf(this).suggestions;
  assert.ok(list, 'no suggestions were requested');
  assert.ok(
    list.length >= lo && list.length <= hi,
    `expected ${lo}..${hi} suggestions, got ${list.length}: ${JSON.stringify(list)}`,
  );
});

Then('every suggestion is a sentence ending in a period', function (this: TamedTableWorld) {
  const list = stateOf(this).suggestions ?? [];
  for (const s of list) assert.ok(s.endsWith('.'), `not a sentence: ${JSON.stringify(s)}`);
});

Then(
  'no suggestion is empty, repeated, or longer than {int} characters',
  function (this: TamedTableWorld, max: number) {
    const list = stateOf(this).suggestions ?? [];
    for (const s of list) {
      assert.ok(s.trim().length > 0, `empty suggestion in ${JSON.stringify(list)}`);
      assert.ok(s.length <= max, `suggestion longer than ${max} chars: ${JSON.stringify(s)}`);
    }
    assert.equal(new Set(list.map((s) => s.toLowerCase())).size, list.length, `repeated suggestion in ${JSON.stringify(list)}`);
  },
);

Then('at least one suggestion names a column of the table', function (this: TamedTableWorld) {
  const list = stateOf(this).suggestions ?? [];
  const columns = headless(this).currentSpec().columns.map((c) => c.id.toLowerCase());
  const grounded = list.some((s) => columns.some((col) => s.toLowerCase().includes(col)));
  assert.ok(grounded, `no suggestion names a column (${columns.join(', ')}): ${JSON.stringify(list)}`);
});

When('every suggestion is sent as a request in turn', async function (this: TamedTableWorld) {
  const runner = headless(this);
  const list = stateOf(this).suggestions ?? [];
  const outcomes: NonNullable<SuggestionState['outcomes']> = [];
  for (const text of list) {
    const before = runner.currentSpec().transformations.length;
    try {
      await runner.request(text);
      outcomes.push({ text, added: runner.currentSpec().transformations.length - before, error: null });
    } catch (e) {
      outcomes.push({ text, added: 0, error: (e as Error).message });
    }
  }
  stateOf(this).outcomes = outcomes;
});

Then('every suggestion committed at least one transformation', function (this: TamedTableWorld) {
  const outcomes = stateOf(this).outcomes;
  assert.ok(outcomes && outcomes.length > 0, 'no suggestion was sent');
  const bad = outcomes.filter((o) => o.error !== null || o.added < 1);
  assert.equal(
    bad.length,
    0,
    `suggestions that did not execute:\n${bad.map((o) => `  ${JSON.stringify(o.text)}: ${o.error ?? 'added no transformation'}`).join('\n')}`,
  );
});

// ── CLI ────────────────────────────────────────────────────────────────────

Then('the REPL ran suggestion {int} by its listed text', function (this: TamedTableWorld, n: number) {
  const out = this.lastInvocation?.stdout ?? '';
  const listed = out.match(new RegExp(`^  ${n}\\. (.+)$`, 'm'));
  assert.ok(listed, `suggestion ${n} is not listed in stdout:\n${out}`);
  const echo = `running suggestion ${n}: ${listed[1]}`;
  assert.ok(out.includes(echo), `stdout lacks ${JSON.stringify(echo)}:\n${out}`);
});

Then('the flow {string} has {int} transformation(s)', async function (this: TamedTableWorld, file: string, n: number) {
  const flow = JSON.parse(await readFile(fixturePath(file), 'utf8')) as { spec: { transformations: unknown[] } };
  assert.equal(flow.spec.transformations.length, n);
});

// ── Web ────────────────────────────────────────────────────────────────────

Then('between {int} and {int} suggestion chips are shown', async function (this: TamedTableWorld, lo: number, hi: number) {
  const c = webController(this);
  await c.awaitSuggestions();
  const n = c.suggestions.length;
  assert.ok(n >= lo && n <= hi, `expected ${lo}..${hi} chips, got ${n}: ${JSON.stringify(c.suggestions)}`);
  stateOf(this).shown = n;
});

When('user picks suggestion chip {int}', function (this: TamedTableWorld, n: number) {
  const c = webController(this);
  const text = c.suggestions[n - 1];
  assert.ok(text, `no chip ${n}: ${JSON.stringify(c.suggestions)}`);
  c.pickSuggestion(text);
  stateOf(this).picked = text;
});

Then('one fewer suggestion chip is shown', function (this: TamedTableWorld) {
  const { shown, picked } = stateOf(this);
  assert.ok(shown !== undefined, 'the chip count was never read');
  const c = webController(this);
  assert.equal(c.suggestions.length, shown - 1);
  assert.ok(!c.suggestions.includes(picked!), `the picked chip is still shown: ${JSON.stringify(c.suggestions)}`);
});

When('user sends the picked suggestion', async function (this: TamedTableWorld) {
  const { picked } = stateOf(this);
  assert.ok(picked, 'no chip was picked');
  await webController(this).sendChat(picked);
});

// The Lazy AI tour's stop (spec/test-cases/showcase-lazy-ai.feature): the
// chips arrived for a 25,000-row file, because the sample the model reads is
// twenty rows whatever the file holds.
Then('AI suggestions are shown', async function (this: TamedTableWorld) {
  const c = webController(this);
  await c.awaitSuggestions();
  assert.ok(c.suggestions.length > 0, 'no AI suggestions arrived');
  assert.equal(c.suggestionsLoading, false, 'the suggestion call never settled');
});

Then('no suggestion chips are shown', async function (this: TamedTableWorld) {
  const c = webController(this);
  await c.awaitSuggestions();
  assert.deepEqual(c.suggestions, []);
});
