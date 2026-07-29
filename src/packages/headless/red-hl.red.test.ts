// Red unit tests — headless engine bug inventory (RED-HL-1..9).
// Every test here documents one confirmed open defect and FAILS by design:
// each assertion states the SPEC-CORRECT behavior and its message names the
// defect. Excluded from `bun test` by bunfig pathIgnorePatterns; run with
// `bun run test:red:unit`. All model turns are offline: a fake Anthropic
// Messages `fetch` is injected through HeadlessRunnerOptions.fetch.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner, tryParseBatchResponse } from './index.ts';

const DIR = mkdtempSync(join(tmpdir(), 'red-hl-'));

// ── Fake Anthropic Messages fetch ───────────────────────────────────────────
type Reply =
  | { tool: unknown[] } // tool_use apply_spec_patch with ops
  | { plain: string } // text-only reply
  | { http: number } // HTTP error
  | { stall: true }; // never resolves; rejects with AbortError on abort

let msgN = 0;
function makeFetch(script: Reply[] | ((url: string, body: string) => Reply)) {
  const log: Array<{ url: string; body: string }> = [];
  const f = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);
    const body = String(init?.body ?? '');
    log.push({ url, body });
    const r = typeof script === 'function' ? script(url, body) : script.shift();
    if (!r) throw new Error('red-hl fake fetch: script exhausted');
    if ('stall' in r) {
      return await new Promise<Response>((_, rej) => {
        const s = init?.signal;
        const boom = () => rej(new DOMException('This operation was aborted.', 'AbortError'));
        if (s?.aborted) boom();
        s?.addEventListener('abort', boom, { once: true });
      });
    }
    await new Promise((res) => setTimeout(res, 5));
    if ('http' in r) {
      return new Response(
        JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'red-hl fake: bad request' } }),
        { status: r.http, headers: { 'content-type': 'application/json' } },
      );
    }
    const content =
      'tool' in r
        ? [{ type: 'tool_use', id: `tu_${++msgN}`, name: 'apply_spec_patch', input: { operations: r.tool } }]
        : [{ type: 'text', text: r.plain }];
    return new Response(
      JSON.stringify({
        id: `m_${++msgN}`, type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
        content, stop_reason: 'tool' in r ? 'tool_use' : 'end_turn', stop_sequence: null,
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

// ── RED-HL-1: no-op guard vs provenance stamps ──────────────────────────────

test('RED-HL-1a: a model echo of the stripped spec view is a no-op and must be rejected, not committed', async () => {
  const fetch = makeFetch([
    { tool: [addOp(filterStep)] },
    // Request 2: the model replies with exactly the transformations it was
    // shown (the provenance-stripped view) — a semantic no-op. Repeated for
    // every recovery turn a correct guard would grant.
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
    'RED-HL-1a (spec/behavior.md:136): a patch that applies cleanly but leaves the spec identical to before must be rejected — but the no-op guard (index.ts:509) compares the model patch (built from the provenance-STRIPPED view) against the STAMPED spec, so the do-nothing echo committed as success',
  );
});

test('RED-HL-1b: a whole-array replace must not restamp untouched steps with the new request query', async () => {
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
    `RED-HL-1b (spec/code-contract.md:80-82): provenance is stripped from the model's view "so the model neither sees nor edits them" — yet a whole-array replace restamps the untouched filter step with the NEW request's text (stampQueries at index.ts:527-541 never matches the stripped echo against the stamped prior set); got query=${JSON.stringify(steps[0]?.query)}`,
  );
});

// ── RED-HL-2: abort mid-model-call must surface as 'Runner: cancelled' ──────

test('RED-HL-2a: aborting request() while the patch-turn model call is in flight throws Runner: cancelled', async () => {
  const fetch = makeFetch([{ stall: true }]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(csvFile('hl2a.csv', 'w\naa\nbb\n'));
  const ac = new AbortController();
  const p = r.request('anything', { signal: ac.signal });
  setTimeout(() => ac.abort(), 50);
  let err: Error | undefined;
  try {
    await p;
  } catch (e) {
    err = e as Error;
  }
  assert.equal(
    err?.message,
    'Runner: cancelled',
    `RED-HL-2a (spec/behavior.md:190-197 #CancelOp step 4 "Signal cancelled"; spec/code-contract.md:131-134): aborting mid-model-call must throw 'Runner: cancelled' (CLI session.ts:95 and web controller-messages.ts:56 string-match it) — the patch-turn callLlm await (index.ts:1037) has no abort translation, so the raw SDK error escaped: ${err?.name}: ${err?.message}`,
  );
});

test('RED-HL-2b: aborting setSpec() while an {llm} cell call is in flight throws Runner: cancelled', async () => {
  const fetch = makeFetch([{ stall: true }]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(csvFile('hl2b.csv', 'w\naa\nbb\n'));
  const ac = new AbortController();
  const p = r.setSpec(
    {
      columns: [{ id: 'w' }, { id: 'u' }],
      transformations: [{ kind: 'mutate', columns: 'u', value: { llm: 'upper {w}' } }],
    } as never,
    { signal: ac.signal },
  );
  setTimeout(() => ac.abort(), 50);
  let err: Error | undefined;
  try {
    await p;
  } catch (e) {
    err = e as Error;
  }
  assert.equal(
    err?.message,
    'Runner: cancelled',
    `RED-HL-2b (spec/code-contract.md:131-134): "aborting \`signal\` throws \`Runner: cancelled\` with the previous spec and rows untouched" — setSpec (index.ts:981-991) has no abort translation and evalLlmBatch rethrows verbatim (index.ts:1538), so the raw SDK error escaped: ${err?.name}: ${err?.message}`,
  );
});

// ── RED-HL-3: onDebug on model-call failure ─────────────────────────────────

test('RED-HL-3: onDebug fires once per request on failure too — including failures inside the model call itself', async () => {
  // Case 1: provider returns HTTP 400 on the patch turn.
  let fires400 = 0;
  {
    const fetch = makeFetch([{ http: 400 }]);
    const r = createHeadlessRunner({ ...runnerOpts, fetch, onDebug: () => fires400++ });
    await r.loadInput(csvFile('hl3a.csv', 'a\n1\n'));
    try {
      await r.request('do a thing');
    } catch {
      /* expected: request fails */
    }
  }
  // Case 2: the model replies with plain text and never calls the tool.
  let firesText = 0;
  {
    const fetch = makeFetch([{ plain: 'Sure! I will add a filter for you.' }]);
    const r = createHeadlessRunner({ ...runnerOpts, fetch, onDebug: () => firesText++ });
    await r.loadInput(csvFile('hl3b.csv', 'a\n1\n'));
    try {
      await r.request('do a thing');
    } catch {
      /* expected: request fails */
    }
  }
  assert.ok(
    fires400 >= 1,
    `RED-HL-3 (spec/code-contract.md:305-307): "onDebug fires once per request — on success and on failure — just before the call settles"; the request failed with HTTP 400 in the model call and onDebug fired ${fires400} times (callLlm at index.ts:1037 is awaited outside any try, so its throw skips the debug report)`,
  );
  assert.ok(
    firesText >= 1,
    `RED-HL-3 (spec/code-contract.md:305-307): the request failed with a no-tool-call reply and onDebug fired ${firesText} times — the failed call's token spend is invisible to CLI and web`,
  );
});

// ── RED-HL-4: validate guard must use the spec's column union ───────────────

test('RED-HL-4: a valid validate on a sparse-first-row JSONL source must commit, not burn the recovery budget', async () => {
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
    `RED-HL-4 (spec/code-contract.md:184-186 union-of-keys columns; spec/behavior.md:141-144 rejects only a column "no step before it provides"): "b" is a source column, so the validate must commit — but the guard reads Object.keys(sourceRows[0]) instead of the spec's column list (index.ts:1058-1060) and the request died after ${fetch.log.length} model calls: ${err?.message}`,
  );
});

// ── RED-HL-5: JS group aggregate signature ──────────────────────────────────

test('RED-HL-5: JS group aggregates evaluate with the contracted (rows, key, allGroups) signature', async () => {
  const r = createHeadlessRunner(runnerOpts);
  await r.loadInput(csvFile('hl5.csv', 'c,n\nx,1\nx,2\ny,3\n'));
  let err: Error | undefined;
  try {
    await r.setSpec({
      columns: [{ id: 'c' }, { id: 'k' }],
      transformations: [{ kind: 'group', by: ['c'], agg: { k: { js: 'rows.length + " in " + key' } } }],
    } as never);
  } catch (e) {
    err = e as Error;
  }
  assert.equal(
    err,
    undefined,
    `RED-HL-5 (spec/code-contract.md:614-616): agg JS expressions are contracted as "(rows, key, allGroups) => …" — but both compile paths bind only rows (engine.ts:157, index.ts:1368), so an aggregate referencing the group key threw: ${err?.message}`,
  );
  assert.deepEqual(
    r.currentRows().map((row) => row.k),
    ['2 in x', '1 in y'],
    'RED-HL-5 (spec/code-contract.md:614-616): the group key must be bound as `key` inside a JS aggregate',
  );
});

// ── RED-HL-6: only the literal lowercased word null becomes JSON null ───────

test('RED-HL-6: cell replies "NULL"/"Null" are real strings — only the literal lowercased word null becomes JSON null', () => {
  assert.deepEqual(
    tryParseBatchResponse('["NULL","Null","ok"]', 3),
    ['NULL', 'Null', 'ok'],
    'RED-HL-6 (spec/behavior.md:173-174): "an empty reply or the literal lowercased word `null` becomes a JSON null" — but the parser lowercases first (index.ts:1591, 1686), so the legitimate answers "NULL" and "Null" are destroyed to JSON null',
  );
});

// ── RED-HL-7: {llm} sort keys and group aggregates must batch like mutate ───

const N = 45;
const BATCH = 20; // spec default TAMEDTABLE_BATCH_SIZE (code-contract.md:335)

/** Count numbered batch tasks ([1]\n … [k]\n) in a serialized request body. */
function countTasks(body: string): number {
  const m = body.match(/\[(\d+)\]\\n/g);
  return m ? m.length : 1;
}

/** Fake fetch that answers every cell batch with a correctly-sized JSON array. */
const echoBatchFetch = () =>
  makeFetch((_url, body) => {
    const k = countTasks(body);
    return { plain: JSON.stringify(Array.from({ length: k }, (_, i) => `r${i}`)) };
  });

const bigCsv = () => csvFile('hl7.csv', 'v\n' + Array.from({ length: N }, (_, i) => `item${i}`).join('\n') + '\n');

test('RED-HL-7a: an {llm} sort key over 45 rows is packed 20 per batch, like mutate', async () => {
  const fetch = echoBatchFetch();
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(bigCsv());
  await r.setSpec({
    columns: [{ id: 'v' }],
    transformations: [{ kind: 'sort', by: [{ key: { llm: 'rank {v}' }, dir: 'asc' }] }],
  } as never);
  const sizes = fetch.log.map((c) => countTasks(c.body));
  assert.ok(
    Math.max(...sizes) <= BATCH,
    `RED-HL-7a (spec/behavior.md:1874-1876 "the same machinery mutate already uses"; spec/behavior.md:166-170 "20 rows per batch"): an {llm} sort key must be batched at most 20 rows per request, but evalSortKey (index.ts:1283) sent the whole table in one context-blowing call — tasks per call = ${sizes.join(',')}`,
  );
});

test('RED-HL-7b: {llm} group aggregates over 45 groups are packed 20 per batch, like mutate', async () => {
  const fetch = echoBatchFetch();
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(bigCsv());
  await r.setSpec({
    columns: [{ id: 'v' }, { id: 'summary' }],
    transformations: [{ kind: 'group', by: ['v'], agg: { summary: { llm: 'sum {*}' } } }],
  } as never);
  const sizes = fetch.log.map((c) => countTasks(c.body));
  assert.ok(
    Math.max(...sizes) <= BATCH,
    `RED-HL-7b (spec/behavior.md:166-170 "20 rows per batch", spec/code-contract.md:335-336): {llm} group aggregates must be batched at most 20 prompts per request, but applyGroup (index.ts:1349-1353) pushed one prompt per group into a single call — tasks per call = ${sizes.join(',')}`,
  );
});

// ── RED-HL-8: TAMEDTABLE_RPM=0 must not hang every request forever ──────────

// The RPM seed is read at module load (index.ts:287), so the misconfiguration
// must live in its own process: spawn a child with TAMEDTABLE_RPM=0 that races
// one request against a 2 s timer and always exits.
const HL8_CHILD_SRC = [
  "import { writeFileSync } from 'node:fs';",
  "import { join } from 'node:path';",
  'const { createHeadlessRunner } = await import(process.env.RED_HL8_HEADLESS);',
  'const step = JSON.stringify({ kind: "filter", pred: { js: "true" } });',
  'const fake = async () => new Response(JSON.stringify({',
  '  id: "m1", type: "message", role: "assistant", model: "claude-sonnet-4-6",',
  '  content: [{ type: "tool_use", id: "tu1", name: "apply_spec_patch",',
  '    input: { operations: [{ op: "add", path: "/transformations/-", value: step }] } }],',
  '  stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },',
  '}), { status: 200, headers: { "content-type": "application/json" } });',
  'const csv = join(process.env.RED_HL8_DIR, "hl8.csv");',
  'writeFileSync(csv, "a\\n1\\n");',
  'const r = createHeadlessRunner({ model: "claude-sonnet-4-6", apiKey: "x", fetch: fake, maxRetries: 0 });',
  'await r.loadInput(csv);',
  'const outcome = await Promise.race([',
  '  r.request("keep all").then(() => "SETTLED", () => "SETTLED"),',
  '  new Promise((res) => setTimeout(() => res("HUNG"), 2000)),',
  ']);',
  'console.log("OUTCOME=" + outcome);',
  'process.exit(0);',
].join('\n');

test(
  'RED-HL-8: TAMEDTABLE_RPM=0 must make requests proceed or fail loudly, never hang forever',
  async () => {
    const child = join(DIR, 'hl8-child.ts');
    writeFileSync(child, HL8_CHILD_SRC);
    const proc = Bun.spawn({
      cmd: [process.execPath, child],
      env: {
        ...process.env,
        TAMEDTABLE_RPM: '0',
        RED_HL8_DIR: DIR,
        RED_HL8_HEADLESS: join(import.meta.dir, 'index.ts'),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    // The child always exits by itself within ~3 s; this guard only protects
    // the suite from a broken child.
    const exited = await Promise.race([
      proc.exited.then(() => true),
      new Promise<boolean>((res) => setTimeout(() => res(false), 15_000)),
    ]);
    if (!exited) proc.kill();
    const out = await new Response(proc.stdout).text();
    assert.ok(
      out.includes('OUTCOME=SETTLED'),
      `RED-HL-8 (spec/code-contract.md:334): TAMEDTABLE_RPM is a requests-per-minute cap (default 40) — a 0/invalid value must fall back or error, but the limiter seed accepts it (index.ts:287, 433-454) and every request hangs forever in a 1 ms busy-spin; child reported: ${out.trim() || '(no output)'}`,
    );
  },
  30_000,
);

// ── RED-HL-9: duplicate-step turn must still get provenance stamps ──────────

test('RED-HL-9: a turn appending a duplicate of an existing identical step still stamps the request text as query', async () => {
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
    `RED-HL-9 (spec/code-contract.md:73-80): "The request's text … lands verbatim as \`query\` on the first such transformation" the turn added — but stampQueries' Set-based diff (index.ts:527-541) is blind to multiplicity, so the appended duplicate got no stamps and the request text is stored nowhere; stamps = ${JSON.stringify(steps.map((t) => ({ query: t.query, name: t.name })))}`,
  );
});
