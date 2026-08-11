import { generateText, streamText, tool, stepCountIs, jsonSchema } from 'ai';
import type { JSONValue } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { providerFor, acceptsTemperature, type EngineProvider } from '@tamedtable/model-config';
import jsonpatch, { type Operation } from 'fast-json-patch';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadCsv,
  loadFile,
  loadJsonl,
  setCell,
  validateTablePlan,
  writeRows,
  type Expr,
  type Row,
  type TablePlan,
  type Transformation,
} from '@tamedtable/core';

export { SpecJournal, type JournalEntry, type TimelineStep } from './journal.ts';
export { renderPrompt, validateTemplate, parseLlmParts, isCancelled, validateColumns, compareSortKeys } from './engine.ts';
import {
  CANCELLED,
  abortIf,
  asCancelled,
  isCancelled,
  compileJs,
  syncColumnsToRows,
  applyFilter,
  applySelect,
  applyMutateJs,
  applyValidateJs,
  validateColumns,
  applyGroupJs,
  aggKey,
  compileAgg,
  compareSortKeys,
  groupOutputNames,
  unpivotOutputNames,
  buildGroups,
  padParts,
  parseLlmParts,
  applySplit,
  applyPivot,
  applyUnpivot,
  applyJoin,
  renderPrompt,
  validateTemplate,
} from './engine.ts';
import { SqlSession } from './sql.ts';

export type ChunkUpdate = {
  transformationIndex: number;
  rowIndex: number;
  column: string;
  before: unknown;
  after: unknown;
};

// #OpenFlow
/** One replayed transformation starting: its 0-based index, the run's total,
 *  its kind, its describeStep label, the row count entering it, and its
 *  transformationExpressions — the exact JS/SQL/prompt bodies behind the
 *  label, so a progress log can show what the step runs, not just its name.
 *  Steps a replay skips (the unchanged-prefix reuse) are not reported. */
export type StepUpdate = {
  index: number;
  total: number;
  kind: string;
  label: string;
  rows: number;
  expressions: Array<{ label: string; body: string }>;
};

// ── describeStep — human-friendly one-liner per transformation ───────────────

/** The expression-shape marker for a step label: which engine evaluates it —
 *  and, for `llm`, that the step calls the per-row cell model. */
function exprMarker(e: Expr | string | RegExp | undefined): 'js' | 'sql' | 'AI' | undefined {
  if (!e || typeof e === 'string' || e instanceof RegExp) return undefined;
  if ('llm' in e) return 'AI';
  if ('sql' in e) return 'sql';
  return 'js';
}

/** First few names, `, …` when more — keeps labels one line. */
function nameList(names: string[], cap = 4): string {
  return names.slice(0, cap).join(', ') + (names.length > cap ? ', …' : '');
}

// #OpenFlow
/** A deterministic, human-friendly one-liner for a transformation, derived
 *  entirely from its own fields — no model call, nothing stored. Shown by the
 *  run-progress status line and log so each step names its target and
 *  flags per-row model work with an `(AI)` marker: `mutate EventGroup (AI)`,
 *  `filter (js)`, `group by EventGroup → total_players, sections, …`,
 *  `sort by Name desc`. */
export function describeStep(t: Transformation): string {
  switch (t.kind) {
    case 'filter':
      return `filter (${exprMarker(t.pred)})`;
    case 'mutate':
      return `mutate ${nameList(Array.isArray(t.columns) ? t.columns : [t.columns])} (${exprMarker(t.value)})`;
    case 'select':
      return `select ${nameList(t.columns)}`;
    case 'sort':
      return `sort by ${t.by
        .map((b) => `${typeof b.key === 'string' ? b.key : `(${exprMarker(b.key)})`} ${b.dir}`)
        .join(', ')}`;
    case 'group': {
      const by = t.by.map((b) => (typeof b === 'string' ? b : `(${exprMarker(b)})`));
      const ai = Object.values(t.agg).some((e) => exprMarker(e) === 'AI') ? ' (AI)' : '';
      return `group by ${nameList(by)} → ${nameList(Object.keys(t.agg))}${ai}`;
    }
    case 'join':
      return t.with === null ? 'join (file pending)' : `join ${t.with}`;
    case 'split':
      return `split ${t.from} → ${nameList(t.into)}`;
    case 'validate':
      return `validate (${exprMarker(t.pred)})`;
    case 'pivot':
      return `pivot ${t.values} by ${t.on}`;
    case 'unpivot':
      return `unpivot ${nameList(t.measures)}`;
  }
}

export interface RequestDebugTurn {
  ops: unknown[];
  outcome: string;
  sentBack?: string;
}

export interface CellSample {
  column: string;
  samples: Array<{ in: unknown; out: unknown }>;
}

export interface RequestDebugInfo {
  userRequest: string;
  turns: RequestDebugTurn[];
  expressions: Array<{ label: string; body: string }>;
  /** describeStep label per appended transformation (success path) — the web
   *  chat's one-line-per-step reply. */
  steps: string[];
  cellSamples: CellSample[];
  modelCalls: Array<{ model: string; calls: number }>;
  inputTokens: number;
  outputTokens: number;
  elapsedMs: number;
}

export type PlanEdit =
  | { kind: 'add-column'; id: string }
  | { kind: 'remove-column'; id: string }
  | { kind: 'reorder-columns'; from: string[]; to: string[] }
  | { kind: 'add-transformation'; transformation: Transformation }
  | { kind: 'remove-transformation'; transformation: Transformation };

// #LazyExec
// Cell sentinels for the web shell's page-first scheduling
// (spec/code-contract.md § Lazy AI execution). A lazy replay leaves the cells
// it skipped holding a pending sentinel and the cells whose call failed
// holding a failed sentinel — row state is then derivable from the data
// itself, so it survives deterministic reshaping, undo/redo, and engine
// rebuilds with no index bookkeeping. Value-shaped (not identity-based) so
// structuredClone copies still test true. The batch path never sees them:
// without `cellFilter`/`onCellError` no sentinel is ever written.
export function pendingCell(): unknown {
  return { __ttPending: true };
}
export function isPendingCell(v: unknown): boolean {
  return typeof v === 'object' && v !== null && (v as { __ttPending?: unknown }).__ttPending === true;
}
export function failedCell(error: string): unknown {
  return { __ttFailed: error };
}
export function isFailedCell(v: unknown): v is { __ttFailed: string } {
  return typeof v === 'object' && v !== null && typeof (v as { __ttFailed?: unknown }).__ttFailed === 'string';
}

/** Thrown by request() when the host's confirmSpec hook declines the patch —
 *  the dependency rule's "leave the step out entirely" outcome. */
export const DECLINED = 'Runner: declined';
export function isDeclined(e: unknown): boolean {
  return (e as Error)?.message === DECLINED;
}

// #LazyExec
// Row-origin tags — the index-mapping layer between a host's derived-row
// indices and the engine's step-input indices. A replay tags its working
// row copies with their source position under a symbol key: object spread
// (the way every row-copying step clones rows) carries it along, while
// Object.keys / JSON / DuckDB never see it. A step's input row therefore
// knows which source row it came from even after sorts, filters, and joins
// reshaped the table, and a cellFilter can target derived rows by comparing
// origins instead of trusting positions. The tags never leave the replay:
// they are stripped off the final rows into the runner's parallel
// `derivedOrigins` array (exposed as `rowOrigins()`), so committed rows
// stay plain data. Steps that build rows from scratch (select, group,
// pivot) drop the tag — callers fall back to positional identity there.
const ROW_ORIGIN = Symbol('ttRowOrigin');

/** The source-row origin a replay's in-flight row carries, or undefined for
 *  rows created by a reshaping step. Meaningful only inside a replay's
 *  callbacks (cellFilter); committed rows are stripped — read the runner's
 *  `rowOrigins()` for those. */
export function rowOrigin(row: Row | undefined): number | undefined {
  return row ? ((row as Record<symbol, unknown>)[ROW_ORIGIN] as number | undefined) : undefined;
}

function tagOrigin(row: Row, origin: number | undefined): Row {
  if (origin !== undefined) (row as Record<symbol, unknown>)[ROW_ORIGIN] = origin;
  return row;
}

/** Remove the tags from a replay's final rows, returning the origins as a
 *  parallel array. */
function stripOrigins(rows: Row[]): Array<number | undefined> {
  return rows.map((r) => {
    const origin = (r as Record<symbol, unknown>)[ROW_ORIGIN] as number | undefined;
    if (origin !== undefined) delete (r as Record<symbol, unknown>)[ROW_ORIGIN];
    return origin;
  });
}

/** Lazy-evaluation hooks a replay accepts (web shell only — the CLI and the
 *  batch path never pass them, keeping their output byte-identical). */
export interface LazyEvalOpts {
  /** Per-cell gate for {llm} mutate/split steps: return false to leave the
   *  cell pending (no model call, no cache entry). `rowIndex` is the row's
   *  index in the step's input rows; `row` is that input row itself, whose
   *  `rowOrigin` lets a host target derived rows across reordering steps. */
  cellFilter?: (transformationIndex: number, rowIndex: number, row: Row) => boolean;
  /** Per-cell failure capture: when set, a cell call that still fails after
   *  retries writes a failed-cell sentinel and reports here instead of
   *  failing the whole step. Absent → the step throws (fail-fast).
   *  `rowIndex` is step-input; `origin` is the row's source origin when the
   *  row carries one (see rowOrigin), so hosts can locate the derived row. */
  onCellError?: (u: { transformationIndex: number; rowIndex: number; column: string; error: string; origin?: number }) => void;
}

export interface HeadlessRunnerOptions {
  /** Who serves the models. A model id cannot say who hosts it —
   *  `openai/gpt-oss-120b` is Groq's here, and OpenRouter serves the same
   *  weights under the same name — so the runner is told rather than left to
   *  guess. Callers holding only an id (the benchmark sweeping from a command
   *  line, a CLI with just TAMEDTABLE_MODEL) omit it and get
   *  `providerFor(model)`. */
  provider?: EngineProvider;
  model?: string;
  cellModel?: string;
  apiKey?: string;
  baseURL?: string;
  chunkSize?: number;
  batchSize?: number;
  recoveryBudget?: number;
  maxRetries?: number;
  rpm?: number;
  onChunk?: (update: ChunkUpdate) => void;
  onPlanEdits?: (items: PlanEdit[]) => void;
  onDebug?: (info: RequestDebugInfo) => void;
  /** Fires once per model call with its token usage — the web shell's
   *  estimate math accumulates these (#LazyExec). `role` says which slot made
   *  the call ('primary' = patch turn, 'cell' = cell work), so the host can
   *  attribute usage even when one model id serves both roles. */
  onUsage?: (u: { model: string; inputTokens: number; outputTokens: number; role: 'primary' | 'cell' }) => void;
  signal?: AbortSignal;
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

/** Spoken audio riding along on the patch turn (web voice input). When set,
 *  every patch-turn call in the request sends the audio as a file part next
 *  to the prompt text; `text` carries the instructions and table context. */
export type RequestAudio = { data: Uint8Array; mediaType: string };

// #PyExport
export interface ExportPythonOpts {
  /** The script so far, already unfenced, on every chunk that changes it —
   *  the hook a host shows the script being written through. */
  onProgress?: (scriptSoFar: string) => void;
  signal?: AbortSignal;
}

export interface HeadlessRunner {
  loadInput(path: string): Promise<void>;
  /** Load an already-parsed table directly — the path-free sibling of
   *  loadInput. The web app parses a picked/fetched file through the file-io
   *  codec registry and loads the rows here, so the browser never needs a
   *  filesystem. `spec` is the fresh-load TablePlan (table name + columns,
   *  no transformations). */
  loadParsed(rows: Row[], spec: TablePlan): Promise<void>;
  /** Stage a lookup table by name so a `join` whose `with` matches resolves
   *  against these rows instead of reading the file by path. Lets joins run in
   *  the browser (no filesystem); an unregistered name falls back to reading
   *  the file by path as before. */
  registerLookup(name: string, rows: Row[]): void;
  request(text: string, options?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void; audio?: RequestAudio; onTranscript?: (text: string) => void; confirmSpec?: (next: TablePlan, prev: TablePlan) => Promise<boolean>; } & LazyEvalOpts): Promise<void>;
  /** Replace the spec, replaying its transformations onto the loaded source
   *  rows. Accepts the same streaming/abort options a request carries plus
   *  `onStep`, which fires as each transformation starts — so a replayed
   *  flow streams, reports progress, and can be cancelled (the Open & run
   *  flow path); aborting throws `Runner: cancelled` with the previous spec
   *  and rows untouched. `fresh` skips the derived-prefix shortcut and
   *  replays from the source — a lazy re-evaluation pass needs unchanged
   *  steps to run again so a widened cellFilter can fill their pending
   *  cells (cached cells replay without a call). */ // #OpenFlow #LazyExec
  setSpec(spec: TablePlan, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void; fresh?: boolean } & LazyEvalOpts): Promise<void>;
  currentRows(): Row[];
  currentSpec(): TablePlan;
  exportAs(path: string): Promise<void>;
  /** One model call: translate the current flow into a standalone
   *  Python script. Returns the script source, and streams it to
   *  `onProgress` on the way (#PyExport). */
  exportPython(opts?: ExportPythonOpts): Promise<string>;
  /** #ProviderSelect — one minimal call on the cell model with retries off,
   *  proving the configured key and provider work. Resolves with the model id
   *  it reached; rejects with the provider's own error. Needs no loaded
   *  table. */
  testConnection(opts?: { signal?: AbortSignal }): Promise<{ model: string }>;
  // #LazyExec — web-shell seams. adoptState swaps in a spec + derived rows
  // with no replay and no model call (provider switch keeps evaluated rows);
  // `origins` carries the adopted rows' source origins (see rowOrigins) so
  // the index-mapping survives the rebuild. The cache accessors carry the
  // per-cell result cache across an engine rebuild so redo/resume stay free.
  adoptState(spec: TablePlan, rows: Row[], origins?: ReadonlyArray<number | undefined>): Promise<void>;
  /** Source-row origin of each derived row (parallel to currentRows), or
   *  undefined where a reshaping step built the row from scratch — the
   *  derived-to-step-input index mapping (#LazyExec). */
  rowOrigins(): ReadonlyArray<number | undefined>;
  cellCacheEntries(): Array<[string, unknown]>;
  seedCellCache(entries: Array<[string, unknown]>): void;
}

// #ConfigEnv
const DEFAULT_MODEL = process.env.TAMEDTABLE_MODEL ?? 'gemini-3.6-flash';
const DEFAULT_CELL_MODEL = process.env.TAMEDTABLE_CELL_MODEL ?? 'gemini-3.1-flash-lite';

// Per-provider fallbacks for per-row cell calls when the configured cell
// model belongs to a different provider than the main model. Cell calls are
// text-only and must share the main model's provider, so a cross-provider cell
// model is coerced to that provider's text default rather than used blindly.
const PROVIDER_CELL_FALLBACKS: Record<ReturnType<typeof providerFor>, string> = {
  gemini: DEFAULT_CELL_MODEL,
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-5.4-mini',
  cerebras: 'gpt-oss-120b',
  groq: 'openai/gpt-oss-20b',
  puter: 'gemini-3.1-flash-lite',
  openrouter: 'cohere/north-mini-code:free',
};

/** @internal — exported for unit tests. Pick the model for per-cell LLM
 *  calls: the explicit cell model when it shares the main model's provider,
 *  else that provider's text-capable fallback. */
export function resolveCellModelId(mainId: string, explicitCellModel?: string): string {
  const mainProvider = providerFor(mainId);
  const preferred = explicitCellModel ?? DEFAULT_CELL_MODEL;
  if (providerFor(preferred) === mainProvider) return preferred;
  return PROVIDER_CELL_FALLBACKS[mainProvider];
}
const DEFAULT_MAX_RETRIES = 6;
/** A requests-per-minute cap has to be a positive number. `0`, a negative, or
 *  unparsable text is a misconfiguration, and the limiter can never satisfy it:
 *  every request would spin in the wait loop forever. Fall back to the default
 *  instead (spec/code-contract.md § ConfigEnv). */
function rpmFromEnv(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw !== undefined && raw.trim() !== '' && Number.isFinite(n) && n > 0 ? n : fallback;
}
const DEFAULT_RPM = rpmFromEnv(process.env.TAMEDTABLE_RPM, 40);
// Exported so hosts can derive wave-aligned view settings (the web page size
// is one concurrency wave: batch size × batches in flight).
export const DEFAULT_CHUNK_SIZE = Number(process.env.TAMEDTABLE_CHUNK_SIZE ?? 5);
export const DEFAULT_BATCH_SIZE = Number(process.env.TAMEDTABLE_BATCH_SIZE ?? 20);

// Prompts live in spec/prompt-app-edit.md so SCRIBE can tune them without touching src/.
// File is parsed once at module load; top-level `## ` headers delimit sections.
const PROMPT_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'spec',
  'prompt-app-edit.md'
);

function parsePromptSections(md: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^## (\S+)\s*$/);
    if (m) {
      if (current) sections[current] = buf.join('\n').trim();
      current = m[1]!;
      buf = [];
    } else if (current) {
      buf.push(line);
    }
  }
  if (current) sections[current] = buf.join('\n').trim();
  return sections;
}

// #LlmLayer
function loadPrompts(): {
  SYSTEM_PROMPT: string;
  BATCH_SYSTEM_PROMPT: string;
  CELL_FORMAT_CONSTRAINT: string;
  PYTHON_EXPORT_PROMPT: string;
} {
  const text = readFileSync(PROMPT_FILE, 'utf-8');
  const sections = parsePromptSections(text);
  const required = ['SYSTEM_PROMPT', 'BATCH_SYSTEM_PROMPT', 'CELL_FORMAT_CONSTRAINT', 'PYTHON_EXPORT_PROMPT'] as const;
  for (const name of required) {
    if (!sections[name]) {
      throw new Error(`spec/prompt-app-edit.md: missing "## ${name}" section`);
    }
  }
  return {
    SYSTEM_PROMPT: sections.SYSTEM_PROMPT!,
    BATCH_SYSTEM_PROMPT: sections.BATCH_SYSTEM_PROMPT!,
    CELL_FORMAT_CONSTRAINT: sections.CELL_FORMAT_CONSTRAINT!,
    PYTHON_EXPORT_PROMPT: sections.PYTHON_EXPORT_PROMPT!,
  };
}

const { SYSTEM_PROMPT, BATCH_SYSTEM_PROMPT, PYTHON_EXPORT_PROMPT } = loadPrompts();

/** @internal — exported for unit tests. The JSON-Schema for the `operations`
 *  argument of apply_spec_patch — identical for every provider. `value` is a
 *  string carrying JSON-encoded content, decoded back by decodeOpValues. It
 *  is never left untyped: Gemini's function-calling layer converts an untyped
 *  `value` to a bare `{ type: "object" }` with no shape, and the model then
 *  emits garbage values (e.g. `"value": 3`). */
export function patchOperationsProperty() {
  return {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
        path: { type: 'string' },
        from: { type: 'string' },
        value: {
          type: 'string',
          description:
            'The value used by add/replace/test operations, encoded as a JSON string — e.g. "{\\"kind\\":\\"filter\\",\\"pred\\":{\\"js\\":\\"true\\"}}" for an object, or "\\"text\\"" for a string.',
        },
      },
      required: ['op', 'path'],
      additionalProperties: false,
    },
  };
}

// The `transcript` argument is used only when the request carries spoken audio
// (web voice input): it returns a verbatim transcript of the clip in the same
// call, surfaced to the UI via onTranscript.
function patchInputSchema(withTranscript: boolean) {
  return jsonSchema<{ operations: unknown[]; transcript?: string }>({
    type: 'object',
    properties: {
      ...(withTranscript
        ? {
            transcript: {
              type: 'string',
              description: "Verbatim transcript of the user's spoken request in the attached audio clip.",
            },
          }
        : {}),
      operations: patchOperationsProperty(),
    },
    required: ['operations'],
    additionalProperties: false,
  });
}

// JSON's only legal escape sequences: \" \\ \/ \b \f \n \r \t \uXXXX. The model
// sometimes JSON-encodes a value but escapes an apostrophe in a prompt example
// as `\'` (e.g. `'O\'BRIEN'`), which is not one of these — so a strict
// JSON.parse throws and the value would be lost. `repairJsonEscapes` drops the
// stray backslash from any such escape while leaving valid ones (including `\\`)
// intact, so the object can still be recovered. See model-resilience.feature.
const VALID_JSON_ESCAPE = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
function repairJsonEscapes(s: string): string {
  return s.replace(/\\([\s\S])/g, (match, ch) => (VALID_JSON_ESCAPE.has(ch) ? match : ch));
}

/** @internal — exported for unit tests. Decode each op's `value` when it
 *  arrives as a JSON string: the patch schema asks for exactly that encoding.
 *  A near-miss encoding — valid JSON but for a stray invalid escape the model
 *  slipped in — is repaired and retried once before giving up. A string that
 *  still isn't valid JSON (a plain literal like a column name) is left as-is,
 *  so fast-json-patch always receives the real value. */
export function decodeOpValues(ops: unknown[]): unknown[] {
  return ops.map((op) => {
    if (op && typeof op === 'object' && 'value' in op && typeof (op as Record<string, unknown>).value === 'string') {
      const raw = (op as Record<string, unknown>).value as string;
      try {
        return { ...op, value: JSON.parse(raw) };
      } catch {
        try {
          return { ...op, value: JSON.parse(repairJsonEscapes(raw)) };
        } catch { /* leave as-is if it still isn't valid JSON */ }
      }
    }
    return op;
  });
}

// #CancelOp
const ANTHROPIC_EPHEMERAL = { anthropic: { cacheControl: { type: 'ephemeral' as const } } };

// #LowEffort
/** The least deliberation each provider sells, in that provider's own words.
 *  Reasoning tokens are generated one at a time like any other, so on a purely
 *  mechanical job — translating an explicit spec — they are wall-clock time
 *  spent on nothing (measured: 2-3x the script itself, and 19.5s -> 4.8s on
 *  gemini-3.6-flash once capped).
 *
 *  Google's entry is a budget rather than the newer `thinkingLevel` because it
 *  is the only knob BOTH catalogue generations accept: `thinkingLevel` 400s on
 *  gemini-2.5-* ("Thinking level is not supported for this model") and
 *  `thinkingBudget: 0` 400s on gemini-3.x, which cannot stop thinking at all.
 *  512 is a cap, not a quota — 3.6 Flash spent 0 of it on the export prompt.
 *
 *  One table so a new provider is a row, not another branch at the call site.
 *  A provider free to ignore the hint (a free OpenRouter model does) is not an
 *  error: the request stays valid and the call just takes what it takes. */
type ProviderOptions = Record<string, Record<string, JSONValue>>;

const LOW_EFFORT: Record<ReturnType<typeof providerFor>, ProviderOptions> = {
  gemini:     { google:    { thinkingConfig: { thinkingBudget: 512 } } },
  openai:     { openai:    { reasoningEffort: 'low' } },
  openrouter: { openai:    { reasoningEffort: 'low' } },
  cerebras:   { openai:    { reasoningEffort: 'low' } },
  groq:       { openai:    { reasoningEffort: 'low' } },
  puter:      { openai:    { reasoningEffort: 'low' } },
  anthropic:  { anthropic: { thinking: { type: 'disabled' } } },
};

/** `base` with `modelId`'s low-effort options folded in. Merged per provider
 *  key, never replaced: Anthropic's entry has to land beside the prompt-cache
 *  control that is already there. */
function withLowEffort(modelId: string, base: ProviderOptions): ProviderOptions {
  const merged = { ...base };
  for (const [provider, options] of Object.entries(LOW_EFFORT[providerFor(modelId)])) {
    merged[provider] = { ...(merged[provider] ?? {}), ...options };
  }
  return merged;
}

/** A model that wrapped the script in a markdown fence despite being told not
 *  to. Stripped on the way out AND on every progress update, so a fence never
 *  reaches the screen either. Tolerates a half-written closing fence: while the
 *  stream is mid-flight the text can end in a stray backtick run. */
function unfenceScript(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:python)?\s*\n?/, '').replace(/\n?`{1,3}\s*$/, '').trim();
}

/** Retries for the Python export. Lower than DEFAULT_MAX_RETRIES on purpose:
 *  the call is one cheap translation, and six exponential backoffs against a
 *  queued free model is how a slow call becomes a six-minute one. */
const EXPORT_MAX_RETRIES = 2;

// #ConfigEnv
const rateLimiter = (() => {
  const timestamps: number[] = [];
  let limit = DEFAULT_RPM;
  return {
    setLimit(rpm: number) {
      if (rpm > 0 && rpm < limit) limit = rpm;
    },
    async acquire(signal?: AbortSignal): Promise<void> {
      while (true) {
        abortIf(signal);
        const now = Date.now();
        while (timestamps.length && now - timestamps[0]! > 60_000) timestamps.shift();
        if (timestamps.length < limit) {
          timestamps.push(now);
          return;
        }
        const waitMs = 60_000 - (now - timestamps[0]!);
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 1_000)));
      }
    },
  };
})();

// ── Prompt builders for the recovery loop ───────────────────────────────────

// Recovery guidance appended to every retry prompt. Generic: it applies to any
// transformation that can throw at evaluation time, not just SQL date parsing.
// The goal is to break the LLM out of "try another rigid format" loops by
// pointing it at the defensive primitives DuckDB and JS already offer.
const RECOVERY_GUIDANCE = [
  'The previous attempt errored on real data. Read the error, identify which input the runtime could not handle, and emit a patch that no longer throws on that input.',
  'Prefer defensive primitives over a second rigid guess: in DuckDB use `try_cast`/`try_strptime(col, [fmt1, fmt2, …])`/`nullif`/`CASE WHEN` so unhandled rows yield NULL instead of aborting the query; in JS guard with `?.` and `??` and check `typeof`/`Array.isArray` before indexing.',
  'Letting truly unrecoverable rows surface as NULL is fine — the caller can detect or filter them. Only wrap in `COALESCE(expr, <default>)` if the user explicitly asked for a fallback value.',
  'Do not just retry the same shape with a different literal — the next emission must be measurably more permissive than the one that failed.',
].join(' ');

/** @internal — exported for unit tests. The spec as the model sees it: each
 *  transformation's `query`/`name` provenance stripped. The model neither
 *  reads nor edits the metadata, and stripping keeps patch-turn and
 *  Python-export prompts byte-identical to a spec that never carried it — so
 *  recorded cassettes keep replaying. */
export function stripQueryMetadata(spec: TablePlan): TablePlan {
  const transformations = spec.transformations as Transformation[];
  if (!transformations.some((t) => 'query' in t || 'name' in t)) return spec;
  return {
    ...spec,
    transformations: transformations.map(({ query: _query, name: _name, ...t }) => t as Transformation),
  };
}

function buildPrompt(text: string, spec: TablePlan, errPrefix?: string): string {
  // The LLM edits transformations/columns/view-ops — never `table`. A long
  // absolute source path is prompt noise that derails the patch turn, so the
  // model only ever sees the basename. Query provenance is stripped the same
  // way — metadata, not the model's to see or edit.
  spec = stripQueryMetadata(spec);
  const llmSpec = spec.table ? { ...spec, table: basename(spec.table) } : spec;
  const specJson = JSON.stringify(llmSpec, null, 2);
  if (!errPrefix) return `Current spec:\n${specJson}\n\nUser request: ${text}`;
  return `${errPrefix}\n\nCurrent spec:\n${specJson}\n\nOriginal user request: ${text}\n\nEmit a corrected patch.\n\n${RECOVERY_GUIDANCE}`;
}

type PatchAttempt = { kind: 'ok'; spec: TablePlan } | { kind: 'err'; message: string };

/** @internal — exported for unit tests. Apply an LLM-proposed JSON Patch to
 *  the spec and validate the result. `validateOperation` is on so a malformed
 *  op (bad `op`, missing `path`) surfaces as a clear RFC-6902 message the
 *  recovery loop can feed back — not an opaque internal TypeError. */
// #Patch
export function applyAndValidate(currentSpec: TablePlan, ops: unknown[]): PatchAttempt {
  try {
    if (ops.length === 0) {
      return { kind: 'err', message: 'You called apply_spec_patch with an empty operations array. Emit at least one operation that fulfills the user request.' };
    }
    const patched = jsonpatch.applyPatch(structuredClone(currentSpec), ops as Operation[], true, false).newDocument as unknown;
    const validated = validateTablePlan(patched);
    // Compare STRIPPED to STRIPPED: the model edits a provenance-stripped view,
    // so an echo of exactly what it was shown — the classic do-nothing reply —
    // differs from the stamped spec in the `query`/`name` fields alone. Against
    // the stamped spec that echo looks like a change and commits as a success.
    if (specIdentity(validated) === specIdentity(currentSpec)) {
      return { kind: 'err', message: 'Your patch applied cleanly but left the spec identical to before. Emit operations that actually modify the spec to fulfill the user request.' };
    }
    return { kind: 'ok', spec: validated };
  } catch (e) {
    return { kind: 'err', message: (e as Error).message };
  }
}

// #Patch
/** @internal — exported for unit tests. Stamp provenance on the
 *  transformations the committed turn added or changed — any transformation
 *  with no counterpart in the pre-request spec once provenance and key order
 *  are normalized away: `query` (the request text, verbatim) on the FIRST such
 *  transformation only, so a multi-step request writes its text once, and
 *  `name` (the describeStep label) on every one. A step untouched by the turn
 *  gets its earlier stamps back — even when the patch re-emitted it stripped,
 *  as a whole-array replace does; a step the patch rewrote is restamped with
 *  the latest request. */
export function stampQueries(spec: TablePlan, before: TablePlan, query: string): TablePlan {
  // The pre-request steps as a MULTISET keyed by their provenance-stripped
  // identity. Stripped, because a whole-array replace re-emits the existing
  // steps as the model saw them — without stamps — and those steps are
  // untouched, not new: they get their earlier stamps back rather than the new
  // request's text. A multiset, not a set, because a turn that appends a
  // duplicate of an existing step DID add a step and must be stamped.
  const prior = new Map<string, Transformation[]>();
  for (const t of before.transformations as Transformation[]) {
    const key = stepIdentity(t);
    const bucket = prior.get(key);
    if (bucket) bucket.push(t);
    else prior.set(key, [t]);
  }
  let queryStamped = false;
  return {
    ...spec,
    transformations: (spec.transformations as Transformation[]).map((t) => {
      const untouched = prior.get(stepIdentity(t))?.shift();
      if (untouched) return untouched;
      const stamped: Transformation = queryStamped
        ? { ...t, name: describeStep(t) }
        : { ...t, query, name: describeStep(t) };
      queryStamped = true;
      return stamped;
    }),
  };
}

/** A transformation's identity ignoring provenance and key order: the JSON of
 *  the step with `query`/`name` dropped and every object's keys sorted, so two
 *  steps that describe the same transformation compare equal however the model
 *  happened to order the fields it echoed back. */
function stepIdentity(t: Transformation): string {
  const { query: _q, name: _n, ...rest } = t as Transformation & { query?: string; name?: string };
  return canonicalJson(rest);
}

/** The whole spec's identity, provenance-free — `stepIdentity` for every
 *  transformation plus the rest of the spec. */
function specIdentity(spec: TablePlan): string {
  return canonicalJson({
    ...spec,
    transformations: (spec.transformations as Transformation[]).map((t) => stepIdentity(t)),
  });
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  );
}

/** Columns a `{js}` or `{llm}` expression reads: `row.X` / `row["X"]` /
 *  `row?.X` in JS, `{X}` placeholders in LLM templates. `{sql}` is not
 *  parsed — SQL column references can't be extracted reliably. */
function exprColumnRefs(expr: Expr | undefined): string[] {
  if (!expr) return [];
  const refs: string[] = [];
  if ('js' in expr) {
    for (const m of expr.js.matchAll(/\brow(?:\?\.|\.)([A-Za-z_$][\w$]*)/g)) refs.push(m[1]!);
    for (const m of expr.js.matchAll(/\brow(?:\?\.)?\[\s*['"]([^'"]+)['"]\s*\]/g)) refs.push(m[1]!);
  } else if ('llm' in expr) {
    for (const m of expr.llm.matchAll(/\{([^{}]+)\}/g)) if (m[1] !== '*') refs.push(m[1]!);
  }
  return refs;
}

// #Validate #Patch
/** A `validate` may only read columns that exist when it runs: source
 *  columns, columns created by transformations ordered before it (including
 *  an earlier validate's flag + note pair), and the legacy
 *  `_valid`/`_validation` pair. Walks the transformation list tracking the
 *  available columns; `join` and `pivot` add columns that can't be
 *  enumerated statically, so they suspend the check for later steps.
 *  Returns the rejection message for the recovery loop, or undefined. */
export function checkValidateColumnOrder(spec: TablePlan, sourceColumns: string[]): string | undefined {
  let available = new Set(sourceColumns);
  let unknowable = false;
  for (const t of spec.transformations as Transformation[]) {
    switch (t.kind) {
      case 'validate': {
        if (!unknowable) {
          for (const col of [...exprColumnRefs(t.pred), ...exprColumnRefs(t.message)]) {
            if (col === '_valid' || col === '_validation') continue;
            if (!available.has(col)) {
              return `validate reads column "${col}" which no earlier step provides. A validate can only read source columns or columns created by transformations ordered before it — order the step that computes "${col}" before the validate.`;
            }
          }
        }
        const pair = validateColumns(t);
        available.add(pair.flag);
        available.add(pair.note);
        break;
      }
      case 'mutate':
        for (const c of Array.isArray(t.columns) ? t.columns : [t.columns]) available.add(c);
        break;
      case 'split':
        for (const c of t.into) available.add(c);
        break;
      case 'select':
        available = new Set(t.columns);
        unknowable = false;
        break;
      case 'group': {
        // The engine collision-renames an aggregate that shares a by-column's
        // name, so mirror the real output names here.
        const names = groupOutputNames(t.by, t.agg);
        available = new Set([...names.byNames, ...names.aggNames.map(([, n]) => n)]);
        unknowable = false;
        break;
      }
      case 'unpivot': {
        const { namesTo, valuesTo } = unpivotOutputNames(t);
        available = new Set([...t.id, namesTo, valuesTo]);
        unknowable = false;
        break;
      }
      case 'pivot':
        available = new Set(t.index);
        unknowable = true; // one column per distinct on-value — data-dependent
        break;
      case 'join':
        unknowable = true; // right-table columns aren't known without reading it
        break;
      case 'filter':
      case 'sort':
        break;
    }
  }
  return undefined;
}

// #FileIO
/** Whether a saved flow can run on a table with `sourceColumns`: walks the
 *  transformations tracking column availability (the same walk as
 *  `checkValidateColumnOrder`), checking each step's *reads* — expression
 *  references (`row.X`, `{X}` templates), `split.from`, `select`/`group.by`/
 *  `pivot`/`unpivot` column names. Returns a user-readable message naming the
 *  first column no earlier step provides, or undefined when the flow fits.
 *  `join` and `pivot` add columns that can't be enumerated statically, so
 *  they suspend the check for later steps; `{sql}` expressions aren't parsed. */
/** @internal — exported for unit tests. The declared-but-unwritten guard
 *  (spec/behavior.md § Headless): a patch may not add a `columns` entry that
 *  no transformation writes. Returns the rejection message, or undefined.
 *  Reshaping steps (`group`, `pivot`, `unpivot`, `join`) produce columns
 *  dynamically, so their presence suspends the check. */
export function checkDeclaredColumnsWritten(
  next: TablePlan,
  prev: TablePlan,
  sourceColumns: string[],
): string | undefined {
  const prevIds = new Set(prev.columns.map((c) => c.id));
  const added = next.columns.map((c) => c.id).filter((id) => !prevIds.has(id));
  if (added.length === 0) return undefined;
  const steps = next.transformations as Transformation[];
  if (steps.some((t) => t.kind === 'group' || t.kind === 'pivot' || t.kind === 'unpivot' || t.kind === 'join')) {
    return undefined;
  }
  const written = new Set<string>(sourceColumns);
  for (const t of steps) {
    if (t.kind === 'mutate') for (const c of Array.isArray(t.columns) ? t.columns : [t.columns]) written.add(c);
    else if (t.kind === 'split') for (const c of t.into) written.add(c);
    else if (t.kind === 'validate') { const { flag, note } = validateColumns(t); written.add(flag); written.add(note); }
  }
  const ghost = added.find((id) => !written.has(id));
  if (!ghost) return undefined;
  return (
    `the patch declares a new column "${ghost}" but no transformation computes it — ` +
    `declaring a column never fills it. Add a transformation that writes "${ghost}" ` +
    `(for semantic values, a mutate with an {llm} template).`
  );
}

export function checkFlowInputColumns(spec: TablePlan, sourceColumns: string[]): string | undefined {
  let available = new Set(sourceColumns);
  let unknowable = false;
  const label = (t: Transformation, i: number): string => `step ${i + 1} (${t.kind})`;

  for (const [i, t] of (spec.transformations as Transformation[]).entries()) {
    const reads: string[] = [];
    switch (t.kind) {
      case 'filter':
        reads.push(...exprColumnRefs(t.pred));
        break;
      case 'mutate':
        reads.push(...exprColumnRefs(t.value));
        break;
      case 'select':
        reads.push(...t.columns);
        break;
      case 'sort':
        for (const b of t.by) {
          if (typeof b.key === 'string') reads.push(b.key);
          else reads.push(...exprColumnRefs(b.key));
        }
        break;
      case 'group':
        for (const b of t.by) {
          if (typeof b === 'string') reads.push(b);
          else reads.push(...exprColumnRefs(b));
        }
        break;
      case 'join':
        reads.push(...exprColumnRefs(t.on));
        break;
      case 'split':
        reads.push(t.from);
        if (typeof t.on === 'object' && !(t.on instanceof RegExp)) reads.push(...exprColumnRefs(t.on));
        break;
      case 'validate':
        reads.push(
          ...[...exprColumnRefs(t.pred), ...exprColumnRefs(t.message)].filter(
            (c) => c !== '_valid' && c !== '_validation',
          ),
        );
        break;
      case 'pivot':
        reads.push(...t.index, t.on, t.values);
        break;
      case 'unpivot':
        reads.push(...t.id, ...t.measures);
        break;
    }

    if (!unknowable) {
      for (const col of reads) {
        if (!available.has(col)) {
          return `The flow reads column "${col}" (${label(t, i)}), which the current table does not have. Current columns: ${[...available].join(', ')}.`;
        }
      }
    }

    // Mirror checkValidateColumnOrder's availability bookkeeping.
    switch (t.kind) {
      case 'mutate':
        for (const c of Array.isArray(t.columns) ? t.columns : [t.columns]) available.add(c);
        break;
      case 'split':
        for (const c of t.into) available.add(c);
        break;
      case 'select':
        available = new Set(t.columns);
        unknowable = false;
        break;
      case 'group': {
        // The engine collision-renames an aggregate that shares a by-column's
        // name, so mirror the real output names here.
        const names = groupOutputNames(t.by, t.agg);
        available = new Set([...names.byNames, ...names.aggNames.map(([, n]) => n)]);
        unknowable = false;
        break;
      }
      case 'unpivot': {
        const { namesTo, valuesTo } = unpivotOutputNames(t);
        available = new Set([...t.id, namesTo, valuesTo]);
        unknowable = false;
        break;
      }
      case 'pivot':
        available = new Set(t.index);
        unknowable = true; // one column per distinct on-value — data-dependent
        break;
      case 'join':
        unknowable = true; // right-table columns aren't known without reading it
        break;
      case 'validate': {
        const { flag, note } = validateColumns(t);
        available.add(flag);
        available.add(note);
        break;
      }
      case 'filter':
      case 'sort':
        break;
    }
  }
  return undefined;
}

// ── Runner ─────────────────────────────────────────────────────────────────

// #PuterGateway
// Puter takes one endpoint — POST /drivers/call — whose `args` are an OpenAI
// chat-completions body, and answers `{success, result}` where `result` is an
// OpenAI choice. That is close enough to translate rather than reimplement:
// this fetch sits under the ordinary OpenAI client, wrapping the request and
// unwrapping the reply, so tool calling and retries stay on the tested path.
//
// It always calls Puter **non-streaming**. Puter streams newline-delimited
// JSON rather than SSE, and its streamed frames carry no tool calls — which the
// patch turn depends on. When the SDK asked for a stream (only the Python
// export does), the finished answer is replayed as a single SSE frame: the
// script lands in one piece instead of typing out, and nothing else changes.
function puterFetch(inner?: typeof globalThis.fetch): typeof globalThis.fetch {
  const doFetch = inner ?? globalThis.fetch;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const sent = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    const wantsStream = sent['stream'] === true;
    delete sent['stream'];
    delete sent['stream_options'];

    const res = await doFetch('https://api.puter.com/drivers/call', {
      ...init,
      method: 'POST',
      body: JSON.stringify({
        interface: 'puter-chat-completion',
        driver: 'ai-chat',
        method: 'complete',
        args: sent,
      }),
    } as RequestInit);
    if (!res.ok) return res;

    const envelope = await res.json() as {
      success?: boolean;
      result?: Record<string, unknown>;
      error?: unknown;
    };
    if (envelope.success === false || !envelope.result) {
      const message = typeof envelope.error === 'string'
        ? envelope.error
        : JSON.stringify(envelope.error ?? 'Puter.js refused the request');
      return new Response(JSON.stringify({ error: { message } }), {
        status: 502, headers: { 'content-type': 'application/json' },
      });
    }

    const choice = envelope.result;
    const u = (choice['usage'] ?? {}) as Record<string, number>;
    const completion = {
      id: 'puter', object: 'chat.completion', created: Math.floor(Date.now() / 1000),
      model: String(sent['model'] ?? ''),
      choices: [{
        index: 0,
        message: choice['message'],
        finish_reason: choice['finish_reason'] ?? 'stop',
      }],
      // Puter names its counters `prompt`/`completion` on a finished call and
      // `prompt_tokens`/`completion_tokens` in a streamed usage frame.
      usage: {
        prompt_tokens: u['prompt_tokens'] ?? u['prompt'] ?? 0,
        completion_tokens: u['completion_tokens'] ?? u['completion'] ?? 0,
        total_tokens: (u['prompt_tokens'] ?? u['prompt'] ?? 0)
          + (u['completion_tokens'] ?? u['completion'] ?? 0),
      },
    };

    if (!wantsStream) {
      return new Response(JSON.stringify(completion), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }

    // One SSE frame carrying the whole answer, then the usage frame and [DONE].
    const message = (choice['message'] ?? {}) as { content?: string };
    const frame = (delta: unknown, extra: Record<string, unknown> = {}): string =>
      `data: ${JSON.stringify({ ...completion, object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: null }], ...extra })}\n\n`;
    const body =
      frame({ role: 'assistant', content: message.content ?? '' }) +
      `data: ${JSON.stringify({ ...completion, object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: completion.choices[0]!.finish_reason }] })}\n\n` +
      'data: [DONE]\n\n';
    return new Response(body, {
      status: 200, headers: { 'content-type': 'text/event-stream' },
    });
  }) as typeof globalThis.fetch;
}

class HeadlessRunnerImpl implements HeadlessRunner {
  private opts: HeadlessRunnerOptions;
  private sourceRows: Row[] = [];
  private sourcePath = '';
  private spec: TablePlan = { columns: [], transformations: [] };
  private derivedRows: Row[] = [];
  // #LazyExec — source origin of each derived row (parallel to derivedRows)
  // and the origins of the last completed replay, committed together with
  // its rows. See the ROW_ORIGIN notes above.
  private derivedOrigins: Array<number | undefined> = [];
  private lastReplayOrigins: Array<number | undefined> = [];
  // Lookup tables staged by name (browser joins): a `join` whose `with` matches
  // a key here uses these rows instead of reading the file by path.
  private lookupTables = new Map<string, Row[]>();
  // #LookupJoin — right tables already read from disk, keyed by the join's
  // `with` path. A join reads its right table once and holds it, so an
  // :undo/:redo that replays the step never re-reads the file (and no longer
  // throws when it has moved since). Pruned to the committed spec's joins after
  // every commit, and cleared with the source.
  private joinRightTables = new Map<string, Row[]>();
  // The loaded source's column list — the JSONL union of keys, not row 0's
  // keys — as the patch-turn guards must see it (spec/code-contract.md § core).
  private sourceColumns: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private modelCache: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cellModelCache: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private providerCache: ((modelId: string) => any) | undefined;
  private cellResultCache = new Map<string, unknown>();
  // Per-request tally of model calls + token usage; reset at the start of
  // each request() and rolled up into the RequestDebugInfo it emits.
  private callLog: Array<{ model: string; inputTokens: number; outputTokens: number }> = [];
  private cellSampleLog: CellSample[] = [];
  private loaded = false;
  private busy = false;
  // The DuckDB session behind every {sql} expression — see sql.ts.
  private sql = new SqlSession();

  constructor(opts: HeadlessRunnerOptions = {}) {
    this.opts = opts;
    if (opts.rpm) rateLimiter.setLimit(opts.rpm);
    if (process.env.TAMEDTABLE_RPM) rateLimiter.setLimit(Number(process.env.TAMEDTABLE_RPM));
  }

  private requireLoaded(): void {
    if (!this.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
  }

  private recordCall(
    model: string,
    usage: { inputTokens?: number; outputTokens?: number } | undefined,
    role: 'primary' | 'cell' = 'cell',
  ): void {
    const entry = {
      model,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
    };
    this.callLog.push(entry);
    this.opts.onUsage?.({ ...entry, role });
  }

  // #DebugOut
  private buildDebugInfo(
    userRequest: string,
    turns: RequestDebugTurn[],
    expressions: Array<{ label: string; body: string }>,
    elapsedMs: number,
    steps: string[] = []
  ): RequestDebugInfo {
    const order: string[] = [];
    const counts = new Map<string, number>();
    let inputTokens = 0;
    let outputTokens = 0;
    for (const c of this.callLog) {
      if (!counts.has(c.model)) { counts.set(c.model, 0); order.push(c.model); }
      counts.set(c.model, counts.get(c.model)! + 1);
      inputTokens += c.inputTokens;
      outputTokens += c.outputTokens;
    }
    return {
      userRequest,
      turns,
      expressions,
      steps,
      cellSamples: this.cellSampleLog,
      modelCalls: order.map((m) => ({ model: m, calls: counts.get(m)! })),
      inputTokens,
      outputTokens,
      elapsedMs,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private provider(): (modelId: string) => any {
    if (this.providerCache) return this.providerCache;

    const apiKey = this.opts.apiKey;
    const fetchImpl = this.opts.fetch;
    const fetchOpt = fetchImpl ? { fetch: fetchImpl as typeof globalThis.fetch } : {};
    const modelId = this.opts.model ?? DEFAULT_MODEL;
    const detected = this.opts.provider ?? providerFor(modelId);

    if (detected === 'gemini') {
      const key = apiKey ?? process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
      this.providerCache = createGoogleGenerativeAI({ apiKey: key, ...fetchOpt });
    } else if (detected === 'openai') {
      const key = apiKey ?? process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OPENAI_API_KEY is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
      // Chat Completions, not the SDK's default Responses API: it is the
      // broadly-compatible endpoint for the GPT models in the catalogue.
      const openai = createOpenAI({ apiKey: key, ...fetchOpt });
      this.providerCache = (modelId: string) => openai.chat(modelId);
    } else if (detected === 'cerebras') {
      // Bench-only free provider: an OpenAI-compatible endpoint, so the same
      // Chat Completions path as OpenAI, pointed at Cerebras.
      const key = apiKey ?? process.env.CEREBRAS_API_KEY;
      if (!key) throw new Error('CEREBRAS_API_KEY is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
      const cerebras = createOpenAI({ apiKey: key, baseURL: 'https://api.cerebras.ai/v1', ...fetchOpt });
      this.providerCache = (modelId: string) => cerebras.chat(modelId);
    } else if (detected === 'puter') {
      // #PuterGateway — Puter is not OpenAI-compatible at the transport level,
      // but its `ai-chat` driver speaks OpenAI's *payload*: the same messages,
      // the same `tools`, and `finish_reason: "tool_calls"` with
      // `message.tool_calls[]` coming back. So rather than a bespoke
      // LanguageModel implementation, the OpenAI client is pointed at a fetch
      // that puts the body into Puter's envelope and takes the answer out
      // again. Everything downstream — tool calling, retries, usage — is the
      // path the other providers already use.
      const key = apiKey ?? process.env.PUTER_TOKEN;
      if (!key) throw new Error('PUTER_TOKEN is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
      const puter = createOpenAI({
        apiKey: key,
        baseURL: 'https://api.puter.com',
        fetch: puterFetch(fetchImpl as typeof globalThis.fetch | undefined),
      });
      this.providerCache = (modelId: string) => puter.chat(modelId);
    } else if (detected === 'groq') {
      // Shipped app provider: another OpenAI-compatible endpoint, so the same
      // Chat Completions path as OpenAI, pointed at Groq. Its ids are
      // vendor-prefixed (openai/gpt-oss-120b), which is why providerFor reads
      // the catalogue before it reads prefixes.
      const key = apiKey ?? process.env.GROQ_API_KEY;
      if (!key) throw new Error('GROQ_API_KEY is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
      const groq = createOpenAI({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1', ...fetchOpt });
      this.providerCache = (modelId: string) => groq.chat(modelId);
    } else if (detected === 'openrouter') {
      // Shipped app provider (the 4th), same OpenAI-compatible path as
      // Cerebras. :free models 404 unless the account's privacy settings
      // allow free model publication — see benchmarks/README.md.
      const key = apiKey ?? process.env.OPENROUTER_API_KEY;
      if (!key) throw new Error('OPENROUTER_API_KEY is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
      const openrouter = createOpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1', ...fetchOpt });
      this.providerCache = (modelId: string) => openrouter.chat(modelId);
    } else {
      // Anthropic (default)
      const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
      const rawBase = this.opts.baseURL ?? process.env.ANTHROPIC_BASE_URL;
      const baseURL = rawBase
        ? rawBase.replace(/\/$/, '').endsWith('/v1')
          ? rawBase.replace(/\/$/, '')
          : `${rawBase.replace(/\/$/, '')}/v1`
        : 'https://api.anthropic.com/v1';
      this.providerCache = createAnthropic({ apiKey: key, baseURL, ...fetchOpt });
    }

    return this.providerCache!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model(): any {
    return (this.modelCache ??= this.provider()(this.opts.model ?? DEFAULT_MODEL));
  }

  // Sampling params to spread into a generateText() call. We pin temperature
  // to 0 for determinism, but only for models that still accept it — the
  // newest models removed sampling params and 400 on `temperature`, so we omit
  // it for them. See acceptsTemperature() in @tamedtable/model-config.
  private samplingParams(modelId: string): { temperature?: number } {
    return acceptsTemperature(modelId) ? { temperature: 0 } : {};
  }

  /** The model-ID string to use for per-cell LLM calls. */
  private resolvedCellModelId(perCellModel?: string): string {
    if (perCellModel) return perCellModel;
    return resolveCellModelId(this.opts.model ?? DEFAULT_MODEL, this.opts.cellModel);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cellModel(perCellModel?: string): any {
    if (perCellModel) return this.provider()(perCellModel);
    return (this.cellModelCache ??= this.provider()(this.resolvedCellModelId()));
  }

  async loadInput(path: string): Promise<void> {
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
    let result: { spec: TablePlan; rows: Row[]; sourcePath: string };
    if (ext === '.csv') result = await loadCsv(path);
    else if (ext === '.jsonl') result = await loadJsonl(path);
    else result = await loadFile(path); // parquet, arrow, … — registry dispatch

    await this.commitSource(result.rows, result.spec, result.sourcePath);
  }

  async loadParsed(rows: Row[], spec: TablePlan): Promise<void> {
    const validated = validateTablePlan(spec);
    await this.commitSource(rows, validated, validated.table ?? '');
  }

  registerLookup(name: string, rows: Row[]): void {
    this.lookupTables.set(name, rows);
  }

  /** Commit a freshly-loaded source — shared by loadInput (path) and
   *  loadParsed (rows). Resets derived state and the DuckDB relation. */
  private async commitSource(rows: Row[], spec: TablePlan, sourcePath: string): Promise<void> {
    this.sourceRows = rows;
    this.sourceColumns = spec.columns.map((c) => c.id);
    this.sourcePath = sourcePath;
    this.spec = spec;
    this.derivedRows = rows.slice();
    this.derivedOrigins = rows.map((_, i) => i);
    this.cellResultCache.clear();
    this.joinRightTables.clear();
    // Reset the DuckDB relation so SQL transformations see the new source.
    await this.sql.resetTable();
    this.loaded = true;
  }

  currentRows(): Row[] { this.requireLoaded(); return this.derivedRows; }
  currentSpec(): TablePlan { this.requireLoaded(); return this.spec; }

  async exportAs(filePath: string): Promise<void> {
    this.requireLoaded();
    // Rows are keyed by column id; the CSV header uses `label` when set,
    // otherwise id (spec/behavior.md § CSV output). Other formats keep the ids.
    await writeRows(
      filePath,
      this.derivedRows,
      this.spec.columns.map((c) => c.id),
      this.spec.columns.map((c) => c.label ?? c.id),
    );
  }

  // #PyExport
  // #ProviderSelect — the Settings "Test" button. One tiny call on the cheap
  // (cell) model to prove the key, the model and the network path all work,
  // with retries off: the request path's backoff is right for a real
  // transformation and wrong here, where an empty billing account would keep
  // the user watching a spinner for a minute to learn what the first response
  // already said. No rate-limiter wait (a key test must not queue behind a
  // run) and no usage recorded — a test is not part of any request.
  async testConnection(opts?: { signal?: AbortSignal }): Promise<{ model: string }> {
    const model = this.resolvedCellModelId();
    await generateText({
      model: this.cellModel(),
      prompt: 'Reply with OK.',
      abortSignal: opts?.signal,
      ...this.samplingParams(model),
      maxRetries: 0,
    });
    return { model };
  }

  // The call streams (#PyExport): the script is the slowest thing the app
  // asks a model for, and a host that can show it being written turns a blank
  // wait into something to watch. Streaming unconditionally — `onProgress` or
  // not — keeps ONE request shape, so the CLI and the web app share a cassette.
  async exportPython(opts: ExportPythonOpts = {}): Promise<string> {
    this.requireLoaded();
    // Same trims as a patch turn: basename-only table, no query provenance.
    const spec = stripQueryMetadata(this.spec);
    const llmSpec = spec.table ? { ...spec, table: basename(spec.table) } : spec;
    const prompt = `Translate this TamedTable flow into a standalone Python 3 script.\n\nSpec:\n${JSON.stringify(llmSpec, null, 2)}`;
    const modelId = this.opts.model ?? DEFAULT_MODEL;
    await rateLimiter.acquire(opts.signal);
    const result = streamText({
      model: this.model(),
      system: PYTHON_EXPORT_PROMPT,
      prompt,
      ...this.samplingParams(modelId),
      maxRetries: EXPORT_MAX_RETRIES,
      providerOptions: withLowEffort(modelId, ANTHROPIC_EPHEMERAL),
      abortSignal: opts.signal,
    });
    let raw = '';
    let reported = '';
    for await (const delta of result.textStream) {
      raw += delta;
      // Report the script as it stands, not the delta: the fence strip needs
      // the whole text, and a host wanting deltas can diff two updates. A
      // chunk that changes nothing visible (a lone fence) reports nothing.
      const soFar = unfenceScript(raw);
      if (soFar !== reported) {
        reported = soFar;
        opts.onProgress?.(soFar);
      }
    }
    const text = unfenceScript(raw);
    if (!text) throw new Error('Python export: the model returned no script.');
    return text.endsWith('\n') ? text : text + '\n';
  }

  async setSpec(
    spec: TablePlan,
    opts: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void; fresh?: boolean } & LazyEvalOpts = {},
  ): Promise<void> {
    const validated = validateTablePlan(spec);
    if (this.sourcePath) validated.table = this.sourcePath;
    // #CancelOp — a long replay ({llm} cells, a big flow) is cancellable, and
    // the abort must reach the host as `Runner: cancelled`, not as whatever
    // the provider SDK threw. Nothing below has run yet, so the previous spec
    // and rows stay untouched.
    let rows: Row[];
    try {
      rows = await this.replay(validated, this.sourceRows, opts.signal, opts.onChunk, opts.onStep, opts, opts.fresh);
    } catch (e) {
      throw asCancelled(e, opts.signal);
    }
    this.spec = syncColumnsToRows(validated, rows);
    this.derivedRows = rows;
    this.derivedOrigins = this.lastReplayOrigins;
    this.loaded = true;
    this.pruneJoinRightTables();
  }

  /** Keep only the right tables the committed spec's joins still name, so a
   *  step the user removed doesn't pin its lookup rows in memory forever. */
  private pruneJoinRightTables(): void {
    const live = new Set(
      (this.spec.transformations as Transformation[])
        .filter((t): t is Extract<Transformation, { kind: 'join' }> => t.kind === 'join')
        .map((t) => t.with)
        .filter((w): w is string => typeof w === 'string'),
    );
    for (const key of [...this.joinRightTables.keys()]) if (!live.has(key)) this.joinRightTables.delete(key);
  }

  // #LazyExec — web-shell seams (see the interface docs).
  async adoptState(spec: TablePlan, rows: Row[], origins?: ReadonlyArray<number | undefined>): Promise<void> {
    const validated = validateTablePlan(spec);
    if (this.sourcePath) validated.table = this.sourcePath;
    this.spec = syncColumnsToRows(validated, rows);
    this.derivedRows = rows;
    // Without handed-over origins, fall back to positional identity — the
    // pre-mapping behavior, correct whenever no step reordered the rows.
    this.derivedOrigins = origins ? [...origins] : rows.map((_, i) => i);
    await this.sql.resetTable();
    this.loaded = true;
  }

  rowOrigins(): ReadonlyArray<number | undefined> {
    return this.derivedOrigins;
  }

  cellCacheEntries(): Array<[string, unknown]> {
    return [...this.cellResultCache.entries()];
  }

  seedCellCache(entries: Array<[string, unknown]>): void {
    for (const [k, v] of entries) this.cellResultCache.set(k, v);
  }

  // #MainLoop
  async request(
    text: string,
    callOpts: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void; onPlanEdits?: (items: PlanEdit[]) => void; audio?: RequestAudio; onTranscript?: (text: string) => void; confirmSpec?: (next: TablePlan, prev: TablePlan) => Promise<boolean> } & LazyEvalOpts = {}
  ): Promise<void> {
    this.requireLoaded();
    if (this.busy || this.sql.hasLingeringSql()) throw new Error('Runner: a request is already in progress.');
    this.busy = true;
    const signal = callOpts.signal ?? this.opts.signal;
    const onChunk = callOpts.onChunk ?? this.opts.onChunk;
    const onPlanEdits = callOpts.onPlanEdits ?? this.opts.onPlanEdits;
    const turns: RequestDebugTurn[] = [];
    const startedAt = Date.now();
    const specBefore = this.spec;
    this.callLog = [];
    this.cellSampleLog = [];
    // onDebug fires exactly once per request, on every way it can settle
    // (spec/code-contract.md § Headless) — a failure inside the model call
    // itself included, since it still spent tokens. The flag keeps the
    // catch-all report below from doubling a report already made.
    let debugReported = false;
    const reportDebug = (info: RequestDebugInfo): void => {
      if (debugReported) return;
      debugReported = true;
      this.opts.onDebug?.(info);
    };
    try {
      const budget = this.opts.recoveryBudget ?? 3;
      let lastError: string | undefined;
      let transcriptSent = false;
      // The provenance text stamped on committed transformations: the request
      // text, or — for a spoken request — the transcript once it arrives.
      let queryText = text;
      let prompt = buildPrompt(text, this.spec);
      for (let i = 0; i < budget; i++) {
        abortIf(signal);
        // #CancelOp — the model call is most of a request's wall-clock, so it
        // is where a Stop usually lands. Translate here too, or the SDK's raw
        // AbortError escapes and the host reads a cancel as a crash.
        let llmTurn: { ops: unknown[]; transcript?: string };
        try {
          llmTurn = await this.callLlm(prompt, signal, callOpts.audio);
        } catch (e) {
          throw asCancelled(e, signal);
        }
        const ops = llmTurn.ops;
        if (llmTurn.transcript && !transcriptSent) {
          transcriptSent = true;
          queryText = llmTurn.transcript;
          callOpts.onTranscript?.(llmTurn.transcript);
        }
        const turn: RequestDebugTurn = { ops, outcome: '' };
        turns.push(turn);

        const tried = applyAndValidate(this.spec, ops);
        if (tried.kind === 'err') {
          turn.outcome = 'rejected';
          turn.sentBack = tried.message;
          lastError = tried.message;
          prompt = buildPrompt(text, this.spec, `Your previous patch failed: ${tried.message}`);
          continue;
        }

        // A validate reading a column no earlier step provides would flag
        // every row; reject before anything runs (spec/behavior.md § Headless).
        // The source columns are the LOADED SPEC's column list, not row 0's
        // keys: a JSONL source's columns are the union of every row's keys, so
        // reading row 0 alone rejects a validate on a perfectly real column that
        // a sparse first row happens to omit (spec/code-contract.md § core).
        const orderError = checkValidateColumnOrder(tried.spec, this.sourceColumns);
        if (orderError) {
          turn.outcome = 'rejected';
          turn.sentBack = orderError;
          lastError = orderError;
          prompt = buildPrompt(text, this.spec, `Your previous patch failed: ${orderError}`);
          continue;
        }

        // The mirror guard: a patch that only DECLARES a new column — no
        // transformation writes it — would commit as a silent no-op. Weak
        // models produce exactly this shape; send it back for the computing
        // step (spec/behavior.md § Headless).
        const ghostError = checkDeclaredColumnsWritten(tried.spec, this.spec, this.sourceColumns);
        if (ghostError) {
          turn.outcome = 'rejected';
          turn.sentBack = ghostError;
          lastError = ghostError;
          prompt = buildPrompt(text, this.spec, `Your previous patch failed: ${ghostError}`);
          continue;
        }

        // #LazyExec — the dependency rule's gate: the host inspects the
        // applied-but-not-yet-replayed spec and may decline it (or widen its
        // cellFilter to run all rows first). Declining drops the patch with
        // no spec change, no history entry, and no recovery turn.
        if (callOpts.confirmSpec && !(await callOpts.confirmSpec(tried.spec, this.spec))) {
          throw new Error(DECLINED);
        }

        if (onPlanEdits) {
          // The edit printer runs inside this callback. A formatting bug in
          // it must drop an edit line, never fail an otherwise-good request —
          // so swallow anything diffPlans or the callback throws.
          try {
            const edits = diffPlans(this.spec, tried.spec);
            if (edits.length) onPlanEdits(edits);
          } catch { /* edit display is best-effort */ }
        }

        try {
          const newRows = await this.replay(tried.spec, this.sourceRows, signal, onChunk, callOpts.onStep, callOpts);
          abortIf(signal);
          // Zero-rows guard (spec/behavior.md § Headless): a patch that
          // evaluates to an empty table from a non-empty source is almost
          // always a predicate mis-parsing real cell values — reject it into
          // the recovery loop instead of silently emptying the table.
          if (newRows.length === 0 && this.sourceRows.length > 0) {
            throw new Error(
              `the transformations left the table with 0 rows (the source has ${this.sourceRows.length}). ` +
              'A filter or join predicate almost certainly mis-parses the real cell values ' +
              '(date/number formats, code casing). Emit a more tolerant patch — never one that empties the table.'
            );
          }
          this.spec = stampQueries(syncColumnsToRows(tried.spec, newRows), specBefore, queryText);
          this.derivedRows = newRows;
          this.derivedOrigins = this.lastReplayOrigins;
          this.pruneJoinRightTables();
          turn.outcome = 'committed';
          const added = diffPlans(specBefore, this.spec)
            .filter((p): p is Extract<PlanEdit, { kind: 'add-transformation' }> => p.kind === 'add-transformation');
          const expressions = added.flatMap((p) => transformationExpressions(p.transformation));
          const steps = added.map((p) => describeStep(p.transformation));
          reportDebug(this.buildDebugInfo(text, turns, expressions, Date.now() - startedAt, steps));
          return;
        } catch (e) {
          if (signal?.aborted || isCancelled(e)) throw new Error(CANCELLED);
          lastError = (e as Error).message;
          turn.outcome = `evaluation failed: ${lastError}`;
          turn.sentBack = `evaluation error: ${lastError}`;
          prompt = buildPrompt(text, this.spec, `Your previous patch applied but evaluation failed: ${lastError}`);
        }
      }
      const info = this.buildDebugInfo(text, turns, [], Date.now() - startedAt);
      const err = new Error(`Runner: recovery budget exhausted${lastError ? `; last error: ${lastError}` : ''}`);
      (err as Error & { debug?: RequestDebugInfo }).debug = info;
      reportDebug(info);
      throw err;
    } catch (e) {
      // Anything that escaped the loop — an HTTP error or a text-only reply in
      // the model call, a cancel, a declined patch — still settles the request,
      // so its token spend must not be invisible to the CLI and the web.
      reportDebug(this.buildDebugInfo(text, turns, [], Date.now() - startedAt));
      throw e;
    } finally {
      this.busy = false;
    }
  }

  // #LlmLayer
  private async callLlm(
    prompt: string,
    signal?: AbortSignal,
    audio?: RequestAudio,
  ): Promise<{ ops: unknown[]; transcript?: string }> {
    let captured: unknown[] | undefined;
    let transcript: string | undefined;
    const applySpecPatch = tool({
      description: 'Apply RFC 6902 JSON Patch operations to the current spec.',
      inputSchema: patchInputSchema(Boolean(audio)),
      execute: async ({ operations, transcript: heard }: { operations: unknown[]; transcript?: string }) => {
        captured = operations;
        transcript = heard;
        return { ok: true };
      },
    });
    await rateLimiter.acquire(signal);
    // With audio (web voice input) the user message is multimodal: the prompt
    // text plus the spoken request as a file part — still one model call.
    const userContent = audio
      ? {
          messages: [{
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: prompt },
              { type: 'file' as const, data: audio.data, mediaType: audio.mediaType },
            ],
          }],
        }
      : { prompt };
    const result = await generateText({
      model: this.model(),
      system: SYSTEM_PROMPT,
      ...userContent,
      tools: { apply_spec_patch: applySpecPatch },
      toolChoice: { type: 'tool', toolName: 'apply_spec_patch' },
      stopWhen: stepCountIs(1),
      abortSignal: signal,
      ...this.samplingParams(this.opts.model ?? DEFAULT_MODEL),
      maxRetries: this.opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      providerOptions: ANTHROPIC_EPHEMERAL,
    });
    this.recordCall(this.opts.model ?? DEFAULT_MODEL, result.usage, 'primary');
    if (!captured) {
      const direct = result.toolCalls?.find((c) => c.toolName === 'apply_spec_patch');
      const input = direct?.input as { operations?: unknown[]; transcript?: string } | undefined;
      if (input?.operations) {
        captured = input.operations;
        transcript = input.transcript;
      }
    }
    if (!captured) throw new Error(`LLM did not call apply_spec_patch; returned text: ${result.text?.slice(0, 200) ?? '<empty>'}`);
    return { ops: decodeOpValues(captured), transcript: transcript?.trim() || undefined };
  }

  private async replay(
    spec: TablePlan,
    sourceRows: Row[],
    signal: AbortSignal | undefined,
    onChunk: ((u: ChunkUpdate) => void) | undefined,
    onStep?: (u: StepUpdate) => void,
    lazy?: LazyEvalOpts,
    fresh?: boolean
  ): Promise<Row[]> {
    const prev = this.spec.transformations;
    const next = spec.transformations;
    const reuseDerivedAsPrefix =
      !fresh &&
      next.length >= prev.length &&
      this.derivedRows.length > 0 &&
      prev.every((p, i) => JSON.stringify(p) === JSON.stringify(next[i]));

    // #LazyExec — tag the working copies with their source origins (derived
    // rows re-carry the origins committed with them), stripped back off the
    // final rows below. See the ROW_ORIGIN notes.
    let rows: Row[];
    let start: number;
    if (reuseDerivedAsPrefix) {
      rows = this.derivedRows.map((r, i) => tagOrigin({ ...r }, this.derivedOrigins[i]));
      start = prev.length;
    } else {
      rows = sourceRows.map((r, i) => tagOrigin({ ...r }, i));
      start = 0;
    }
    for (let i = start; i < next.length; i++) {
      // Report the step before the abort check, so a cancel fired from inside
      // the onStep callback stops the replay before the step runs.
      const t = next[i] as Transformation;
      onStep?.({ index: i, total: next.length, kind: t.kind, label: describeStep(t), rows: rows.length, expressions: transformationExpressions(t) });
      abortIf(signal);
      rows = await this.applyT(rows, next[i] as Transformation, i, signal, onChunk, lazy);
    }
    this.lastReplayOrigins = stripOrigins(rows);
    return rows;
  }

  // #StepExec
  private async applyT(
    rows: Row[],
    t: Transformation,
    tIndex: number,
    signal: AbortSignal | undefined,
    onChunk: ((u: ChunkUpdate) => void) | undefined,
    lazy?: LazyEvalOpts
  ): Promise<Row[]> {
    switch (t.kind) {
      case 'filter':
        if ('sql' in t.pred) return this.sql.applyFilterSql(rows, t as typeof t & { pred: { sql: string } }, signal);
        return applyFilter(rows, t);
      case 'select':   return applySelect(rows, t);
      case 'sort':     return this.applySortT(rows, t, signal);
      case 'mutate':
        if ('sql' in t.value) return this.sql.applyMutateSql(rows, t as typeof t & { value: { sql: string } }, signal);
        if ('js' in t.value) return applyMutateJs(rows, t as typeof t & { value: { js: string } });
        return this.applyMutateLlm(rows, t as typeof t & { value: { llm: string; model?: string } }, tIndex, signal, onChunk, lazy);
      case 'validate': return applyValidateJs(rows, t);
      case 'group':    return this.applyGroup(rows, t, tIndex, signal, onChunk);
      case 'split':    return this.applySplitT(rows, t, signal, tIndex, lazy, onChunk);
      case 'pivot':    return applyPivot(rows, t);
      case 'unpivot':  return applyUnpivot(rows, t);
      case 'join':     return applyJoin(rows, t, this.sourcePath ? dirname(this.sourcePath) : process.cwd(), this.lookupTables, this.joinRightTables);
    }
  }

  /** Evaluate one sort key to a per-row value array. A key may be a column
   *  name or any Expr shape — the same set `mutate.value` accepts. {sql}
   *  runs through DuckDB, {llm} through the cell model. */
  private async evalSortKey(
    rows: Row[],
    key: string | Expr,
    signal: AbortSignal | undefined
  ): Promise<unknown[]> {
    if (typeof key === 'string') return rows.map((r) => r[key]);
    if ('js' in key) {
      const fn = compileJs(key.js);
      return rows.map((r, i) => fn(r, i, rows));
    }
    if ('sql' in key) return this.sql.evalSqlScalar(rows, key.sql, signal);
    // {llm}: one rendered prompt per row, evaluated through the cell model —
    // the same batching/caching path a mutate LLM column uses, so a table
    // larger than one batch becomes several requests, not one giant one.
    validateTemplate(key.llm, rows);
    return this.runCellBatches(rows, (batch) => this.evalLlmBatch(key.llm, batch, key.model, signal, undefined), signal);
  }

  /** Sort by one or more keys. Each key is evaluated to a per-row value array
   *  up front (a {sql}/{llm} key can't be evaluated inside the comparator),
   *  then rows are ordered by comparing those arrays. */
  // #SortRows
  private async applySortT(
    rows: Row[],
    t: Extract<Transformation, { kind: 'sort' }>,
    signal: AbortSignal | undefined
  ): Promise<Row[]> {
    const keyColumns: unknown[][] = [];
    for (const b of t.by) keyColumns.push(await this.evalSortKey(rows, b.key, signal));
    const dirs = t.by.map((b) => (b.dir === 'desc' ? -1 : 1));
    const indices = rows.map((_, i) => i);
    indices.sort((ai, bi) => {
      for (let k = 0; k < keyColumns.length; k++) {
        const c = compareSortKeys(keyColumns[k]![ai], keyColumns[k]![bi]);
        if (c !== 0) return c * dirs[k]!;
      }
      return 0;
    });
    // top-N: a `limit` keeps only the first N rows after ordering.
    const ordered = indices.map((i) => rows[i]!);
    return t.limit !== undefined ? ordered.slice(0, t.limit) : ordered;
  }

  private async applyGroup(
    rows: Row[],
    t: Extract<Transformation, { kind: 'group' }>,
    _tIndex: number,
    signal: AbortSignal | undefined,
    _onChunk: ((u: ChunkUpdate) => void) | undefined
  ): Promise<Row[]> {
    const hasLlmAgg = Object.values(t.agg).some((expr) => 'llm' in expr);
    const hasSqlAgg = Object.values(t.agg).some((expr) => 'sql' in expr);
    if (!hasLlmAgg && !hasSqlAgg) return applyGroupJs(rows, t);

    const { order, groups } = buildGroups(rows, t.by);
    // Output names, with an aggregate that shares a by-column's name renamed —
    // the group key must survive (spec/behavior.md § group).
    const { byNames, aggNames } = groupOutputNames(t.by, t.agg);
    const allGroups = order.map((k) => {
      const g = groups.get(k)!;
      return { key: aggKey(g.keyTuple), rows: g.slice };
    });

    // LLM aggregates: pre-render one prompt per (group, llm-agg) cell — {*}
    // expands to the group's compact JSON — then run them through the shared
    // batch/chunk driver, so many groups cost many bounded requests instead of
    // one request carrying every group's rows.
    const llmAggCols = Object.entries(t.agg).filter(([, e]) => 'llm' in e) as Array<[string, { llm: string; model?: string }]>;
    let llmResults: unknown[] = [];
    if (llmAggCols.length > 0) {
      const renderAgg = (template: string, slice: Row[]): string =>
        template.replace(/\{\*\}/g, JSON.stringify(slice));
      const prompts: string[] = [];
      for (const key of order) {
        const slice = groups.get(key)!.slice;
        for (const [, expr] of llmAggCols) prompts.push(renderAgg(expr.llm, slice));
      }
      const aggModel = llmAggCols[0]?.[1].model;
      llmResults = await this.runCellBatches(prompts, (batch) => this.callLlmCells(batch, aggModel, signal), signal);
    }

    // Emit one output row per group. JS aggregates run a compiled function
    // over the group's slice; {sql} aggregates run a real GROUP BY-style
    // query per group through DuckDB with the slice registered as relation `g`.
    const out: Row[] = [];
    for (let gi = 0; gi < order.length; gi++) {
      abortIf(signal);
      const { keyTuple, slice } = groups.get(order[gi]!)!;
      const row: Row = {};
      byNames.forEach((name, i) => { setCell(row, name, keyTuple[i] ?? null); });
      let llmIdx = 0;
      for (const [outCol, name] of aggNames) {
        const expr = t.agg[outCol]!;
        if ('js' in expr) {
          setCell(row, name, compileAgg(expr.js)(slice, aggKey(keyTuple), allGroups));
        } else if ('sql' in expr) {
          setCell(row, name, await this.sql.evalSqlAgg(slice, expr.sql, signal));
        } else {
          setCell(row, name, llmResults[gi * llmAggCols.length + llmIdx]);
          llmIdx++;
        }
      }
      out.push(row);
    }
    return out;
  }

  /** Dispatches a split: an {llm} `on` runs the async path; literal,
   *  regex, and {js} separators stay on the synchronous path. */
  private async applySplitT(
    rows: Row[],
    t: Extract<Transformation, { kind: 'split' }>,
    signal: AbortSignal | undefined,
    tIndex?: number,
    lazy?: LazyEvalOpts,
    onChunk?: (u: ChunkUpdate) => void
  ): Promise<Row[]> {
    if (typeof t.on === 'object' && !(t.on instanceof RegExp) && 'llm' in t.on) {
      return this.applySplitLlm(rows, t as typeof t & { on: { llm: string; model?: string } }, signal, tIndex ?? 0, lazy, onChunk);
    }
    return applySplit(rows, t);
  }

  /** LLM-backed split: render the {llm} `on` template per row, ask the
   *  cell model to break the cell into parts, then pad/concat to `into`'s
   *  arity exactly as a literal or regex split would. Runs through the same
   *  batch/cache driver an {llm} mutate uses (#LazyExec): a cellFilter's
   *  excluded rows refill from the per-cell result cache when their rendered
   *  prompt is cached (free), else hold pending sentinels — so paging,
   *  undo/redo, and resume never re-bill a split cell — and with
   *  `onCellError` set a failing cell lands a failed sentinel per row
   *  instead of failing the step. */
  private async applySplitLlm(
    rows: Row[],
    t: Extract<Transformation, { kind: 'split' }> & { on: { llm: string; model?: string } },
    signal: AbortSignal | undefined,
    tIndex: number,
    lazy?: LazyEvalOpts,
    onChunk?: (u: ChunkUpdate) => void
  ): Promise<Row[]> {
    validateTemplate(t.on.llm, rows);
    const included = (i: number): boolean => !lazy?.cellFilter || lazy.cellFilter(tIndex, i, rows[i]!);
    const out: Row[] = rows.map((r) => ({ ...r }));
    // `stream` mirrors the mutate path: only cells an included batch landed
    // emit chunks — an excluded row's silent cache refill paints nothing.
    const fill = (i: number, reply: unknown, stream = false): void => {
      const target = out[i]!;
      if (isFailedCell(reply)) {
        for (const col of t.into) target[col] = reply;
        return;
      }
      const parts = reply === null || reply === undefined
        ? t.into.map(() => null)
        : padParts(parseLlmParts(String(reply)), t.into);
      t.into.forEach((col, idx) => {
        const before = target[col];
        target[col] = parts[idx] ?? null;
        if (stream) onChunk?.({ transformationIndex: tIndex, rowIndex: i, column: col, before, after: parts[idx] ?? null });
      });
    };
    const callIdx: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i]![t.from];
      const empty = cell === null || cell === undefined || cell === '';
      if (empty) { fill(i, null); continue; }
      if (included(i)) { callIdx.push(i); continue; }
      const key = this.cacheKey(t.on.model, renderPrompt(t.on.llm, rows[i]!, t.into));
      if (this.cellResultCache.has(key)) fill(i, this.cellResultCache.get(key));
      else for (const col of t.into) out[i]![col] = pendingCell();
    }
    const replies = await this.runCellBatches(
      callIdx,
      (batch) =>
        this.evalLlmBatch(t.on.llm, batch.map((i) => rows[i]!), t.on.model, signal, t.into,
          lazy?.onCellError
            ? (j, error) => { for (const col of t.into) lazy.onCellError!({ transformationIndex: tIndex, rowIndex: batch[j]!, column: col, error, origin: rowOrigin(rows[batch[j]!]) }); }
            : undefined),
      signal,
    );
    callIdx.forEach((i, k) => fill(i, replies[k], true));
    if (t.drop) for (const row of out) delete row[t.from];
    return out;
  }

  private async applyMutateLlm(
    rows: Row[],
    t: Extract<Transformation, { kind: 'mutate' }> & { value: { llm: string; model?: string } },
    tIndex: number,
    signal: AbortSignal | undefined,
    onChunk: ((u: ChunkUpdate) => void) | undefined,
    lazy?: LazyEvalOpts
  ): Promise<Row[]> {
    const cols = Array.isArray(t.columns) ? t.columns : [t.columns];
    const template = t.value.llm;
    const perCellModel = t.value.model;
    validateTemplate(template, rows);
    const exclude = cols;
    const batchSize = this.batchSize();
    const chunkSize = this.chunkSize();
    const out: Row[] = rows.map((r) => ({ ...r }));
    // #LazyExec — rows the cellFilter excludes never spend a model call:
    // a cell whose rendered prompt is already cached refills silently (this
    // is what makes undo/redo, resume, and provider re-replays free), the
    // rest get a pending sentinel. Batches form over the included rows only,
    // so a page-sized filter costs exactly one page of calls.
    const includedIdx: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (!lazy?.cellFilter || lazy.cellFilter(tIndex, i, rows[i]!)) { includedIdx.push(i); continue; }
      const key = this.cacheKey(perCellModel, renderPrompt(template, rows[i]!, exclude));
      const cached = this.cellResultCache.has(key) ? this.cellResultCache.get(key) : pendingCell();
      for (const c of cols) out[i]![c] = cached;
    }
    const batches: Array<{ idx: number[]; rows: Row[] }> = [];
    for (let i = 0; i < includedIdx.length; i += batchSize) {
      const idx = includedIdx.slice(i, i + batchSize);
      batches.push({ idx, rows: idx.map((r) => rows[r]!) });
    }
    for (let g = 0; g < batches.length; g += chunkSize) {
      abortIf(signal);
      const group = batches.slice(g, g + chunkSize);
      const groupResults = await Promise.all(
        group.map((b) =>
          this.evalLlmBatch(template, b.rows, perCellModel, signal, exclude,
            lazy?.onCellError
              ? (j, error) => { for (const c of cols) lazy.onCellError!({ transformationIndex: tIndex, rowIndex: b.idx[j]!, column: c, error, origin: rowOrigin(rows[b.idx[j]!]) }); }
              : undefined))
      );
      abortIf(signal);
      for (let gi = 0; gi < group.length; gi++) {
        const b = group[gi]!;
        const results = groupResults[gi]!;
        for (let j = 0; j < b.rows.length; j++) {
          const value = results[j];
          const rowIndex = b.idx[j]!;
          for (const c of cols) {
            const before = out[rowIndex]![c];
            out[rowIndex]![c] = value;
            // A failed cell keeps its sentinel out of the stream and samples —
            // the host learns about it through onCellError, not a chunk.
            if (isFailedCell(value)) continue;
            onChunk?.({ transformationIndex: tIndex, rowIndex, column: c, before, after: value });
            // Collect up to 3 before→after samples per column for debug info.
            let entry = this.cellSampleLog.find((s) => s.column === c);
            if (!entry) { entry = { column: c, samples: [] }; this.cellSampleLog.push(entry); }
            if (entry.samples.length < 3) entry.samples.push({ in: before, out: value });
          }
        }
      }
      // yield so a pending abort.abort() is observed before the next chunk starts.
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  }

  private cacheKey(perCellModel: string | undefined, prompt: string): string {
    return `${this.resolvedCellModelId(perCellModel)} ${prompt}`;
  }

  private batchSize(): number { return Math.max(1, this.opts.batchSize ?? DEFAULT_BATCH_SIZE); }
  private chunkSize(): number { return Math.max(1, this.opts.chunkSize ?? DEFAULT_CHUNK_SIZE); }

  /** The batch/chunk driver every `{llm}` cell site shares (spec/behavior.md
   *  § LLM cells): `items` split into batch-sized groups, `chunkSize` batches
   *  in flight, results concatenated back in input order. A `mutate` value
   *  drives the same two sizes itself because it also maps each batch's
   *  results onto row indices and streams them; a `sort` key and a `group`
   *  aggregate, which just need one value per item, come through here — so no
   *  slot can send a whole large table as one context-blowing request. */
  private async runCellBatches<T>(
    items: T[],
    evalBatch: (batch: T[]) => Promise<unknown[]>,
    signal: AbortSignal | undefined,
  ): Promise<unknown[]> {
    const size = this.batchSize();
    const chunk = this.chunkSize();
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
    const out: unknown[] = [];
    for (let g = 0; g < batches.length; g += chunk) {
      abortIf(signal);
      const results = await Promise.all(batches.slice(g, g + chunk).map((b) => evalBatch(b)));
      abortIf(signal);
      for (const r of results) out.push(...r);
    }
    return out;
  }

  private async evalLlmBatch(
    template: string,
    rows: Row[],
    perCellModel: string | undefined,
    signal?: AbortSignal,
    excludeColumns?: string[],
    onCellFail?: (rowIdx: number, error: string) => void
  ): Promise<unknown[]> {
    if (rows.length === 0) return [];
    const prompts = rows.map((r) => renderPrompt(template, r, excludeColumns));
    const results: unknown[] = new Array(rows.length);
    const pending: { idx: number; prompt: string }[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const key = this.cacheKey(perCellModel, prompts[i]!);
      if (this.cellResultCache.has(key)) results[i] = this.cellResultCache.get(key);
      else pending.push({ idx: i, prompt: prompts[i]! });
    }
    if (pending.length === 0) return results;
    let fetched: unknown[];
    if (!onCellFail) {
      fetched = await this.callLlmCells(pending.map((p) => p.prompt), perCellModel, signal);
    } else {
      // #LazyExec — failure capture: a batch call that errors falls back to
      // per-cell calls so one poisoned row fails alone; a per-cell error
      // becomes a failed sentinel (reported, uncached) instead of failing
      // the step. Cancellation still propagates.
      try {
        fetched = await this.callLlmCells(pending.map((p) => p.prompt), perCellModel, signal);
      } catch (e) {
        if (signal?.aborted || isCancelled(e)) throw e;
        fetched = await Promise.all(pending.map(async (p) => {
          try {
            return await this.callLlmCell(p.prompt, perCellModel, signal);
          } catch (cellErr) {
            if (signal?.aborted || isCancelled(cellErr)) throw cellErr;
            const message = (cellErr as Error).message;
            onCellFail(p.idx, message);
            return failedCell(message);
          }
        }));
      }
    }
    for (let k = 0; k < pending.length; k++) {
      results[pending[k]!.idx] = fetched[k];
      // Failed cells are never cached — a retry must call again.
      if (isFailedCell(fetched[k])) continue;
      this.cellResultCache.set(this.cacheKey(perCellModel, pending[k]!.prompt), fetched[k]);
    }
    return results;
  }

  private async callLlmCells(prompts: string[], perCellModel: string | undefined, signal?: AbortSignal): Promise<unknown[]> {
    if (prompts.length === 0) return [];
    if (prompts.length === 1) return [await this.callLlmCell(prompts[0]!, perCellModel, signal)];
    await rateLimiter.acquire(signal);
    const result = await generateText({
      model: this.cellModel(perCellModel),
      system: BATCH_SYSTEM_PROMPT,
      prompt: prompts.map((p, i) => `[${i + 1}]\n${p}`).join('\n\n---\n\n'),
      abortSignal: signal,
      ...this.samplingParams(this.resolvedCellModelId(perCellModel)),
      maxRetries: this.opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      providerOptions: ANTHROPIC_EPHEMERAL,
    });
    this.recordCall(this.resolvedCellModelId(perCellModel), result.usage);
    const parsed = tryParseBatchResponse(result.text ?? '', prompts.length);
    if (parsed) return parsed;
    return Promise.all(prompts.map((p) => this.callLlmCell(p, perCellModel, signal)));
  }

  private async callLlmCell(prompt: string, perCellModel: string | undefined, signal?: AbortSignal): Promise<unknown> {
    await rateLimiter.acquire(signal);
    const result = await generateText({
      model: this.cellModel(perCellModel),
      prompt,
      abortSignal: signal,
      ...this.samplingParams(this.resolvedCellModelId(perCellModel)),
      maxRetries: this.opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      providerOptions: ANTHROPIC_EPHEMERAL,
    });
    this.recordCall(this.resolvedCellModelId(perCellModel), result.usage);
    const text = (result.text ?? '').trim();
    // Only the literal lowercased word `null` is the null sentinel
    // (spec/behavior.md § LLM cells) — "NULL" and "Null" are legitimate answers
    // a case-insensitive compare would destroy.
    return text === '' || text === 'null' ? null : text;
  }
}

/** @internal — exported for unit tests. */
export function diffPlans(oldSpec: TablePlan, newSpec: TablePlan): PlanEdit[] {
  const items: PlanEdit[] = [];
  const oldIds = oldSpec.columns.map((c) => c.id);
  const newIds = newSpec.columns.map((c) => c.id);
  const oldSet = new Set(oldIds);
  const newSet = new Set(newIds);
  for (const id of newIds) if (!oldSet.has(id)) items.push({ kind: 'add-column', id });
  for (const id of oldIds) if (!newSet.has(id)) items.push({ kind: 'remove-column', id });
  const sameSet = oldIds.length === newIds.length && oldIds.every((id) => newSet.has(id));
  if (sameSet && oldIds.some((id, i) => id !== newIds[i])) {
    items.push({ kind: 'reorder-columns', from: oldIds, to: newIds });
  }
  const oldT = oldSpec.transformations;
  const newT = newSpec.transformations;
  let prefix = 0;
  while (prefix < oldT.length && prefix < newT.length && JSON.stringify(oldT[prefix]) === JSON.stringify(newT[prefix])) prefix++;
  for (let i = prefix; i < oldT.length; i++) items.push({ kind: 'remove-transformation', transformation: oldT[i] as Transformation });
  for (let i = prefix; i < newT.length; i++) items.push({ kind: 'add-transformation', transformation: newT[i] as Transformation });
  return items;
}

function exprToString(e: Expr): string {
  if ('js' in e) return e.js.trim();
  if ('sql' in e) return e.sql.trim();
  return e.llm.trim();
}

/** @internal — exported for unit tests. The primary expression(s) of a
 *  transformation, for the CLI debug block. Secondary fields such as a
 *  validate `message` are intentionally omitted. */
export function transformationExpressions(t: Transformation): Array<{ label: string; body: string }> {
  switch (t.kind) {
    case 'filter':
    case 'validate':
      return [{ label: 'pred', body: exprToString(t.pred) }];
    case 'mutate':
      return [{ label: 'value', body: exprToString(t.value) }];
    case 'join':
      return [{ label: 'on', body: exprToString(t.on) }];
    case 'sort':
      return [{ label: 'sort', body: t.by.map((b) => `${typeof b.key === 'string' ? b.key : exprToString(b.key)} ${b.dir}`).join(', ') }];
    case 'select':
      return [{ label: 'select', body: t.columns.join(', ') }];
    case 'group':
      return Object.entries(t.agg).map(([col, e]) => ({ label: `agg ${col}`, body: exprToString(e) }));
    case 'split':
      return [{ label: 'split on', body: t.on instanceof RegExp ? String(t.on) : typeof t.on === 'string' ? t.on : exprToString(t.on) }];
    case 'pivot':
    case 'unpivot':
      return [];
  }
}

// #PyExport
/** True if any transformation carries an `{llm}` expression. A live AI cell has
 *  no deterministic Python form, so the CLI's `:save-py` and the web Python
 *  export both refuse such a flow before spending a model call on it. */
export function specHasLlmCell(spec: TablePlan): boolean {
  const isLlm = (e: unknown): boolean =>
    typeof e === 'object' && e !== null && !(e instanceof RegExp) && 'llm' in e;
  for (const t of spec.transformations as Transformation[]) {
    const exprs: unknown[] = [];
    switch (t.kind) {
      case 'filter':                 exprs.push(t.pred); break;
      case 'validate':               exprs.push(t.pred); if (t.message) exprs.push(t.message); break;
      case 'mutate':                 exprs.push(t.value); break;
      case 'sort':                   for (const b of t.by) exprs.push(b.key); break;
      case 'group':                  exprs.push(...t.by, ...Object.values(t.agg)); break;
      case 'join':                   exprs.push(t.on); break;
      case 'split':                  exprs.push(t.on); break;
      case 'select': case 'pivot': case 'unpivot': break;
    }
    if (exprs.some(isLlm)) return true;
  }
  return false;
}

/** @internal — exported for unit tests. */
export function tryParseBatchResponse(text: string, expectedLen: number): unknown[] | undefined {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length !== expectedLen) return undefined;
    return parsed.map((v) => {
      if (v === null) return null;
      if (typeof v === 'string') {
        const t = v.trim();
        // Only the literal lowercased word — see callLlmCell.
        return t === '' || t === 'null' ? null : t;
      }
      return String(v);
    });
  } catch {
    return undefined;
  }
}

export function createHeadlessRunner(opts: HeadlessRunnerOptions = {}): HeadlessRunner {
  return new HeadlessRunnerImpl(opts);
}
