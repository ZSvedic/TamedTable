// The commit-time bookkeeping of one request turn: the no-op guard and the
// provenance stamps (#Patch), plus the patch-turn column guards (#Validate).
// All three read the spec the way the MODEL sees it — provenance-stripped, and
// with the loaded source's real column list — which is what these regressions
// (the RED-HL-1a/1b/4/9 bug inventory, now fixed and pinned green) got wrong.
// Every model turn is offline: a fake Anthropic Messages `fetch` is injected
// through HeadlessRunnerOptions.fetch.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from './index.ts';

const DIR = mkdtempSync(join(tmpdir(), 'turn-provenance-'));

// ── Fake Anthropic Messages fetch ───────────────────────────────────────────
type Reply = { tool: unknown[] };

let msgN = 0;
function makeFetch(script: Reply[]) {
  const log: Array<{ url: string; body: string }> = [];
  const f = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    log.push({ url: String(input instanceof Request ? input.url : input), body: String(init?.body ?? '') });
    const r = script.shift();
    if (!r) throw new Error('turn-provenance fake fetch: script exhausted');
    await new Promise((res) => setTimeout(res, 5));
    return new Response(
      JSON.stringify({
        id: `m_${++msgN}`, type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
        content: [{ type: 'tool_use', id: `tu_${++msgN}`, name: 'apply_spec_patch', input: { operations: r.tool } }],
        stop_reason: 'tool_use', stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  return Object.assign(f, { log });
}

const runnerOpts = { model: 'claude-sonnet-4-6', apiKey: 'x', maxRetries: 0 } as const;
const filterStep = { kind: 'filter', pred: { js: 'true' } };
const addOp = (step: unknown) => ({ op: 'add', path: '/transformations/-', value: JSON.stringify(step) });

function csvFile(name: string, content: string): string {
  const path = join(DIR, name);
  writeFileSync(path, content);
  return path;
}

// ── The no-op guard sees the same view the model edited ─────────────────────

test('a model echo of the stripped spec view is rejected as a no-op, not committed', async () => {
  const fetch = makeFetch([
    { tool: [addOp(filterStep)] },
    // Request 2: the model replies with exactly the transformations it was
    // shown (the provenance-stripped view) — a semantic no-op. Repeated for
    // every recovery turn the guard grants.
    { tool: [{ op: 'replace', path: '/transformations', value: JSON.stringify([filterStep]) }] },
    { tool: [{ op: 'replace', path: '/transformations', value: JSON.stringify([filterStep]) }] },
    { tool: [{ op: 'replace', path: '/transformations', value: JSON.stringify([filterStep]) }] },
  ]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(csvFile('hl1a.csv', 'name\nAda\nBev\n'));
  await r.request('keep all rows');
  let outcome = 'committed';
  try {
    await r.request('do something else entirely');
  } catch {
    outcome = 'rejected';
  }
  assert.equal(
    outcome,
    'rejected',
    'spec/behavior.md § Headless: a patch that applies cleanly but leaves the spec identical to before must be rejected — the guard compares the model patch and the current spec with provenance stripped from both, so a do-nothing echo can never commit as success',
  );
});

// ── Stamping: a whole-array replace and a duplicate step ────────────────────

test('a whole-array replace does not restamp untouched steps with the new request query', async () => {
  const sortStep = { kind: 'sort', by: [{ key: 'name', dir: 'asc' }] };
  const fetch = makeFetch([
    { tool: [addOp(filterStep)] },
    // A LEGITIMATE patch: the model rebuilds the whole array from the
    // stripped view it saw and appends the new sort step.
    { tool: [{ op: 'replace', path: '/transformations', value: JSON.stringify([filterStep, sortStep]) }] },
  ]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(csvFile('hl1b.csv', 'name\nAda\nBev\n'));
  await r.request('keep all rows');
  await r.request('sort by name');
  const steps = r.currentSpec().transformations as Array<Record<string, unknown>>;
  assert.equal(
    steps[0]?.query,
    'keep all rows',
    `spec/code-contract.md § provenance: provenance is stripped from the model's view "so the model neither sees nor edits them" — a whole-array replace re-emits the untouched filter step without its stamps, and it must get its OWN earlier stamps back, not the new request's text; got query=${JSON.stringify(steps[0]?.query)}`,
  );
  assert.equal(steps[1]?.query, 'sort by name', 'the step the turn added carries the new request text');
});

test('a turn appending a duplicate of an existing identical step still stamps the request text', async () => {
  const trim = { kind: 'mutate', columns: 'name', value: { js: 'String(row.name).trim()' } };
  const fetch = makeFetch([{ tool: [addOp(trim)] }]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(csvFile('hl9.csv', 'name\n Ada \n Bev \n'));
  // Flow-opened spec (setSpec = unstamped) already contains the trim step.
  await r.setSpec({ columns: [{ id: 'name' }], transformations: [trim] } as never);
  // The request appends an identical duplicate — the turn ADDED a step.
  await r.request('trim the names once more');
  const steps = r.currentSpec().transformations as Array<Record<string, unknown>>;
  assert.ok(
    steps.some((t) => t.query === 'trim the names once more'),
    `spec/code-contract.md § provenance: "The request's text … lands verbatim as \`query\` on the first such transformation" the turn added — the diff counts multiplicity, so an appended duplicate is an added step; stamps = ${JSON.stringify(steps.map((t) => ({ query: t.query, name: t.name })))}`,
  );
});

// ── The patch-turn guards read the loaded spec's columns ────────────────────

test('a valid validate on a sparse-first-row JSONL source commits', async () => {
  // Column b is absent from row 1 but IS a source column: the JSONL codec
  // derives the column list from the union of keys across rows.
  const jsonl = join(DIR, 'hl4.jsonl');
  writeFileSync(jsonl, '{"a":"1"}\n{"a":"2","b":"x"}\n');
  const validateStep = { kind: 'validate', pred: { js: 'row.b != null' } };
  const fetch = makeFetch([{ tool: [addOp(validateStep)] }, { tool: [addOp(validateStep)] }, { tool: [addOp(validateStep)] }]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(jsonl);
  let err: Error | undefined;
  try {
    await r.request('validate that b is present');
  } catch (e) {
    err = e as Error;
  }
  assert.equal(
    err,
    undefined,
    `spec/code-contract.md § core (union-of-keys columns) + spec/behavior.md § Headless (rejects only a column "no step before it provides"): "b" is a source column, so the validate must commit on the first turn — the guards read the loaded spec's column list, never row 0's keys; the request took ${fetch.log.length} model calls and failed: ${err?.message}`,
  );
  assert.equal(fetch.log.length, 1, 'one model call — no recovery turn is burnt on a correct patch');
});
