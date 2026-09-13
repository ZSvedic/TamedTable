// #Analyze
// Steps for spec/test-cases/analyze.feature and the Analyze
// showcase tour: questions about the data answered without changing the
// table (behavior.md § Questions about the data). Assertions are structural
// or grounded in the fixture, never on the model's wording: a recording
// fixes the text, a fresh recording may not.
//
// The @scripted-answer scenarios answer the model calls locally, so the
// first query is a guaranteed parse error and the retry a known query: the
// self-correction path is deterministic where a live model would not be.
import { Given, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { TamedTableWorld } from './world.ts';
import { webController } from './web-file-port.ts';

/** The shape `Runner.request` settles with (spec/code-contract.md § Questions
 *  about the data), typed here so these steps import nothing that does not
 *  exist yet. */
interface AnswerTable { columns: string[]; rows: unknown[][]; totalRows: number }
type RequestResult =
  | { kind: 'patch'; summary?: string }
  | { kind: 'answer'; text: string; table?: AnswerTable };

interface AnswerMessage {
  role: string;
  text: string;
  answer?: { table?: AnswerTable };
  debug?: { expressions: Array<{ label: string; body: string }> };
}

function lastResult(world: TamedTableWorld): RequestResult {
  const outcome = world.lastRequestOutcome;
  assert.ok(outcome, 'no request was made');
  assert.ok(outcome.ok, `the request failed: ${outcome.error?.message}`);
  const result = outcome.result as RequestResult | undefined;
  assert.ok(
    result && typeof result === 'object' && 'kind' in result,
    `the request settled with no RequestResult (got ${JSON.stringify(result)}): the runner does not report answers yet`,
  );
  return result;
}

function lastAnswer(world: TamedTableWorld): Extract<RequestResult, { kind: 'answer' }> {
  const result = lastResult(world);
  assert.equal(result.kind, 'answer', `expected an answer, the request settled as ${JSON.stringify(result)}`);
  return result as Extract<RequestResult, { kind: 'answer' }>;
}

// ── Outcome ────────────────────────────────────────────────────────────────

Then('the request was answered, not applied', function (this: TamedTableWorld) {
  lastAnswer(this);
  const { specBefore, specAfter } = this.lastRequestOutcome!;
  assert.deepEqual(specAfter?.transformations, specBefore.transformations, 'an answer must leave the spec untouched');
});

Then('the request was applied, not answered', function (this: TamedTableWorld) {
  const result = lastResult(this);
  assert.equal(result.kind, 'patch', `expected a patch, the request settled as ${JSON.stringify(result)}`);
});

Then('no transformation was added', function (this: TamedTableWorld) {
  const { specBefore } = this.lastRequestOutcome!;
  const now = this.ensureRunner().currentSpec().transformations;
  assert.equal(now.length, specBefore.transformations.length, `expected no new transformation, spec has ${JSON.stringify(now)}`);
});

// The summary rides on the request result on every surface; the web reply's
// first line is summarizeDebug's job (controller-messages.test.ts).
Then('the reply carries a one-sentence summary', function (this: TamedTableWorld) {
  const summary = (lastResult(this) as { summary?: string }).summary;
  assert.ok(summary && summary.trim().length > 0, 'the reply carries no summary');
  assert.ok(summary.length <= 200, `summary is not one sentence: ${JSON.stringify(summary)}`);
  assert.ok(/[.!]$/.test(summary.trim()), `summary does not end a sentence: ${JSON.stringify(summary)}`);
});

// ── The answer ─────────────────────────────────────────────────────────────

Then('the answer mentions {string}', function (this: TamedTableWorld, needle: string) {
  const { text } = lastAnswer(this);
  assert.ok(text.includes(needle), `the answer does not mention ${JSON.stringify(needle)}: ${JSON.stringify(text)}`);
});

Then('the answer mentions a percentage between {int} and {int}', function (this: TamedTableWorld, lo: number, hi: number) {
  const { text } = lastAnswer(this);
  const found = [...text.matchAll(/(\d+(?:\.\d+)?)\s?%/g)].map((m) => Number(m[1]));
  assert.ok(found.length > 0, `the answer names no percentage: ${JSON.stringify(text)}`);
  assert.ok(found.some((p) => p >= lo && p <= hi), `no percentage in ${lo}..${hi} in ${JSON.stringify(text)} (found ${found.join(', ')})`);
});

Then('the answer is at most {int} sentences', function (this: TamedTableWorld, n: number) {
  const { text } = lastAnswer(this);
  assert.ok(text.trim().length > 0, 'the answer is empty');
  const sentences = text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0);
  assert.ok(sentences.length <= n, `expected at most ${n} sentences, got ${sentences.length}: ${JSON.stringify(text)}`);
});

Then("the answer's result table has a {string} column", function (this: TamedTableWorld, column: string) {
  const { table } = lastAnswer(this);
  assert.ok(table, 'the answer carries no result table');
  assert.ok(table.columns.includes(column), `no column ${JSON.stringify(column)} in ${JSON.stringify(table.columns)}`);
});

Then("the answer's result table has at least {int} row(s)", function (this: TamedTableWorld, n: number) {
  const { table } = lastAnswer(this);
  assert.ok(table, 'the answer carries no result table');
  assert.ok(table.rows.length >= n, `expected at least ${n} rows, got ${table.rows.length}`);
});

Then('every remaining row has Country {string}', function (this: TamedTableWorld, country: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(rows.length > 0, 'no rows left');
  rows.forEach((r, i) => assert.equal(r['Country'], country, `row ${i}`));
});

// ── Web chat ───────────────────────────────────────────────────────────────

function answerMessages(world: TamedTableWorld): AnswerMessage[] {
  return (webController(world).messages as AnswerMessage[]).filter((m) => m.role === 'assistant' && m.answer !== undefined);
}

function describeMessages(world: TamedTableWorld): string {
  return webController(world).messages.map((m) => `${m.role}: ${m.text}`).join(' | ') || '(none)';
}

Then('the chat shows an answer', function (this: TamedTableWorld) {
  assert.ok(answerMessages(this).length > 0, `no answer message. Messages: ${describeMessages(this)}`);
});

Then('the chat shows an answer mentioning {string}', function (this: TamedTableWorld, needle: string) {
  assert.ok(
    answerMessages(this).some((m) => m.text.includes(needle)),
    `no answer message mentions ${JSON.stringify(needle)}. Messages: ${describeMessages(this)}`,
  );
});

Then('the answer message shows a result table with the column {string}', function (this: TamedTableWorld, column: string) {
  const answers = answerMessages(this);
  const last = answers[answers.length - 1];
  assert.ok(last, `no answer message. Messages: ${describeMessages(this)}`);
  assert.ok(last.answer?.table, 'the answer message carries no result table');
  assert.ok(last.answer.table.columns.includes(column), `no column ${JSON.stringify(column)} in ${JSON.stringify(last.answer.table.columns)}`);
});

Then('the answer message lists its query in the request detail', function (this: TamedTableWorld) {
  const answers = answerMessages(this);
  const last = answers[answers.length - 1];
  assert.ok(last, `no answer message. Messages: ${describeMessages(this)}`);
  const queries = (last.debug?.expressions ?? []).filter((e) => e.label === 'query');
  assert.ok(queries.length > 0, `the request detail lists no query: ${JSON.stringify(last.debug?.expressions)}`);
  assert.ok(/^\s*(select|with)\b/i.test(queries[0]!.body), `not a read: ${queries[0]!.body}`);
});

// ── Scripted model (the self-correction path) ──────────────────────────────

/** A canned Gemini generateContent response carrying one function call:
 *  the default provider's wire shape (the same as sql.steps.ts scripts). */
function functionCallBody(name: string, args: Record<string, unknown>): string {
  return JSON.stringify({
    candidates: [{
      content: { parts: [{ functionCall: { name, args, id: 'scripted' } }], role: 'model' },
      finishReason: 'STOP',
      index: 0,
    }],
    usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
    modelVersion: 'scripted',
    responseId: 'scripted',
  });
}

const BROKEN_SQL = 'SELECT Country, count(*) AS customers FROM t GROUP BY';
const GOOD_SQL = 'SELECT Country, count(*) AS customers FROM t GROUP BY Country ORDER BY customers DESC LIMIT 5';

interface ScriptedAnswerState {
  /** Every model-call body the script answered, in order. */
  bodies: string[];
  mode: 'broken-then-good' | 'only-queries';
}

const scriptedAnswers = new WeakMap<TamedTableWorld, ScriptedAnswerState>();

/** Route model call N of the request: the reply depends only on the call's
 *  position, so the script never has to parse the SDK's conversation shape. */
function scriptedReply(state: ScriptedAnswerState): string {
  const n = state.bodies.length; // 1-based after push
  if (state.mode === 'only-queries') return functionCallBody('query_table', { sql: GOOD_SQL });
  if (n === 1) return functionCallBody('query_table', { sql: BROKEN_SQL });
  if (n === 2) return functionCallBody('query_table', { sql: GOOD_SQL });
  return functionCallBody('reply', { text: 'USA has the most customers: 3 of 20.' });
}

function installScript(world: TamedTableWorld, mode: ScriptedAnswerState['mode']): void {
  if (!world.runnerOpts) throw new Error('no runner options bound: did a per-tag Before hook run?');
  const state: ScriptedAnswerState = { bodies: [], mode };
  scriptedAnswers.set(world, state);
  world.runnerOpts.fetch = async (_input, init) => {
    const body = typeof init?.body === 'string' ? init.body : String(init?.body ?? '');
    state.bodies.push(body);
    return new Response(scriptedReply(state), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

Given('a scripted model that first sends a broken query', function (this: TamedTableWorld) {
  installScript(this, 'broken-then-good');
});

Given('a scripted model that only ever queries', function (this: TamedTableWorld) {
  installScript(this, 'only-queries');
});

Then('the model ran {int} queries, the first of which failed', function (this: TamedTableWorld, n: number) {
  const state = scriptedAnswers.get(this);
  assert.ok(state, 'not a scripted-answer scenario');
  // Call 1 sent the broken query, call 2 the good one, call 3 the reply:
  // n queries means n + 1 model calls.
  assert.equal(state.bodies.length, n + 1, `expected ${n + 1} model calls, got ${state.bodies.length}`);
  // The second call carries the first query's error back to the model.
  assert.ok(/error/i.test(state.bodies[1]!), 'the second model call does not carry the failed query\'s error');
  assert.ok(state.bodies[1]!.includes(BROKEN_SQL), 'the second model call does not echo the broken query');
});
