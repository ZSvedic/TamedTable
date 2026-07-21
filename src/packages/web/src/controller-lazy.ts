// #LazyExec
// Page-first AI execution — the web shell's scheduling policy over the
// eager engine (spec/behavior.md § Lazy AI execution, code-contract.md §
// Lazy AI execution). The engine leaves skipped {llm} cells holding pending
// sentinels and failed calls holding failed sentinels; row state derives
// from the data itself, so it survives deterministic reshaping, undo/redo,
// and engine rebuilds. This manager owns:
//   - the sentinel scan (readout, pager marks, row status),
//   - the evaluation queue (opening a page evaluates exactly its lagging
//     rows; never more than one page of AI calls in flight),
//   - run-on-all / save / retry, the estimate dialog, and its progress feed,
//   - the dependency rule's confirmation at patch commit.
import {
  isFailedCell,
  isPendingCell,
  specHasLlmCell,
  type ChunkUpdate,
} from '@tamedtable/headless';
import type { Row, TablePlan, Transformation, Expr } from '@tamedtable/core';
import { ALL_MODELS } from '@tamedtable/model-config';
import type { ControllerHost } from './controller-context.ts';
import type { RunProgress } from './controller-types.ts';

// Estimates — honest extrapolations of the evaluated preview
// (code-contract.md § Lazy AI execution).
export interface RunEstimate {
  rowsRemaining: number;
  estTokens: number;
  estUsd: number;
  estSeconds: number;
}

// Row state — one entry per derived row (code-contract.md § Lazy AI
// execution). Derived from the pending/failed cell sentinels, so it survives
// deterministic reshaping and engine rebuilds.
export type RowStatus = 'evaluated' | 'pending' | 'failed';
export interface RowState {
  applied: number;
  status: RowStatus;
  error?: string;
}

/** Why the run-all confirmation is showing — picks the dialog's copy. */
export type RunAllReason = 'run-all' | 'save' | 'dependency' | 'sort' | 'filter';

/** How the dialog resolved: run everything, apply over the evaluated rows
 *  only (the column-menu gates' middle choice), or leave things unchanged. */
export type RunAllChoice = 'run' | 'partial' | 'skip';

export interface RunAllDialogState {
  estimate: RunEstimate;
  reason: RunAllReason;
}

interface Scan {
  rowsRef: Row[];
  pending: Set<number>;
  /** Rows with a failed sentinel → the failure message. */
  failed: Map<number, string>;
}

const EMPTY_SCAN: Omit<Scan, 'rowsRef'> = { pending: new Set(), failed: new Map() };

export class LazyManager {
  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  // Failed rows the manager knows about beyond the sentinels — re-marked
  // after a pass that excluded them (their cells would otherwise read
  // pending). Cleared whenever the spec changes.
  private failedInfo = new Map<number, { column: string; error: string }>();

  // Serialized evaluation queue — page opens never overlap.
  private queue: Promise<void> = Promise.resolve();
  private runAbort: AbortController | null = null;

  // Estimate accumulators: cell-model token usage and observed throughput.
  private cellTokensIn = 0;
  private cellTokensOut = 0;
  private cellCalls = 0;
  private callMs = 0;
  private callRows = 0;

  // One-shot widening of the cell filter — set when the user confirms a
  // dependency-rule run-all, read by the request's cellFilter.
  private allowAllOnce = false;

  private dialogResolve: ((choice: RunAllChoice) => void) | null = null;

  private scanCache: Scan | null = null;

  // ── Row state (derived from sentinels — see the header) ──────────────────

  private scan(): Omit<Scan, 'rowsRef'> {
    if (!this.host.loaded) return EMPTY_SCAN;
    const rows = this.host.engine.rawRows();
    if (this.scanCache && this.scanCache.rowsRef === rows) return this.scanCache;
    const pending = new Set<number>();
    const failed = new Map<number, string>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      for (const k of Object.keys(row)) {
        const v = row[k];
        if (isPendingCell(v)) {
          const info = this.failedInfo.get(i);
          if (info) failed.set(i, info.error);
          else pending.add(i);
          break;
        }
        if (isFailedCell(v)) {
          failed.set(i, v.__ttFailed);
          break;
        }
      }
    }
    this.scanCache = { rowsRef: rows, pending, failed };
    return this.scanCache;
  }

  /** Drop the memoized scan (rows changed in place, e.g. re-marked failures). */
  private invalidateScan(): void {
    this.scanCache = null;
  }

  pendingCount(): number {
    return this.scan().pending.size;
  }

  failedCount(): number {
    return this.scan().failed.size;
  }

  /** The pagination-bar readout — null hides it (no AI step, or nothing
   *  pending and nothing failed). */
  evaluatedReadout(): { done: number; total: number; failed: number } | null {
    if (!this.host.loaded || !specHasLlmCell(this.host.engine.displaySpec())) return null;
    const { pending, failed } = this.scan();
    if (pending.size === 0 && failed.size === 0) return null;
    const total = this.host.engine.rawRows().length;
    return { done: total - pending.size - failed.size, total, failed: failed.size };
  }

  /** 1-based view pages that contain pending (or failed) rows — pager dots. */
  pendingPages(): number[] {
    const { pending, failed } = this.scan();
    if (pending.size === 0 && failed.size === 0) return [];
    const order = this.host.view.viewOrder(this.host.engine.rawRows());
    const pages = new Set<number>();
    for (let pos = 0; pos < order.length; pos++) {
      const i = order[pos]!;
      if (pending.has(i) || failed.has(i)) pages.add(Math.floor(pos / this.host.pageSize) + 1);
    }
    return [...pages].sort((a, b) => a - b);
  }

  /** Row state, one entry per derived row (code-contract § Lazy AI
   *  execution): the spec-step prefix applied, the derived status, and the
   *  failure message for failed rows. */
  rowStates(): readonly RowState[] {
    const rows = this.host.engine.rawRows();
    const spec = this.host.engine.displaySpec();
    const specLen = spec.transformations.length;
    const firstLlm = (spec.transformations as Transformation[]).findIndex(
      (t) =>
        (t.kind === 'mutate' && typeof t.value === 'object' && t.value !== null && 'llm' in t.value) ||
        (t.kind === 'split' && typeof t.on === 'object' && t.on !== null && !(t.on instanceof RegExp) && 'llm' in t.on),
    );
    const { pending, failed } = this.scan();
    return rows.map((_, i) => {
      const error = failed.get(i);
      if (error !== undefined) return { applied: Math.max(0, firstLlm), status: 'failed' as const, error };
      if (pending.has(i)) return { applied: Math.max(0, firstLlm), status: 'pending' as const };
      return { applied: specLen, status: 'evaluated' as const };
    });
  }

  /** Evaluate exactly these derived rows' lagging cells (code-contract §
   *  Lazy AI execution) — cached cells refill free, the rest spend calls. */
  async evaluateRows(indices: number[], signal?: AbortSignal): Promise<void> {
    await this.settle();
    await this.evaluatePass(new Set(indices), { signal });
  }

  /** Status of one derived row — drives the grid's Row # cell marks. */
  rowStatus(derivedIndex: number): 'pending' | 'failed' | 'evaluated' {
    const { pending, failed } = this.scan();
    if (failed.has(derivedIndex)) return 'failed';
    if (pending.has(derivedIndex)) return 'pending';
    return 'evaluated';
  }

  /** Failure message for a failed row, or null. */
  rowError(derivedIndex: number): string | null {
    return this.scan().failed.get(derivedIndex) ?? null;
  }

  // ── Usage accounting (EngineManager forwards the runner's onUsage) ───────

  /** Total cell-model calls made so far — tests assert redo/resume make none. */
  cellCallCount(): number {
    return this.cellCalls;
  }

  /** Fold one call-making evaluation window into the throughput observation
   *  (the estimate's rows-per-second). The engine reports the request
   *  preview's window; evaluation passes report their own. `chunks` is the
   *  raw chunk count — divided by the spec's per-row chunk factor here. */
  recordTiming(elapsedMs: number, chunks: number): void {
    const rows = chunks / this.chunkFactor();
    if (rows <= 0 || elapsedMs <= 0) return;
    this.callMs += elapsedMs;
    this.callRows += rows;
  }

  recordUsage(u: { model: string; inputTokens: number; outputTokens: number }): void {
    // Patch-turn calls use the primary model; everything else is cell work.
    if (u.model === this.host.config.model) return;
    this.cellTokensIn += u.inputTokens;
    this.cellTokensOut += u.outputTokens;
    this.cellCalls++;
  }

  /** The estimate for evaluating everything still pending or failed, or null
   *  when nothing remains. Extrapolated from the evaluated preview: mean
   *  cell tokens per evaluated row × rows remaining, priced at the cell
   *  model's catalogue rates, timed from observed rows per second. */
  runEstimate(): RunEstimate | null {
    const { pending, failed } = this.scan();
    const rowsRemaining = pending.size + failed.size;
    if (rowsRemaining === 0) return null;
    const total = this.host.engine.rawRows().length;
    const evaluated = Math.max(1, total - rowsRemaining);
    const perRowIn = this.cellTokensIn / evaluated;
    const perRowOut = this.cellTokensOut / evaluated;
    const price = ALL_MODELS.find((m) => this.host.config.cellModel.startsWith(m.id));
    const estUsd =
      ((perRowIn * rowsRemaining) / 1e6) * (price?.inUsdPerMtok ?? 0) +
      ((perRowOut * rowsRemaining) / 1e6) * (price?.outUsdPerMtok ?? 0);
    const rowsPerSec = this.callMs > 0 ? this.callRows / (this.callMs / 1000) : 0;
    return {
      rowsRemaining,
      estTokens: Math.round((perRowIn + perRowOut) * rowsRemaining),
      estUsd,
      estSeconds: rowsPerSec > 0 ? rowsRemaining / rowsPerSec : 0,
    };
  }

  // ── The chat request's lazy window + the dependency rule ─────────────────

  /** The cellFilter for a chat request: the rows in view (everything already
   *  evaluated refills from the cell cache for free). After a confirmed
   *  dependency run-all, one replay runs unfiltered. */
  requestCellFilter(): (tIndex: number, rowIndex: number) => boolean {
    const target = this.visibleTarget();
    return (_t, i) => this.allowAllOnce || this.host.config.alwaysRunAll || target.has(i);
  }

  /** Derived-row indices of the current page (the preview window). */
  private visibleTarget(): Set<number> {
    const rows = this.host.engine.rawRows();
    const order = this.host.view.viewOrder(rows);
    const page = Math.max(1, this.host.pageNum);
    const start = (page - 1) * this.host.pageSize;
    return new Set(order.slice(start, start + this.host.pageSize));
  }

  /** The gates at patch commit. Simple mode ("Always run on all rows"): a
   *  new AI step that would run more than one page shows the estimate dialog
   *  first. Otherwise the dependency rule: a new step that reads an AI-made
   *  column across all rows while rows are pending raises the run-all
   *  confirmation. Confirm → this replay runs on all rows; decline → the
   *  runner throws DECLINED and the patch is dropped. */
  async confirmPatch(next: TablePlan, prev: TablePlan): Promise<boolean> {
    if (this.host.config.alwaysRunAll) {
      const added = { columns: [], transformations: next.transformations.slice(prev.transformations.length) };
      const total = this.host.engine.rawRows().length;
      if (specHasLlmCell(added) && total > this.host.pageSize) {
        return (await this.askRunAll('run-all', total)) === 'run';
      }
      return true;
    }
    if (this.pendingCount() + this.failedCount() === 0) return true;
    if (!newStepsReadAiColumns(prev, next)) return true;
    const ok = (await this.askRunAll('dependency')) === 'run';
    if (ok) this.allowAllOnce = true;
    return ok;
  }

  /** Called by the engine when a request settles (commit or not). */
  requestSettled(): void {
    this.allowAllOnce = false;
    this.failedInfo.clear();
    this.invalidateScan();
  }

  // ── Scheduling: opening a page evaluates its lagging rows ────────────────

  /** Queue an evaluation of the current page's pending rows. Fire-and-forget
   *  from goToPage; `settle()` awaits the queue. */
  scheduleVisible(): void {
    this.queue = this.queue.then(() => this.evaluateVisible()).catch(() => {});
  }

  /** Await all queued evaluation work (tests and the save path). */
  async settle(): Promise<void> {
    await this.queue;
  }

  private async evaluateVisible(): Promise<void> {
    if (!this.host.loaded || this.host.streaming) return;
    const { pending } = this.scan();
    if (pending.size === 0) return;
    const target = new Set([...this.visibleTarget()].filter((i) => pending.has(i)));
    if (target.size === 0) return;
    await this.evaluatePass(target);
  }

  /** Chunks emitted per fully-evaluated row: one per {llm}-mutate target
   *  column across the spec. Divides raw chunk counts into row counts, so a
   *  two-AI-column spec never reports "2,282 / 1,382 rows done". */
  private chunkFactor(): number {
    let factor = 0;
    for (const t of this.host.engine.displaySpec().transformations as Transformation[]) {
      if (t.kind === 'mutate' && typeof t.value === 'object' && t.value !== null && 'llm' in t.value) {
        factor += Array.isArray(t.columns) ? t.columns.length : 1;
      }
    }
    return Math.max(1, factor);
  }

  /** One evaluation pass: replay the current spec fresh with the cell filter
   *  set to `target` (cached cells refill everywhere for free), capturing
   *  per-cell failures. Re-marks failures the pass did not retry. While it
   *  makes calls the shell streams: the banner shows and each landed chunk
   *  paints onto the display overlay, so an opening page fills in live. */
  private async evaluatePass(
    target: Set<number>,
    opts: { signal?: AbortSignal; feed?: RunProgress } = {},
  ): Promise<void> {
    const runner = this.host.engine.ensureHeadless();
    const spec = structuredClone(runner.currentSpec());
    // #LazyExec — snapshot the rows this pass starts from, so recordFilled can
    // diff exactly what it filled once it settles (below).
    const before = this.host.engine.snapshotRows();
    const failures: Array<{ rowIndex: number; column: string; error: string }> = [];
    const started = Date.now();
    const callsBefore = this.cellCalls;
    const factor = this.chunkFactor();
    let chunks = 0;
    const showStream = target.size > 0 && !this.host.streaming;
    if (showStream) {
      this.host.streaming = true;
      this.host.notify();
    }
    const onChunk = (u: ChunkUpdate): void => {
      chunks++;
      this.host.engine.paintChunk(u);
      if (opts.feed) {
        // Rows, not cells: a spec with two AI columns lands two chunks per row.
        opts.feed.rowsDone = Math.min(opts.feed.rowsTotal, Math.floor(chunks / factor));
        this.host.engine.appendRunLog(opts.feed, u);
        this.host.notify();
      }
    };
    try {
      await runner.setSpec(spec, {
        fresh: true,
        signal: opts.signal,
        cellFilter: (_t, i) => target.has(i),
        onCellError: (u) => failures.push(u),
        onChunk,
      });
    } finally {
      for (const f of failures) this.failedInfo.set(f.rowIndex, { column: f.column, error: f.error });
      this.remarkFailures();
      // #LazyExec — opening a page evaluates exactly that page's rows. The
      // engine's fresh replay also refills every OTHER pending row whose prompt
      // is already cached (repeated data seeds them from an earlier page), which
      // would silently complete the whole table and drop the pager marks and the
      // readout mid-review. Undo that: restore the pending sentinel on any
      // off-target row that was pending before the pass. The value stays in the
      // cell cache, so opening that page later refills it free. An empty-target
      // pass is the cancel-path refill, whose whole job is to pull finished rows
      // back from the cache — it must keep them, so it is exempt.
      if (target.size > 0) this.remarkPending(before, target);
      // #LazyExec — a page-open / run-all / retry pass belongs to the current
      // request's turn, so it accumulates its fills into the changed-cell tint
      // (reset=false) rather than resetting to just the page it touched. An
      // empty-target pass (the cache-only refill after a cancel) changes
      // nothing new, so it never re-marks.
      if (target.size > 0) this.host.engine.recordFilled(before, false);
      if (this.cellCalls > callsBefore) this.recordTiming(Date.now() - started, chunks);
      if (showStream) this.host.streaming = false;
      this.host.engine.clearOverlay();
      this.invalidateScan();
      this.host.engine.invalidateDisplay();
      this.host.notify();
    }
  }

  /** Restore the pending sentinel on off-target rows the engine free-refilled
   *  from cache, so a page-open pass fills exactly its page and the rest stay
   *  pending (see the caller). Only rows that were pending before the pass are
   *  touched — already-evaluated rows keep their value, failed rows keep their
   *  failure. */
  private remarkPending(before: Row[], target: Set<number>): void {
    const aiCols = aiMadeColumns(this.host.engine.displaySpec());
    if (aiCols.size === 0) return;
    const rows = this.host.engine.rawRows();
    for (let i = 0; i < rows.length; i++) {
      if (target.has(i)) continue;
      const brow = before[i];
      const row = rows[i];
      if (!brow || !row) continue;
      for (const c of aiCols) {
        if (isPendingCell(brow[c])) row[c] = brow[c];
      }
    }
  }

  /** Restore failed sentinels for rows a pass left pending — the row keeps
   *  its error until an explicit retry re-calls it. */
  private remarkFailures(): void {
    if (this.failedInfo.size === 0) return;
    const rows = this.host.engine.rawRows();
    for (const [i, info] of this.failedInfo) {
      const row = rows[i];
      if (!row) continue;
      const v = row[info.column];
      if (isPendingCell(v)) row[info.column] = { __ttFailed: info.error };
    }
  }

  // ── Run on all rows, Save, Retry ─────────────────────────────────────────

  /** Run everything still pending or failed, behind the estimate dialog when
   *  more than one page is remaining. Returns true when all rows evaluated.
   *  `reason` picks the dialog copy ('run-all' from the button, 'save' from
   *  Save, 'sort'/'filter' from the column menu's dependency gate). */
  async runOnAllRows(reason: RunAllReason = 'run-all'): Promise<boolean> {
    await this.settle();
    const { pending, failed } = this.scan();
    const remaining = pending.size + failed.size;
    if (remaining === 0) return true;
    if (remaining > this.host.pageSize) {
      const choice = await this.askRunAll(reason);
      if (choice !== 'run') return false;
    }
    return this.runAll();
  }

  /** The column-menu gate for sort/filter on an AI-made column: 'proceed'
   *  (nothing pending, not an AI column, or everything just evaluated),
   *  'partial' (apply over the evaluated rows only — missing values sink or
   *  hide), or 'skip' (leave the view unchanged). */
  async gateViewApply(column: string, reason: RunAllReason): Promise<'proceed' | 'partial' | 'skip'> {
    await this.settle();
    const { pending, failed } = this.scan();
    const remaining = pending.size + failed.size;
    if (remaining === 0) return 'proceed';
    const aiCols = aiMadeColumns(this.host.engine.displaySpec());
    if (!aiCols.has(column)) return 'proceed';
    // One page or less just runs, without ceremony — same as run-all.
    if (remaining <= this.host.pageSize) {
      await this.runAll();
      return 'proceed';
    }
    const choice = await this.askRunAll(reason);
    if (choice === 'run') {
      await this.runAll();
      // A cancelled run still applied everything that finished — the view
      // then behaves like the evaluated-only choice.
      return 'proceed';
    }
    return choice === 'partial' ? 'partial' : 'skip';
  }

  /** The readout's "Retry N failed rows" — re-calls exactly the failed rows. */
  async retryFailedRows(): Promise<void> {
    await this.settle();
    const { failed } = this.scan();
    if (failed.size === 0) return;
    const target = new Set(failed.keys());
    for (const i of target) this.failedInfo.delete(i);
    await this.evaluatePass(target);
  }

  /** Cancel the in-flight run-all (the progress dialog's Cancel). Finished
   *  rows are kept — their results are already in the cell cache. */
  cancelRun(): void {
    this.runAbort?.abort();
  }

  /** Whether a run-all is streaming — the dialog swaps to its progress body. */
  runAllActive(): boolean {
    return this.runAbort !== null;
  }


  private async runAll(): Promise<boolean> {
    const { pending, failed } = this.scan();
    const target = new Set([...pending, ...failed.keys()]);
    for (const i of failed.keys()) this.failedInfo.delete(i);
    const abort = new AbortController();
    this.runAbort = abort;
    const feed: RunProgress = {
      step: 0,
      totalSteps: 0,
      label: 'Running on all rows',
      rowsDone: 0,
      rowsTotal: target.size,
      log: [],
    };
    this.host.runProgress = feed;
    this.host.streaming = true;
    this.host.notify();
    try {
      await this.evaluatePass(target, { signal: abort.signal, feed });
      return this.failedCount() === 0;
    } catch {
      // Cancelled (or failed) mid-run: everything finished is in the cell
      // cache — a filterless-target pass refills those cells with no calls,
      // so finished rows are kept and the rest stay pending.
      await this.evaluatePass(new Set());
      return false;
    } finally {
      this.runAbort = null;
      this.host.streaming = false;
      this.host.runProgress = null;
      this.host.notify();
    }
  }

  // ── The estimate / run-all confirmation dialog ───────────────────────────

  private askRunAll(reason: RunAllReason, rowsOverride?: number): Promise<RunAllChoice> {
    const estimate = this.runEstimate()
      ?? { rowsRemaining: rowsOverride ?? 0, estTokens: 0, estUsd: 0, estSeconds: 0 };
    this.host.runAllDialog = { estimate, reason };
    this.host.notify();
    return new Promise<RunAllChoice>((resolve) => {
      this.dialogResolve = (choice: RunAllChoice) => {
        this.host.runAllDialog = null;
        this.dialogResolve = null;
        this.host.notify();
        resolve(choice);
      };
    });
  }

  confirmRunAll(): void {
    this.dialogResolve?.('run');
  }

  /** The column-menu gates' middle choice: apply over evaluated rows only. */
  applyEvaluatedOnly(): void {
    this.dialogResolve?.('partial');
  }

  declineRunAll(): void {
    this.dialogResolve?.('skip');
  }

  /** Reset all lazy state on a fresh load. */
  reset(): void {
    this.failedInfo.clear();
    this.scanCache = null;
    this.cellTokensIn = 0;
    this.cellTokensOut = 0;
    this.cellCalls = 0;
    this.callMs = 0;
    this.callRows = 0;
    this.allowAllOnce = false;
  }
}

// ── Dependency-rule detection ──────────────────────────────────────────────

/** Columns produced by {llm} steps in the spec (AI-made columns). */
export function aiMadeColumns(spec: TablePlan): Set<string> {
  const cols = new Set<string>();
  for (const t of spec.transformations as Transformation[]) {
    if (t.kind === 'mutate' && typeof t.value === 'object' && t.value !== null && 'llm' in t.value) {
      for (const c of Array.isArray(t.columns) ? t.columns : [t.columns]) cols.add(c);
    }
    if (t.kind === 'split' && typeof t.on === 'object' && t.on !== null && !(t.on instanceof RegExp) && 'llm' in t.on) {
      for (const c of t.into) cols.add(c);
    }
  }
  return cols;
}

function exprBody(e: Expr | string | undefined | null): string {
  if (!e || typeof e === 'string') return '';
  if ('js' in e) return e.js;
  if ('sql' in e) return e.sql;
  return '';
}

/** Whether transformation `t` reads any of `aiCols` across all rows — sort
 *  keys, filter/validate predicates, {js}/{sql} references, group/pivot
 *  keys, join predicates, split sources. {llm} templates are row-local and
 *  exempt (each row's cell evaluates lazily with the row). */
function readsAiColumns(t: Transformation, aiCols: Set<string>): boolean {
  if (aiCols.size === 0) return false;
  const bodyRefs = (body: string): boolean => [...aiCols].some((c) => body.includes(c));
  switch (t.kind) {
    case 'filter':   return bodyRefs(exprBody(t.pred));
    case 'validate': return bodyRefs(exprBody(t.pred)) || bodyRefs(exprBody(t.message));
    case 'sort':
      return t.by.some((b) =>
        typeof b.key === 'string' ? aiCols.has(b.key)
        : 'llm' in b.key ? true // an {llm} sort key evaluates every row
        : bodyRefs(exprBody(b.key)));
    case 'mutate':
      return typeof t.value === 'object' && t.value !== null && !('llm' in t.value)
        ? bodyRefs(exprBody(t.value as Expr))
        : false;
    case 'group':
      return t.by.some((b) => (typeof b === 'string' ? aiCols.has(b) : bodyRefs(exprBody(b))))
        || Object.values(t.agg).some((e) => ('llm' in e ? false : bodyRefs(exprBody(e))));
    case 'pivot':    return t.index.some((c) => aiCols.has(c)) || aiCols.has(t.on) || aiCols.has(t.values);
    case 'unpivot':  return t.id.some((c) => aiCols.has(c)) || t.measures.some((c) => aiCols.has(c));
    case 'join':     return bodyRefs(exprBody(t.on as Expr));
    case 'split':    return aiCols.has(t.from);
    case 'select':   return false;
  }
}

/** Whether the steps `next` adds beyond `prev` read AI-made columns across
 *  all rows (the dependency rule's trigger). */
export function newStepsReadAiColumns(prev: TablePlan, next: TablePlan): boolean {
  const aiCols = aiMadeColumns(prev);
  const added = next.transformations.slice(prev.transformations.length) as Transformation[];
  return added.some((t) => readsAiColumns(t, aiCols));
}
