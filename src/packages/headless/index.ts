import { generateText, tool, stepCountIs, jsonSchema } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import jsonpatch, { type Operation } from 'fast-json-patch';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadCsv,
  loadJsonl,
  validateSpec,
  writeJsonl,
  type Row,
  type Spec,
  type Transformation,
} from '@tamedtable/core';

export type ChunkUpdate = {
  transformationIndex: number;
  rowIndex: number;
  column: string;
  before: unknown;
  after: unknown;
};

export interface RequestDebugTurn {
  ops: unknown[];
  outcome: string;
  sentBack?: string;
}

export interface RequestDebugInfo {
  userRequest: string;
  turns: RequestDebugTurn[];
}

export type PlanItem =
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
  onPlan?: (items: PlanItem[]) => void;
  signal?: AbortSignal;
}

export interface HeadlessRunner {
  loadInput(path: string): Promise<void>;
  request(text: string, options?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void }): Promise<void>;
  setSpec(spec: Spec): Promise<void>;
  currentRows(): Row[];
  currentSpec(): Spec;
  exportAs(path: string): Promise<void>;
}

const DEFAULT_MODEL = process.env.TAMEDTABLE_MODEL ?? 'claude-sonnet-4-6';
const DEFAULT_CELL_MODEL = process.env.TAMEDTABLE_CELL_MODEL ?? 'claude-sonnet-4-5';
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

function loadPrompts(): { SYSTEM_PROMPT: string; BATCH_SYSTEM_PROMPT: string; CELL_FORMAT_CONSTRAINT: string } {
  const text = readFileSync(PROMPT_FILE, 'utf-8');
  const sections = parsePromptSections(text);
  const required = ['SYSTEM_PROMPT', 'BATCH_SYSTEM_PROMPT', 'CELL_FORMAT_CONSTRAINT'] as const;
  for (const name of required) {
    if (!sections[name]) {
      throw new Error(`spec/prompt-app-edit.md: missing "## ${name}" section`);
    }
  }
  return {
    SYSTEM_PROMPT: sections.SYSTEM_PROMPT!,
    BATCH_SYSTEM_PROMPT: sections.BATCH_SYSTEM_PROMPT!,
    CELL_FORMAT_CONSTRAINT: sections.CELL_FORMAT_CONSTRAINT!,
  };
}

const { SYSTEM_PROMPT, BATCH_SYSTEM_PROMPT } = loadPrompts();

const PATCH_INPUT_SCHEMA = jsonSchema<{ operations: unknown[] }>({
  type: 'object',
  properties: {
    operations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
          path: { type: 'string' },
          from: { type: 'string' },
          value: {},
        },
        required: ['op', 'path'],
        additionalProperties: false,
      },
    },
  },
  required: ['operations'],
  additionalProperties: false,
});

const CANCELLED = 'Runner: cancelled';
const ANTHROPIC_EPHEMERAL = { anthropic: { cacheControl: { type: 'ephemeral' as const } } };

function abortIf(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new Error(CANCELLED);
}

function isCancelled(e: unknown): boolean {
  return (e as Error)?.message === CANCELLED;
}

function compileJs(body: string): (row: Row, i: number, rows: Row[]) => unknown {
  const src = body.trim();
  try {
    return new Function('row', 'i', 'rows', `return (${src});`) as (row: Row, i: number, rows: Row[]) => unknown;
  } catch (e) {
    throw new Error(`JS expression failed to compile: ${(e as Error).message} — body: ${src}`);
  }
}

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

// ── Pure transformations ────────────────────────────────────────────────────

function applyFilter(rows: Row[], t: Extract<Transformation, { kind: 'filter' }>): Row[] {
  if (!('js' in t.pred)) throw new Error('filter: LLM predicates not supported in V1');
  const fn = compileJs(t.pred.js);
  return rows.filter((row, i) => Boolean(fn(row, i, rows)));
}

function applySelect(rows: Row[], t: Extract<Transformation, { kind: 'select' }>): Row[] {
  return rows.map((row) => {
    const out: Row = {};
    for (const col of t.columns) out[col] = col in row ? row[col] : null;
    return out;
  });
}

function applySort(rows: Row[], t: Extract<Transformation, { kind: 'sort' }>): Row[] {
  const keys = t.by.map((b) =>
    typeof b.key === 'string'
      ? (row: Row) => row[b.key as string]
      : (compileJs((b.key as { js: string }).js) as (row: Row, i: number, rows: Row[]) => unknown)
  );
  const dirs = t.by.map((b) => (b.dir === 'desc' ? -1 : 1));
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      for (let k = 0; k < keys.length; k++) {
        const av = keys[k]!(a.row, a.i, rows) as number | string;
        const bv = keys[k]!(b.row, b.i, rows) as number | string;
        if (av < bv) return -dirs[k]!;
        if (av > bv) return dirs[k]!;
      }
      return 0;
    })
    .map((x) => x.row);
}

function applyMutateJs(rows: Row[], t: Extract<Transformation, { kind: 'mutate' }> & { value: { js: string } }): Row[] {
  const cols = Array.isArray(t.columns) ? t.columns : [t.columns];
  const fn = compileJs(t.value.js);
  return rows.map((row, i) => {
    const result = fn(row, i, rows);
    const out: Row = { ...row };
    if (cols.length === 1) out[cols[0]!] = result;
    else if (result && typeof result === 'object')
      for (const c of cols) out[c] = (result as Row)[c];
    return out;
  });
}

export function renderPrompt(template: string, row: Row, targetColumns?: string[]): string {
  return template.replace(/\{([^{}]+)\}/g, (_, col) => {
    if (col === '*') {
      const exclude = new Set(targetColumns ?? []);
      const obj: Row = {};
      for (const k of Object.keys(row)) if (!exclude.has(k)) obj[k] = row[k];
      return JSON.stringify(obj);
    }
    const v = row[col];
    return v === null || v === undefined ? '' : String(v);
  });
}

export function validateTemplate(template: string, rows: Row[]): void {
  if (rows.length === 0) return;
  const sample = rows[0]!;
  for (const m of template.matchAll(/\{([^{}]+)\}/g)) {
    const col = m[1]!;
    if (col === '*') continue;
    if (!(col in sample)) {
      throw new Error(`LLM template references column "${col}" which is not present in the data. Available columns: ${Object.keys(sample).join(', ')}.`);
    }
  }
}

// ── Prompt builders for the recovery loop ───────────────────────────────────

function buildPrompt(text: string, spec: Spec, errPrefix?: string): string {
  // The LLM edits transformations/columns/view-ops — never `table`. A long
  // absolute source path is prompt noise that derails the patch turn, so the
  // model only ever sees the basename.
  const llmSpec = spec.table ? { ...spec, table: basename(spec.table) } : spec;
  const specJson = JSON.stringify(llmSpec, null, 2);
  if (!errPrefix) return `Current spec:\n${specJson}\n\nUser request: ${text}`;
  return `${errPrefix}\n\nCurrent spec:\n${specJson}\n\nOriginal user request: ${text}\n\nEmit a corrected patch.`;
}

type PatchAttempt = { kind: 'ok'; spec: Spec } | { kind: 'err'; message: string };

function applyAndValidate(currentSpec: Spec, ops: unknown[]): PatchAttempt {
  try {
    if (ops.length === 0) {
      return { kind: 'err', message: 'You called apply_spec_patch with an empty operations array. Emit at least one operation that fulfills the user request.' };
    }
    const patched = jsonpatch.applyPatch(structuredClone(currentSpec), ops as Operation[], false, false).newDocument as unknown;
    const validated = validateSpec(patched);
    if (JSON.stringify(validated) === JSON.stringify(currentSpec)) {
      return { kind: 'err', message: 'Your patch applied cleanly but left the spec identical to before. Emit operations that actually modify the spec to fulfill the user request.' };
    }
    return { kind: 'ok', spec: validated };
  } catch (e) {
    return { kind: 'err', message: (e as Error).message };
  }
}

// ── Runner ─────────────────────────────────────────────────────────────────

class HeadlessRunnerImpl implements HeadlessRunner {
  private opts: HeadlessRunnerOptions;
  private sourceRows: Row[] = [];
  private sourcePath = '';
  private spec: Spec = { columns: [], transformations: [] };
  private derivedRows: Row[] = [];
  private modelCache: ReturnType<ReturnType<typeof createAnthropic>> | undefined;
  private cellModelCache: ReturnType<ReturnType<typeof createAnthropic>> | undefined;
  private providerCache: ReturnType<typeof createAnthropic> | undefined;
  private cellResultCache = new Map<string, unknown>();
  private loaded = false;
  private busy = false;

  constructor(opts: HeadlessRunnerOptions = {}) {
    this.opts = opts;
    if (opts.rpm) rateLimiter.setLimit(opts.rpm);
    if (process.env.TAMEDTABLE_RPM) rateLimiter.setLimit(Number(process.env.TAMEDTABLE_RPM));
  }

  private requireLoaded(): void {
    if (!this.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
  }

  private provider(): ReturnType<typeof createAnthropic> {
    if (this.providerCache) return this.providerCache;
    const apiKey = this.opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set. Export it in your shell or pass `apiKey` to createHeadlessRunner().');
    }
    const rawBase = this.opts.baseURL ?? process.env.ANTHROPIC_BASE_URL;
    const baseURL = rawBase
      ? rawBase.replace(/\/$/, '').endsWith('/v1')
        ? rawBase.replace(/\/$/, '')
        : `${rawBase.replace(/\/$/, '')}/v1`
      : 'https://api.anthropic.com/v1';
    this.providerCache = createAnthropic({ apiKey, baseURL });
    return this.providerCache;
  }

  private model(): ReturnType<ReturnType<typeof createAnthropic>> {
    return (this.modelCache ??= this.provider()(this.opts.model ?? DEFAULT_MODEL));
  }

  private cellModel(perCellModel?: string): ReturnType<ReturnType<typeof createAnthropic>> {
    if (perCellModel) return this.provider()(perCellModel);
    return (this.cellModelCache ??= this.provider()(this.opts.cellModel ?? DEFAULT_CELL_MODEL));
  }

  async loadInput(path: string): Promise<void> {
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
    let result: { spec: Spec; rows: Row[]; sourcePath: string };
    if (ext === '.csv') result = await loadCsv(path);
    else if (ext === '.jsonl') result = await loadJsonl(path);
    else throw new Error(`Runner: unknown file type: ${path}`);
    this.sourceRows = result.rows;
    this.sourcePath = result.sourcePath;
    this.spec = result.spec;
    this.derivedRows = result.rows.slice();
    this.cellResultCache.clear();
    this.loaded = true;
  }

  currentRows(): Row[] { this.requireLoaded(); return this.derivedRows; }
  currentSpec(): Spec { this.requireLoaded(); return this.spec; }

  async exportAs(path: string): Promise<void> {
    this.requireLoaded();
    if (!path.endsWith('.jsonl')) throw new Error(`exportAs: V1 only supports .jsonl, got ${path}`);
    await writeJsonl(path, this.derivedRows, this.spec.columns.map((c) => c.id));
  }

  async setSpec(spec: Spec): Promise<void> {
    const validated = validateSpec(spec);
    if (this.sourcePath) validated.table = this.sourcePath;
    const rows = await this.replay(validated, this.sourceRows, undefined, undefined);
    this.spec = validated;
    this.derivedRows = rows;
    this.loaded = true;
  }

  async request(
    text: string,
    callOpts: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onPlan?: (items: PlanItem[]) => void } = {}
  ): Promise<void> {
    this.requireLoaded();
    if (this.busy) throw new Error('Runner: a request is already in progress.');
    this.busy = true;
    const signal = callOpts.signal ?? this.opts.signal;
    const onChunk = callOpts.onChunk ?? this.opts.onChunk;
    const onPlan = callOpts.onPlan ?? this.opts.onPlan;
    const turns: RequestDebugTurn[] = [];
    try {
      const budget = this.opts.recoveryBudget ?? 3;
      let lastError: string | undefined;
      let prompt = buildPrompt(text, this.spec);
      for (let i = 0; i < budget; i++) {
        abortIf(signal);
        const ops = await this.callLlm(prompt, signal);
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

        if (onPlan) {
          const plan = computePlan(this.spec, tried.spec);
          if (plan.length) onPlan(plan);
        }

        try {
          const newRows = await this.replay(tried.spec, this.sourceRows, signal, onChunk);
          abortIf(signal);
          this.spec = tried.spec;
          this.derivedRows = newRows;
          turn.outcome = 'committed';
          return;
        } catch (e) {
          if (signal?.aborted || isCancelled(e)) throw new Error(CANCELLED);
          lastError = (e as Error).message;
          turn.outcome = `evaluation failed: ${lastError}`;
          turn.sentBack = `evaluation error: ${lastError}`;
          prompt = buildPrompt(text, this.spec, `Your previous patch applied but evaluation failed: ${lastError}`);
        }
      }
      const err = new Error(`Runner: recovery budget exhausted${lastError ? `; last error: ${lastError}` : ''}`);
      (err as Error & { debug?: RequestDebugInfo }).debug = { userRequest: text, turns };
      throw err;
    } finally {
      this.busy = false;
    }
  }

  private async callLlm(prompt: string, signal?: AbortSignal): Promise<unknown[]> {
    let captured: unknown[] | undefined;
    const applySpecPatch = tool({
      description: 'Apply RFC 6902 JSON Patch operations to the current spec.',
      inputSchema: PATCH_INPUT_SCHEMA,
      execute: async ({ operations }: { operations: unknown[] }) => {
        captured = operations;
        return { ok: true };
      },
    });
    await rateLimiter.acquire(signal);
    const result = await generateText({
      model: this.model(),
      system: SYSTEM_PROMPT,
      prompt,
      tools: { apply_spec_patch: applySpecPatch },
      toolChoice: { type: 'tool', toolName: 'apply_spec_patch' },
      stopWhen: stepCountIs(1),
      abortSignal: signal,
      temperature: 0,
      maxRetries: this.opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      providerOptions: ANTHROPIC_EPHEMERAL,
    });
    if (!captured) {
      const direct = result.toolCalls?.find((c) => c.toolName === 'apply_spec_patch');
      const ops = (direct?.input as { operations?: unknown[] } | undefined)?.operations;
      if (ops) captured = ops;
    }
    if (!captured) throw new Error(`LLM did not call apply_spec_patch; returned text: ${result.text?.slice(0, 200) ?? '<empty>'}`);
    return captured;
  }

  private async replay(
    spec: Spec,
    sourceRows: Row[],
    signal: AbortSignal | undefined,
    onChunk: ((u: ChunkUpdate) => void) | undefined
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
      abortIf(signal);
      rows = await this.applyT(rows, next[i] as Transformation, i, signal, onChunk);
    }
    return rows;
  }

  private async applyT(
    rows: Row[],
    t: Transformation,
    tIndex: number,
    signal: AbortSignal | undefined,
    onChunk: ((u: ChunkUpdate) => void) | undefined
  ): Promise<Row[]> {
    switch (t.kind) {
      case 'filter': return applyFilter(rows, t);
      case 'select': return applySelect(rows, t);
      case 'sort':   return applySort(rows, t);
      case 'mutate':
        if ('js' in t.value) return applyMutateJs(rows, t as typeof t & { value: { js: string } });
        return this.applyMutateLlm(rows, t as typeof t & { value: { llm: string; model?: string } }, tIndex, signal, onChunk);
    }
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
          }
        }
      }
      // yield so a pending abort.abort() is observed before the next chunk starts.
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  }

  private cacheKey(perCellModel: string | undefined, prompt: string): string {
    return `${perCellModel ?? this.opts.cellModel ?? DEFAULT_CELL_MODEL} ${prompt}`;
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
      temperature: 0,
      maxRetries: this.opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      providerOptions: ANTHROPIC_EPHEMERAL,
    });
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
      temperature: 0,
      maxRetries: this.opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      providerOptions: ANTHROPIC_EPHEMERAL,
    });
    const text = (result.text ?? '').trim();
    return text === '' || text.toLowerCase() === 'null' ? null : text;
  }
}

/** @internal — exported for unit tests. */
export function computePlan(oldSpec: Spec, newSpec: Spec): PlanItem[] {
  const items: PlanItem[] = [];
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
