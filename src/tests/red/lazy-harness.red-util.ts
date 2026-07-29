// Shared offline harness for the RED-LAZY bug inventory (Gherkin steps in
// red-lazy.steps.ts, unit repros in red-lazy.red.test.ts). Builds a
// WebController the way src/tests/web.hooks.ts does — fake FilePort, injected
// fetch — but with a scriptable fake Gemini backend instead of a cassette:
// patch turns answer from a queue of apply_spec_patch operations, cell calls
// answer per prompt with real usageMetadata. Fully offline, no key, no timers.
//
// Not a step file and not a test file: cucumber's `tests/**/!(*.test).ts`
// import glob loads it harmlessly (it defines no steps), and `bun test`
// never picks it up (no `.test.` in the name).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createWebController, type FilePort } from '@tamedtable/web';

export const SPEC_TC = join(import.meta.dirname, '..', '..', '..', 'spec', 'test-cases');

export type RedLazyApp = ReturnType<typeof createWebController>;

export interface FakeBackend {
  /** Each entry answers one patch turn as `apply_spec_patch` operations. */
  patchQueue: Array<unknown[]>;
  cellAnswer: (prompt: string) => string;
  cellPrompts: string[];
  primaryCalls: number;
  cellCalls: number;
  /** Tokens reported per single prompt (batches multiply). */
  cellUsage: { in: number; out: number };
  /** When set, any cell call whose prompt matches fails with a 401. */
  failCells?: (prompt: string) => boolean;
}

export function makeBackend(cellAnswer: (p: string) => string): FakeBackend {
  return { patchQueue: [], cellAnswer, cellPrompts: [], primaryCalls: 0, cellCalls: 0, cellUsage: { in: 50, out: 5 } };
}

/** Lift the requests-per-minute cap so unbatched cell fan-outs never sleep on
 *  real timers. Called from red steps/tests only — never at module scope, so
 *  importing this file under a green profile changes nothing. */
export function liftRpm(): void {
  process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);
}

/** One macrotask hop — lets settled promise chains flush without real time. */
export function tick(): Promise<void> {
  return new Promise((r) => setImmediate(r));
}

/** Wait (bounded, timer-free) for the run-all/estimate dialog to show. */
export async function untilRunAllDialog(app: RedLazyApp, maxTicks = 500): Promise<boolean> {
  for (let i = 0; i < maxTicks && !app.runAllDialog; i++) await tick();
  return app.runAllDialog !== null;
}

function geminiBody(parts: unknown[], usage: { in: number; out: number }): string {
  return JSON.stringify({
    candidates: [{ content: { parts, role: 'model' }, finishReason: 'STOP', index: 0 }],
    usageMetadata: {
      promptTokenCount: usage.in,
      candidatesTokenCount: usage.out,
      totalTokenCount: usage.in + usage.out,
    },
    modelVersion: 'fake',
  });
}

export function makeFetch(backend: FakeBackend) {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const raw = init?.body ? String(init.body) : '';
    const body = raw ? JSON.parse(raw) : {};
    const text: string = (body.contents ?? [])
      .flatMap((c: { parts?: Array<{ text?: string }> }) => c.parts ?? [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('');
    const headers = { 'content-type': 'application/json; charset=UTF-8' };

    // A patch turn declares tools; a cell call never does. (The same model id
    // can serve both roles, so discriminate on the request shape, not the URL.)
    const isPatchTurn = Boolean(body.tools);
    if (isPatchTurn) {
      backend.primaryCalls++;
      const ops = backend.patchQueue.shift();
      if (!ops) throw new Error('red-lazy fake backend: patch queue empty');
      return new Response(
        geminiBody(
          [{ functionCall: { name: 'apply_spec_patch', args: { operations: ops }, id: `c${backend.primaryCalls}` } }],
          { in: 500, out: 50 },
        ),
        { status: 200, headers },
      );
    }

    // Cell call — single prompt or a numbered batch.
    backend.cellCalls++;
    const isBatch = text.startsWith('[1]\n');
    const prompts = isBatch
      ? text.split('\n\n---\n\n').map((s) => s.replace(/^\[\d+\]\n/, ''))
      : [text];
    if (backend.failCells && prompts.some((p) => backend.failCells!(p))) {
      // 401 — not retried by the AI SDK, so failures land fast (same trick as
      // the suite's mockLlmFetch steps).
      return new Response(JSON.stringify({ error: { code: 401, message: 'boom', status: 'UNAUTHENTICATED' } }), { status: 401, headers });
    }
    backend.cellPrompts.push(...prompts);
    const answers = prompts.map((p) => backend.cellAnswer(p));
    const usage = { in: backend.cellUsage.in * prompts.length, out: backend.cellUsage.out * prompts.length };
    const bodyText = isBatch ? JSON.stringify(answers) : answers[0]!;
    return new Response(geminiBody([{ text: bodyText }], usage), { status: 200, headers });
  };
}

export function makeApp(backend: FakeBackend, config: Record<string, unknown> = {}): RedLazyApp {
  const filePort = {
    hasFileSystemAccess: true,
    pickOpen: async () => null,
    pickSave: async (name: string) => ({ status: 'saved' as const, name }),
  };
  return createWebController({
    file: filePort as unknown as FilePort,
    fetch: makeFetch(backend),
    env: {},
    config: { geminiKey: 'fake-key', ...config } as never,
  });
}

/** Load a spec/test-cases fixture, resolving the large-file dialog. */
export async function loadFixture(
  app: RedLazyApp,
  name: string,
  order: 'original' | 'shuffled' = 'original',
): Promise<void> {
  const bytes = new Uint8Array(await readFile(join(SPEC_TC, name)));
  await app.loadFromBytes(name, bytes);
  if (app.largeFileDialog) {
    if (order === 'shuffled') await app.loadShuffled();
    else await app.loadOriginalOrder();
  }
}

/** ops helper: add a column + an {llm} mutate filling it. */
export function addAiColumnOps(column: string, template: string): unknown[] {
  return [
    { op: 'add', path: '/columns/-', value: { id: column } },
    { op: 'add', path: '/transformations/-', value: { kind: 'mutate', columns: column, value: { llm: template } } },
  ];
}
