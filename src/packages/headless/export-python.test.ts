// #PyExport #LowEffort — the Python export's two time-sensitive properties,
// both offline through an injected fetch:
//
//   • it STREAMS. The script arrives in pieces and `onProgress` sees each one,
//     so a host can show the script being written instead of a blank wait. The
//     fake below hands out SSE frames one at a time and only releases the next
//     when the test says so — a single-shot response would make every
//     assertion here fire at once, which is exactly the regression to catch.
//   • it asks for the LEAST DELIBERATION the provider sells. Reasoning tokens
//     dominated the wall-clock time (measured 2-3x the script itself), so each
//     provider's request must carry its own low-effort knob.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from './index.ts';

const DIR = mkdtempSync(join(tmpdir(), 'export-python-'));
const CSV = join(DIR, 'in.csv');
writeFileSync(CSV, 'Name,City\nBeta,Rome\nAlpha,Oslo\n');

/** One Gemini SSE frame carrying a text delta. */
function geminiFrame(text: string): string {
  return `data: ${JSON.stringify({
    candidates: [{ content: { parts: [{ text }], role: 'model' }, index: 0 }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
  })}\n\n`;
}

/** A fetch whose response body releases one frame per `next()` call, so the
 *  test controls exactly how far the stream has got. Records request bodies. */
function streamingFetch(chunks: string[], frame: (t: string) => string = geminiFrame) {
  const bodies: string[] = [];
  let release!: () => void;
  let gate = new Promise<void>((r) => { release = r; });
  const fetchImpl = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    bodies.push(String(init?.body ?? ''));
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        for (const c of chunks) {
          await gate;
          gate = new Promise<void>((r) => { release = r; });
          controller.enqueue(enc.encode(frame(c)));
        }
        await gate;
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  // Releasing has to yield: the body loop only reassigns `release` after its
  // await resumes, so two synchronous releases would open the same gate twice.
  const next = async (): Promise<void> => {
    release();
    await new Promise((r) => setTimeout(r, 1));
  };
  /** Release every remaining frame and the close. */
  const finish = async (): Promise<void> => {
    for (let i = 0; i <= chunks.length; i++) await next();
  };
  return { fetchImpl, bodies, next, finish };
}

async function loadedRunner(fetchImpl: typeof fetch, model = 'gemini-3.6-flash'): Promise<ReturnType<typeof createHeadlessRunner>> {
  const runner = createHeadlessRunner({ model, apiKey: 'test-key', fetch: fetchImpl, maxRetries: 0 });
  await runner.loadInput(CSV);
  return runner;
}

test('the script streams: onProgress sees it grow, piece by piece', async () => {
  const { fetchImpl, next } = streamingFetch(['import csv\n', 'import sys\n', 'print(1)\n']);
  const runner = await loadedRunner(fetchImpl as unknown as typeof fetch);

  const seen: string[] = [];
  const done = runner.exportPython({ onProgress: (soFar) => seen.push(soFar) });

  // Nothing has been released yet, so nothing can have been reported.
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(seen, [], 'reported progress before the model sent anything');

  await next();
  await waitFor(() => seen.length === 1);
  assert.equal(seen[0], 'import csv');

  await next();
  await waitFor(() => seen.length === 2);
  assert.equal(seen[1], 'import csv\nimport sys', 'each update carries the script so far, not just the delta');

  await next();
  await waitFor(() => seen.length === 3);
  await next(); // close
  assert.equal(await done, 'import csv\nimport sys\nprint(1)\n');
});

test('a fenced script is unfenced in the progress updates too, not just at the end', async () => {
  const { fetchImpl, finish } = streamingFetch(['```python\n', 'print(1)\n', '```\n']);
  const runner = await loadedRunner(fetchImpl as unknown as typeof fetch);
  const seen: string[] = [];
  const done = runner.exportPython({ onProgress: (soFar) => seen.push(soFar) });
  await finish();
  assert.equal(await done, 'print(1)\n');
  assert.ok(
    seen.every((s) => !s.includes('```')),
    `a fence reached the screen: ${JSON.stringify(seen)}`,
  );
});

test('exportPython works with no onProgress — the CLI passes none', async () => {
  const { fetchImpl, finish } = streamingFetch(['print(1)\n']);
  const runner = await loadedRunner(fetchImpl as unknown as typeof fetch);
  const done = runner.exportPython();
  await finish();
  assert.equal(await done, 'print(1)\n');
});

test('an empty stream is an error, not an empty file', async () => {
  const { fetchImpl, finish } = streamingFetch([]);
  const runner = await loadedRunner(fetchImpl as unknown as typeof fetch);
  const done = runner.exportPython();
  // Attach the expectation before releasing, or the rejection lands with no
  // handler and bun reports it as an uncaught error instead of a pass.
  const rejects = assert.rejects(done, /returned no script/);
  await finish();
  await rejects;
});

// ── #LowEffort — one table, one merge, three providers ──────────────────────

test('the Google request carries a thinking budget both Gemini generations accept', async () => {
  const { fetchImpl, bodies, finish } = streamingFetch(['print(1)\n']);
  const runner = await loadedRunner(fetchImpl as unknown as typeof fetch, 'gemini-3.6-flash');
  const done = runner.exportPython();
  await finish();
  await done;
  const body = JSON.parse(bodies[0]!) as { generationConfig?: { thinkingConfig?: { thinkingBudget?: number } } };
  assert.equal(body.generationConfig?.thinkingConfig?.thinkingBudget, 512);
});

test('the OpenAI request carries reasoning_effort: low', async () => {
  const frame = (t: string): string =>
    `data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: t } }] })}\n\n`;
  const { fetchImpl, bodies, finish } = streamingFetch(['print(1)\n'], frame);
  const runner = await loadedRunner(fetchImpl as unknown as typeof fetch, 'gpt-5.5');
  const done = runner.exportPython();
  await finish();
  await done;
  const body = JSON.parse(bodies[0]!) as { reasoning_effort?: string };
  assert.equal(body.reasoning_effort, 'low');
});

// Anthropic never thinks unless asked, and the SDK drops a `disabled` thinking
// block from the body precisely because it is the default — so what the wire
// must show is NO thinking block, with the prompt-cache control still in place.
test('the Anthropic request asks for no thinking and keeps its cache control', async () => {
  const frame = (t: string): string =>
    `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })}\n\n`;
  const { fetchImpl, bodies, finish } = streamingFetch(['print(1)\n'], (t) =>
    `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude', content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 1 } } })}\n\n` +
    `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n` +
    frame(t) +
    `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n` +
    `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
  );
  const runner = await loadedRunner(fetchImpl as unknown as typeof fetch, 'claude-sonnet-4-6');
  const done = runner.exportPython();
  await finish();
  await done;
  const body = JSON.parse(bodies[0]!) as { thinking?: unknown; cache_control?: { type?: string } };
  assert.equal(body.thinking, undefined, 'asked for extended thinking on a mechanical translation');
  assert.equal(
    body.cache_control?.type,
    'ephemeral',
    'the low-effort merge dropped the prompt cache control it must fold in beside',
  );
});

async function waitFor(cond: () => boolean, ms = 2_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition not met in time');
    await new Promise((r) => setTimeout(r, 2));
  }
}
