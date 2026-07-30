// How a request *settles* — the three ways it can end that the RED-HL-2/3/8
// bug inventory found broken (now fixed and pinned green):
//   • cancelled: every abort surfaces as the one `Runner: cancelled` message
//     hosts string-match, whichever await it landed in (#CancelOp);
//   • failed: `onDebug` still fires, so a failure inside the model call itself
//     doesn't hide the tokens it spent (#DebugOut);
//   • misconfigured: a `TAMEDTABLE_RPM` the limiter can never satisfy falls
//     back instead of wedging the request forever (#ConfigEnv).
// Every model turn is offline: a fake Anthropic Messages `fetch` is injected
// through HeadlessRunnerOptions.fetch.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from './index.ts';

const DIR = mkdtempSync(join(tmpdir(), 'request-settle-'));

// ── Fake Anthropic Messages fetch ───────────────────────────────────────────
type Reply =
  | { tool: unknown[] } // tool_use apply_spec_patch with ops
  | { plain: string } // text-only reply
  | { http: number } // HTTP error
  | { stall: true }; // never resolves; rejects with AbortError on abort

let msgN = 0;
function makeFetch(script: Reply[]) {
  const log: Array<{ url: string; body: string }> = [];
  const f = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    log.push({ url: String(input instanceof Request ? input.url : input), body: String(init?.body ?? '') });
    const r = script.shift();
    if (!r) throw new Error('request-settle fake fetch: script exhausted');
    if ('stall' in r) {
      // The shape a real provider call takes when the host aborts mid-flight:
      // the fetch itself rejects with the DOM AbortError.
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
        JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'fake: bad request' } }),
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

function csvFile(name: string, content: string): string {
  const path = join(DIR, name);
  writeFileSync(path, content);
  return path;
}

// ── Cancellation reaches the host as `Runner: cancelled` ────────────────────
// The patch-turn model call is most of a request's wall-clock, so it is where a
// Stop usually lands; `setSpec`'s replay is the flow-open equivalent. Both used
// to leak the SDK's raw AbortError, which web's describeError then classified
// as reportable — offering a bug report to the user who pressed Stop.

test('aborting request() while the patch-turn model call is in flight throws Runner: cancelled', async () => {
  const fetch = makeFetch([{ stall: true }]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  await r.loadInput(csvFile('cancel-request.csv', 'w\naa\nbb\n'));
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
    `spec/behavior.md § Headless #CancelOp step 4 "Signal cancelled"; spec/code-contract.md § Headless: aborting mid-model-call must throw 'Runner: cancelled' (CLI session.ts and web controller-messages.ts string-match it), got ${err?.name}: ${err?.message}`,
  );
});

test('aborting setSpec() while an {llm} cell call is in flight throws Runner: cancelled', async () => {
  const fetch = makeFetch([{ stall: true }]);
  const r = createHeadlessRunner({ ...runnerOpts, fetch });
  const csv = csvFile('cancel-setspec.csv', 'w\naa\nbb\n');
  await r.loadInput(csv);
  const specBefore = structuredClone(r.currentSpec());
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
    `spec/code-contract.md § Headless: "aborting \`signal\` throws \`Runner: cancelled\` with the previous spec and rows untouched", got ${err?.name}: ${err?.message}`,
  );
  assert.deepEqual(r.currentSpec(), specBefore, 'a cancelled setSpec must leave the previous spec in place');
});

// ── onDebug fires on failure too, the model call included ───────────────────

test('onDebug fires once per request on failure too — including failures inside the model call itself', async () => {
  // Case 1: provider returns HTTP 400 on the patch turn.
  let fires400 = 0;
  {
    const fetch = makeFetch([{ http: 400 }]);
    const r = createHeadlessRunner({ ...runnerOpts, fetch, onDebug: () => fires400++ });
    await r.loadInput(csvFile('debug-http.csv', 'a\n1\n'));
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
    await r.loadInput(csvFile('debug-text.csv', 'a\n1\n'));
    try {
      await r.request('do a thing');
    } catch {
      /* expected: request fails */
    }
  }
  assert.equal(
    fires400,
    1,
    `spec/code-contract.md § Headless: "onDebug fires once per request — on success and on failure — just before the call settles"; the request failed with HTTP 400 in the model call and onDebug fired ${fires400} times`,
  );
  assert.equal(
    firesText,
    1,
    `spec/code-contract.md § Headless: the request failed with a no-tool-call reply and onDebug fired ${firesText} times — the failed call's token spend must not be invisible to CLI and web`,
  );
});

// ── A misconfigured rate limit must not hang the request ────────────────────

// The RPM seed is read at module load, so the misconfiguration has to live in
// its own process: spawn a child with TAMEDTABLE_RPM=0 that races one request
// against a 2 s timer and always exits.
const RPM_CHILD_SRC = [
  "import { writeFileSync } from 'node:fs';",
  "import { join } from 'node:path';",
  'const { createHeadlessRunner } = await import(process.env.RPM_HEADLESS);',
  'const step = JSON.stringify({ kind: "filter", pred: { js: "true" } });',
  'const fake = async () => new Response(JSON.stringify({',
  '  id: "m1", type: "message", role: "assistant", model: "claude-sonnet-4-6",',
  '  content: [{ type: "tool_use", id: "tu1", name: "apply_spec_patch",',
  '    input: { operations: [{ op: "add", path: "/transformations/-", value: step }] } }],',
  '  stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },',
  '}), { status: 200, headers: { "content-type": "application/json" } });',
  'const csv = join(process.env.RPM_DIR, "rpm.csv");',
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
  'TAMEDTABLE_RPM=0 makes requests proceed rather than hang forever',
  async () => {
    const child = join(DIR, 'rpm-child.ts');
    writeFileSync(child, RPM_CHILD_SRC);
    const proc = Bun.spawn({
      cmd: [process.execPath, child],
      env: {
        ...process.env,
        TAMEDTABLE_RPM: '0',
        RPM_DIR: DIR,
        RPM_HEADLESS: join(import.meta.dir, 'index.ts'),
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
      `spec/code-contract.md § ConfigEnv: TAMEDTABLE_RPM is a requests-per-minute cap (default 40) — a 0/invalid value must fall back, never leave every request spinning in the limiter; child reported: ${out.trim() || '(no output)'}`,
    );
  },
  30_000,
);
