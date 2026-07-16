import { generateText, tool, stepCountIs, jsonSchema } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { providerFor, acceptsTemperature } from '@tamedtable/model-config';
import jsonpatch, { type Operation } from 'fast-json-patch';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadCsv,
  loadFile,
  loadJsonl,
  validateTablePlan,
  writeRows,
  type Expr,
  type Row,
  type TablePlan,
  type Transformation,
} from '@tamedtable/core';

export { SpecJournal, type JournalEntry, type TimelineStep } from './journal.ts';
export { renderPrompt, validateTemplate, parseLlmParts, isCancelled } from './engine.ts';
import {
  CANCELLED,
  abortIf,
  isCancelled,
  compileJs,
  syncColumnsToRows,
  applyFilter,
  applySelect,
  applyMutateJs,
  applyValidateJs,
  applyGroupJs,
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
 *  its kind, its describeStep label, and the row count entering it. Steps a
 *  replay skips (the unchanged-prefix reuse) are not reported. */
export type StepUpdate = { index: number; total: number; kind: string; label: string; rows: number };

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
 *  flow-run dialog's status line and log so each step names its target and
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
      return `join ${t.with}`;
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

export interface HeadlessRunnerOptions {
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
  signal?: AbortSignal;
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

/** Spoken audio riding along on the patch turn (web voice input). When set,
 *  every patch-turn call in the request sends the audio as a file part next
 *  to the prompt text; `text` carries the instructions and table context. */
export type RequestAudio = { data: Uint8Array; mediaType: string };

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
  request(text: string, options?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void; audio?: RequestAudio; onTranscript?: (text: string) => void }): Promise<void>;
  /** Replace the spec, replaying its transformations onto the loaded source
   *  rows. Accepts the same streaming/abort options a request carries plus
   *  `onStep`, which fires as each transformation starts — so a replayed
   *  flow streams, reports progress, and can be cancelled (the Open & run
   *  flow path); aborting throws `Runner: cancelled` with the previous spec
   *  and rows untouched. */ // #OpenFlow
  setSpec(spec: TablePlan, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void }): Promise<void>;
  currentRows(): Row[];
  currentSpec(): TablePlan;
  exportAs(path: string): Promise<void>;
  /** One model call: translate the current flow into a standalone
   *  Python script. Returns the script source. */
  exportPython(): Promise<string>;
}

// #ConfigEnv
const DEFAULT_MODEL = process.env.TAMEDTABLE_MODEL ?? 'gemini-3.5-flash';
const DEFAULT_CELL_MODEL = process.env.TAMEDTABLE_CELL_MODEL ?? 'gemini-3.1-flash-lite';

// Per-provider fallbacks for per-row cell calls when the configured cell
// model belongs to a different provider than the main model. Cell calls are
// text-only and must share the main model's provider, so a cross-provider cell
// model is coerced to that provider's text default rather than used blindly.
const PROVIDER_CELL_FALLBACKS: Record<ReturnType<typeof providerFor>, string> = {
  gemini: DEFAULT_CELL_MODEL,
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-5.4-mini',
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
const DEFAULT_RPM = Number(process.env.TAMEDTABLE_RPM ?? 40);
const DEFAULT_CHUNK_SIZE = Number(process.env.TAMEDTABLE_CHUNK_SIZE ?? 5);
const DEFAULT_BATCH_SIZE = Number(process.env.TAMEDTABLE_BATCH_SIZE ?? 20);

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
 *  transformation's `query` provenance stripped. The model neither reads nor
 *  edits the metadata, and stripping keeps patch-turn and Python-export
 *  prompts byte-identical to a spec that never carried it — so recorded
 *  cassettes keep replaying. */
export function stripQueryMetadata(spec: TablePlan): TablePlan {
  const transformations = spec.transformations as Transformation[];
  if (!transformations.some((t) => 'query' in t)) return spec;
  return {
    ...spec,
    transformations: transformations.map(({ query: _query, ...t }) => t as Transformation),
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
    if (JSON.stringify(validated) === JSON.stringify(currentSpec)) {
      return { kind: 'err', message: 'Your patch applied cleanly but left the spec identical to before. Emit operations that actually modify the spec to fulfill the user request.' };
    }
    return { kind: 'ok', spec: validated };
  } catch (e) {
    return { kind: 'err', message: (e as Error).message };
  }
}

// #Patch
/** @internal — exported for unit tests. Stamp `query` provenance on every
 *  transformation the committed turn added or changed — any transformation
 *  whose JSON has no identical counterpart in the pre-request spec. A step
 *  untouched by the turn keeps its earlier stamp (its JSON, stamp included,
 *  matches `before`); a step the patch rewrote is restamped with the latest
 *  request. */
export function stampQueries(spec: TablePlan, before: TablePlan, query: string): TablePlan {
  const prior = new Set(before.transformations.map((t) => JSON.stringify(t)));
  return {
    ...spec,
    transformations: (spec.transformations as Transformation[]).map((t) =>
      prior.has(JSON.stringify(t)) ? t : { ...t, query }
    ),
  };
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
 *  columns, columns created by transformations ordered before it, and the
 *  reserved `_valid`/`_validation` pair. Walks the transformation list
 *  tracking the available columns; `join` and `pivot` add columns that can't
 *  be enumerated statically, so they suspend the check for later steps.
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
        available.add('_valid');
        available.add('_validation');
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
        available = new Set<string>();
        t.by.forEach((b, i) => available.add(typeof b === 'string' ? b : `key_${i + 1}`));
        for (const k of Object.keys(t.agg)) available.add(k);
        unknowable = false;
        break;
      }
      case 'unpivot':
        available = new Set([...t.id, t.names_to ?? 'name', t.values_to ?? 'value']);
        unknowable = false;
        break;
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
        available = new Set<string>();
        t.by.forEach((b, bi) => available.add(typeof b === 'string' ? b : `key_${bi + 1}`));
        for (const k of Object.keys(t.agg)) available.add(k);
        unknowable = false;
        break;
      }
      case 'unpivot':
        available = new Set([...t.id, t.names_to ?? 'name', t.values_to ?? 'value']);
        unknowable = false;
        break;
      case 'pivot':
        available = new Set(t.index);
        unknowable = true; // one column per distinct on-value — data-dependent
        break;
      case 'join':
        unknowable = true; // right-table columns aren't known without reading it
        break;
      case 'validate':
        available.add('_valid');
        available.add('_validation');
        break;
      case 'filter':
      case 'sort':
        break;
    }
  }
  return undefined;
}

// ── Runner ─────────────────────────────────────────────────────────────────

class HeadlessRunnerImpl implements HeadlessRunner {
  private opts: HeadlessRunnerOptions;
  private sourceRows: Row[] = [];
  private sourcePath = '';
  private spec: TablePlan = { columns: [], transformations: [] };
  private derivedRows: Row[] = [];
  // Lookup tables staged by name (browser joins): a `join` whose `with` matches
  // a key here uses these rows instead of reading the file by path.
  private lookupTables = new Map<string, Row[]>();
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

  private recordCall(model: string, usage: { inputTokens?: number; outputTokens?: number } | undefined): void {
    this.callLog.push({
      model,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
    });
  }

  // #DebugOut
  private buildDebugInfo(
    userRequest: string,
    turns: RequestDebugTurn[],
    expressions: Array<{ label: string; body: string }>,
    elapsedMs: number
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
    const detected = providerFor(modelId);

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
    this.sourcePath = sourcePath;
    this.spec = spec;
    this.derivedRows = rows.slice();
    this.cellResultCache.clear();
    // Reset the DuckDB relation so SQL transformations see the new source.
    await this.sql.resetTable();
    this.loaded = true;
  }

  currentRows(): Row[] { this.requireLoaded(); return this.derivedRows; }
  currentSpec(): TablePlan { this.requireLoaded(); return this.spec; }

  async exportAs(filePath: string): Promise<void> {
    this.requireLoaded();
    await writeRows(filePath, this.derivedRows, this.spec.columns.map((c) => c.id));
  }

  // #PyExport
  async exportPython(): Promise<string> {
    this.requireLoaded();
    // Same trims as a patch turn: basename-only table, no query provenance.
    const spec = stripQueryMetadata(this.spec);
    const llmSpec = spec.table ? { ...spec, table: basename(spec.table) } : spec;
    const prompt = `Translate this TamedTable flow into a standalone Python 3 script.\n\nSpec:\n${JSON.stringify(llmSpec, null, 2)}`;
    await rateLimiter.acquire();
    const result = await generateText({
      model: this.model(),
      system: PYTHON_EXPORT_PROMPT,
      prompt,
      ...this.samplingParams(this.opts.model ?? DEFAULT_MODEL),
      maxRetries: this.opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      providerOptions: ANTHROPIC_EPHEMERAL,
    });
    let text = (result.text ?? '').trim();
    // Strip a stray markdown fence if the model wrapped the code in one.
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:python)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    }
    if (!text) throw new Error('Python export: the model returned no script.');
    return text.endsWith('\n') ? text : text + '\n';
  }

  async setSpec(
    spec: TablePlan,
    opts: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void } = {},
  ): Promise<void> {
    const validated = validateTablePlan(spec);
    if (this.sourcePath) validated.table = this.sourcePath;
    const rows = await this.replay(validated, this.sourceRows, opts.signal, opts.onChunk, opts.onStep);
    this.spec = syncColumnsToRows(validated, rows);
    this.derivedRows = rows;
    this.loaded = true;
  }

  // #MainLoop
  async request(
    text: string,
    callOpts: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void; onPlanEdits?: (items: PlanEdit[]) => void; audio?: RequestAudio; onTranscript?: (text: string) => void } = {}
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
        const llmTurn = await this.callLlm(prompt, signal, callOpts.audio);
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
        const orderError = this.sourceRows.length
          ? checkValidateColumnOrder(tried.spec, Object.keys(this.sourceRows[0]!))
          : undefined;
        if (orderError) {
          turn.outcome = 'rejected';
          turn.sentBack = orderError;
          lastError = orderError;
          prompt = buildPrompt(text, this.spec, `Your previous patch failed: ${orderError}`);
          continue;
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
          const newRows = await this.replay(tried.spec, this.sourceRows, signal, onChunk, callOpts.onStep);
          abortIf(signal);
          this.spec = stampQueries(syncColumnsToRows(tried.spec, newRows), specBefore, queryText);
          this.derivedRows = newRows;
          turn.outcome = 'committed';
          const expressions = diffPlans(specBefore, this.spec)
            .filter((p): p is Extract<PlanEdit, { kind: 'add-transformation' }> => p.kind === 'add-transformation')
            .flatMap((p) => transformationExpressions(p.transformation));
          this.opts.onDebug?.(this.buildDebugInfo(text, turns, expressions, Date.now() - startedAt));
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
      this.opts.onDebug?.(info);
      throw err;
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
    this.recordCall(this.opts.model ?? DEFAULT_MODEL, result.usage);
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
    onStep?: (u: StepUpdate) => void
  ): Promise<Row[]> {
    const prev = this.spec.transformations;
    const next = spec.transformations;
    const reuseDerivedAsPrefix =
      next.length >= prev.length &&
      this.derivedRows.length > 0 &&
      prev.every((p, i) => JSON.stringify(p) === JSON.stringify(next[i]));

    let rows: Row[];
    let start: number;
    if (reuseDerivedAsPrefix) {
      rows = this.derivedRows.map((r) => ({ ...r }));
      start = prev.length;
    } else {
      rows = sourceRows.map((r) => ({ ...r }));
      start = 0;
    }
    for (let i = start; i < next.length; i++) {
      // Report the step before the abort check, so a cancel fired from inside
      // the onStep callback stops the replay before the step runs.
      const t = next[i] as Transformation;
      onStep?.({ index: i, total: next.length, kind: t.kind, label: describeStep(t), rows: rows.length });
      abortIf(signal);
      rows = await this.applyT(rows, next[i] as Transformation, i, signal, onChunk);
    }
    return rows;
  }

  // #StepExec
  private async applyT(
    rows: Row[],
    t: Transformation,
    tIndex: number,
    signal: AbortSignal | undefined,
    onChunk: ((u: ChunkUpdate) => void) | undefined
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
        return this.applyMutateLlm(rows, t as typeof t & { value: { llm: string; model?: string } }, tIndex, signal, onChunk);
      case 'validate': return applyValidateJs(rows, t);
      case 'group':    return this.applyGroup(rows, t, tIndex, signal, onChunk);
      case 'split':    return this.applySplitT(rows, t, signal);
      case 'pivot':    return applyPivot(rows, t);
      case 'unpivot':  return applyUnpivot(rows, t);
      case 'join':     return applyJoin(rows, t, this.sourcePath ? dirname(this.sourcePath) : process.cwd(), this.lookupTables);
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
    // the same batching/caching path a mutate LLM column uses.
    validateTemplate(key.llm, rows);
    return this.evalLlmBatch(key.llm, rows, key.model, signal, undefined);
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
    // Numeric-aware compare: a pair of numbers or numeric strings orders by
    // magnitude ("2" before "10"), any other pair by the relational operators.
    const asNumber = (v: unknown): number | null => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
      return null;
    };
    indices.sort((ai, bi) => {
      for (let k = 0; k < keyColumns.length; k++) {
        let av = keyColumns[k]![ai] as number | string;
        let bv = keyColumns[k]![bi] as number | string;
        const an = asNumber(av);
        const bn = asNumber(bv);
        if (an !== null && bn !== null) {
          av = an;
          bv = bn;
        }
        if (av < bv) return -dirs[k]!;
        if (av > bv) return dirs[k]!;
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
    const byNames = t.by.map((b, i) => typeof b === 'string' ? b : `key_${i + 1}`);

    // LLM aggregates: pre-render one prompt per (group, llm-agg) cell — {*}
    // expands to the group's compact JSON — and run them through the cell
    // model in one pass so batch packing and result caching still apply.
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
      llmResults = await this.callLlmCells(prompts, llmAggCols[0]?.[1].model, signal);
    }

    // Emit one output row per group. JS aggregates run a compiled function
    // over the group's slice; {sql} aggregates run a real GROUP BY-style
    // query per group through DuckDB with the slice registered as relation `g`.
    const out: Row[] = [];
    for (let gi = 0; gi < order.length; gi++) {
      abortIf(signal);
      const { keyTuple, slice } = groups.get(order[gi]!)!;
      const row: Row = {};
      byNames.forEach((name, i) => { row[name] = keyTuple[i] ?? null; });
      let llmIdx = 0;
      for (const [outCol, expr] of Object.entries(t.agg)) {
        if ('js' in expr) {
          const fn = new Function('rows', `return (${expr.js.trim()});`) as (s: Row[]) => unknown;
          row[outCol] = fn(slice);
        } else if ('sql' in expr) {
          row[outCol] = await this.sql.evalSqlAgg(slice, expr.sql, signal);
        } else {
          row[outCol] = llmResults[gi * llmAggCols.length + llmIdx];
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
    signal: AbortSignal | undefined
  ): Promise<Row[]> {
    if (typeof t.on === 'object' && !(t.on instanceof RegExp) && 'llm' in t.on) {
      return this.applySplitLlm(rows, t as typeof t & { on: { llm: string; model?: string } }, signal);
    }
    return applySplit(rows, t);
  }

  /** LLM-backed split: render the {llm} `on` template per row, ask the
   *  cell model to break the cell into parts, then pad/concat to `into`'s
   *  arity exactly as a literal or regex split would. */
  private async applySplitLlm(
    rows: Row[],
    t: Extract<Transformation, { kind: 'split' }> & { on: { llm: string; model?: string } },
    signal: AbortSignal | undefined
  ): Promise<Row[]> {
    validateTemplate(t.on.llm, rows);
    const replies = await Promise.all(
      rows.map((row) => {
        const cell = row[t.from];
        if (cell === null || cell === undefined || cell === '') return Promise.resolve(null);
        return this.callLlmCell(renderPrompt(t.on.llm, row), t.on.model, signal);
      })
    );
    return rows.map((row, i) => {
      const out: Row = { ...row };
      const reply = replies[i];
      const parts = reply === null || reply === undefined
        ? t.into.map(() => null)
        : padParts(parseLlmParts(String(reply)), t.into);
      t.into.forEach((col, idx) => { out[col] = parts[idx] ?? null; });
      if (t.drop) delete out[t.from];
      return out;
    });
  }

  private async applyMutateLlm(
    rows: Row[],
    t: Extract<Transformation, { kind: 'mutate' }> & { value: { llm: string; model?: string } },
    tIndex: number,
    signal: AbortSignal | undefined,
    onChunk: ((u: ChunkUpdate) => void) | undefined
  ): Promise<Row[]> {
    const cols = Array.isArray(t.columns) ? t.columns : [t.columns];
    const template = t.value.llm;
    const perCellModel = t.value.model;
    validateTemplate(template, rows);
    const exclude = cols;
    const batchSize = Math.max(1, this.opts.batchSize ?? DEFAULT_BATCH_SIZE);
    const chunkSize = Math.max(1, this.opts.chunkSize ?? DEFAULT_CHUNK_SIZE);
    const out: Row[] = rows.map((r) => ({ ...r }));
    const batches: Array<{ start: number; rows: Row[] }> = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      batches.push({ start: i, rows: rows.slice(i, i + batchSize) });
    }
    for (let g = 0; g < batches.length; g += chunkSize) {
      abortIf(signal);
      const group = batches.slice(g, g + chunkSize);
      const groupResults = await Promise.all(
        group.map((b) => this.evalLlmBatch(template, b.rows, perCellModel, signal, exclude))
      );
      abortIf(signal);
      for (let gi = 0; gi < group.length; gi++) {
        const b = group[gi]!;
        const results = groupResults[gi]!;
        for (let j = 0; j < b.rows.length; j++) {
          const value = results[j];
          const rowIndex = b.start + j;
          for (const c of cols) {
            const before = out[rowIndex]![c];
            out[rowIndex]![c] = value;
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

  private async evalLlmBatch(
    template: string,
    rows: Row[],
    perCellModel: string | undefined,
    signal?: AbortSignal,
    excludeColumns?: string[]
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
    const fetched = await this.callLlmCells(pending.map((p) => p.prompt), perCellModel, signal);
    for (let k = 0; k < pending.length; k++) {
      results[pending[k]!.idx] = fetched[k];
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
    return text === '' || text.toLowerCase() === 'null' ? null : text;
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
        return t === '' || t.toLowerCase() === 'null' ? null : t;
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
