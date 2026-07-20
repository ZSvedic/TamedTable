// #WebUI
// Engine wiring + request/streaming overlay. Owns the headless Runner, the
// provider-auth fetch, the in-flight abort controller, and the chunk overlay
// painted onto the table while a long transformation streams. Translates the
// surface-agnostic Runner interface for the controller; records each committed
// turn into the patch journal.
import {
  createHeadlessRunner,
  isDeclined,
  isFailedCell,
  isPendingCell,
  type ChunkUpdate,
  type HeadlessRunner,
  type RequestAudio,
  type StepUpdate,
} from '@tamedtable/headless';
import type { Row, TablePlan } from '@tamedtable/core';
import { defaultModel, defaultCellModel, defaultBatchSize } from '@tamedtable/model-config';
import type { FetchLike } from '@tamedtable/file-io';
import { requestBody, requestUrl } from '@tamedtable/cassette';
import type { ControllerHost } from './controller-context.ts';
import type { RunProgress } from './controller-types.ts';

/** Newest log lines the run-progress feed keeps — a bound, not a transcript. */
const FLOW_LOG_MAX = 500;

/** One log-worthy cell value: short, single-line, quoted when stringy. */
function flowLogValue(v: unknown): string {
  const s = v === null || v === undefined ? 'null' : JSON.stringify(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

/** One log-worthy expression body: an AI prompt or a long SQL fragment can
 *  run to hundreds of characters — cap it, the label already names the step. */
function flowLogExpr(body: string): string {
  return body.length > 200 ? `${body.slice(0, 197)}…` : body;
}

const PLACEHOLDER_KEY = 'tamedtable-web';

export class EngineManager {
  private headless: HeadlessRunner | undefined;
  /** Whether the cached engine was built for tutorial replay, so a mode change
   *  forces a rebuild with the right model + fetch. */
  private builtForReplay = false;

  // Streaming overlay: chunk updates painted onto the displayed table while a
  // long LLM transformation runs (the engine commits only when it finishes).
  private readonly overlay = new Map<string, unknown>();
  private overlayTimer: ReturnType<typeof setTimeout> | undefined;

  // #LazyExec — cells the last spec step changed, keyed "<derivedRow>:<col>"
  // → the previous value. The grid tints them and shows the old value on
  // hover. Reset when a new request starts; cleared by undo/redo/jump.
  readonly changedCells = new Map<string, unknown>();

  private activeAbort: AbortController | null = null;

  // The freshly-loaded source (rows + base plan), captured on every load so a
  // model change can rebuild the engine without a filesystem round-trip.
  private loadedSource: { rows: Row[]; spec: TablePlan } | null = null;

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  /** Build the fetch the engine uses. While a tutorial plays, every model call
   *  replays from the tour's cassette (key-free). Otherwise: tests inject the
   *  cassette recorder; the browser gets a wrapper that injects provider auth
   *  headers (Anthropic needs an extra header for direct browser-to-API calls;
   *  Gemini and OpenAI handle auth through the SDK's own mechanisms). The check
   *  is per-call so it tracks replay mode without rebuilding the wrapper. */
  private makeFetch(): FetchLike {
    return async (input, init) => {
      // The fingerprint inputs the replay layer uses, so a logged miss carries
      // the same hash the replay error reports.
      const method = (init?.method ?? 'GET').toUpperCase();
      const url = requestUrl(input);
      const body = requestBody(init);

      if (this.host.tutorial.isReplaying()) {
        try {
          return await this.host.tutorial.replayFetch(input, init);
        } catch (e) {
          // The original bug: "no recording for this request" on a tour. Log it
          // with the active tour/scenario and the missing fingerprint.
          await this.host.diagnostics.recordRequestFailure({ method, url, body, replayMiss: true, error: e });
          throw e;
        }
      }

      const injected = this.host.opts.fetch;
      const headers = new Headers(init?.headers);
      if (!injected) {
        const apiKey = this.host.settingsMgr.activeApiKey();
        if (this.host.config.provider === 'anthropic') {
          if (apiKey) headers.set('x-api-key', apiKey);
          headers.set('anthropic-dangerous-direct-browser-access', 'true');
        }
      }
      try {
        const res = injected ? await injected(input, init) : await fetch(input, { ...init, headers });
        if (!res.ok) {
          await this.host.diagnostics.recordRequestFailure({ method, url, body, status: res.status });
        }
        return res;
      } catch (e) {
        await this.host.diagnostics.recordRequestFailure({ method, url, body, error: e });
        throw e;
      }
    };
  }

  ensureHeadless(): HeadlessRunner {
    const replaying = this.host.tutorial.isReplaying();
    if (this.headless && this.builtForReplay === replaying) return this.headless;
    // Tutorial replay pins the recording config — the Gemini provider
    // defaults every cassette records with — so the request matches the taped
    // one. The engine is rebuilt when replay mode flips (and playTutorial
    // resets it per tour, so the provider tracks).
    const replayProvider = replaying ? this.host.tutorial.replayProvider() : 'gemini';
    this.headless = createHeadlessRunner({
      // A placeholder key is enough in replay because the cassette intercepts
      // every call. Otherwise pass the active provider's key (a non-empty
      // fallback lets the SDK initialise even with no key — the real error then
      // surfaces from the API response, which userFacingMessage describes).
      apiKey: replaying ? PLACEHOLDER_KEY : (this.host.settingsMgr.activeApiKey() ?? PLACEHOLDER_KEY),
      model: replaying ? defaultModel(replayProvider) : this.host.config.model,
      cellModel: replaying ? defaultCellModel(replayProvider) : this.host.config.cellModel,
      fetch: this.makeFetch(),
      // Host opts win; otherwise the provider's pinned cell batch (openrouter:
      // 5). Replay keeps the engine default — cassettes recorded with it.
      batchSize: this.host.opts.batchSize
        ?? (replaying ? undefined : defaultBatchSize(this.host.config.provider)),
      chunkSize: this.host.opts.chunkSize,
      onDebug: (info) => {
        this.host.lastDebug = info;
      },
      // #LazyExec — the estimate math accumulates per-call token usage.
      onUsage: (u) => this.host.lazy.recordUsage(u),
    });
    this.builtForReplay = replaying;
    return this.headless;
  }

  /** Whether a runner has been built yet (a model change only forces a reload
   *  when there is a live engine to rebuild). */
  hasRunner(): boolean {
    return this.headless !== undefined;
  }

  /** Drop the engine so the next ensureHeadless() rebuilds it with current
   *  config (used after a model change with no file loaded). */
  reset(): void {
    this.headless = undefined;
  }

  /** Rebuild the engine for a model change with a file loaded. The derived
   *  rows and the per-cell result cache carry over verbatim (#LazyExec):
   *  evaluated rows keep their values, pending rows stay pending, and not a
   *  single model call is made — indicators re-derive from the same data. */
  async rebuildForModelChange(spec: TablePlan): Promise<void> {
    const old = this.headless;
    const rows = old?.currentRows();
    const cache = old?.cellCacheEntries();
    this.headless = undefined;
    const runner = this.ensureHeadless();
    if (this.loadedSource) {
      await runner.loadParsed(this.loadedSource.rows, this.loadedSource.spec);
    } else {
      await runner.loadInput(this.host.sourcePath);
    }
    // Seed after the load — commitSource clears the cell cache.
    if (cache) runner.seedCellCache(cache);
    if (rows) await runner.adoptState(spec, rows);
    else await runner.setSpec(spec);
  }

  // ── Runner interface (drives the shared, surface-agnostic scenarios) ─────

  async loadInput(path: string): Promise<void> {
    const runner = this.ensureHeadless();
    await runner.loadInput(path);
    this.afterLoad(runner, path);
  }

  /** Load an already-parsed table (browser open/fetch/tutorial) — no path,
   *  no filesystem. The web parses through file-io and hands rows here. */
  async loadParsed(rows: Row[], spec: TablePlan): Promise<void> {
    const runner = this.ensureHeadless();
    await runner.loadParsed(rows, spec);
    this.afterLoad(runner, spec.table ?? '');
  }

  /** Stage a lookup table by name so a browser join resolves against its rows
   *  instead of reading a file by path. */
  registerLookup(name: string, rows: Row[]): void {
    this.ensureHeadless().registerLookup(name, rows);
  }

  /** The loaded source's column ids — what a replayed flow reads (its
   *  transformations run on the source rows, not the derived view). */
  sourceColumns(): string[] {
    return this.loadedSource?.spec.columns.map((c) => c.id) ?? [];
  }

  // #OpenFlow
  /** Replace the current spec, replaying its transformations onto the loaded
   *  source rows (the Open & run .flow path). Runs like a request — AI cells
   *  paint onto the overlay as chunks land — behind the chat's live run
   *  progress: `host.runProgress` carries step/row progress and the event
   *  log, and the chat Stop button (or the mobile banner's stop icon) aborts
   *  through the same controller a chat request uses. setSpec commits only
   *  when the whole replay finishes, so a cancel or failure leaves the
   *  previous spec and rows untouched. Throws when the replay fails or is
   *  cancelled. */
  async applySpec(spec: TablePlan): Promise<void> {
    const runner = this.ensureHeadless();
    const ownAbort = new AbortController();
    this.activeAbort = ownAbort;
    this.host.streaming = true;
    this.overlay.clear();
    const feed = this.runProgressFeed(spec.transformations.length);
    this.host.notify();

    try {
      await runner.setSpec(spec, {
        signal: ownAbort.signal,
        onStep: feed.onStep,
        onChunk: feed.onChunk,
        // #LazyExec — a replayed flow's AI cells fill the rows in view, like
        // a chat request; the rest stays pending behind the indicators.
        cellFilter: this.host.lazy.requestCellFilter(),
      });
    } finally {
      this.activeAbort = null;
      this.host.streaming = false;
      this.host.runProgress = null;
      this.overlay.clear();
      this.displayCache = null;
      if (this.overlayTimer) {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = undefined;
      }
      this.host.notify();
    }
  }

  /** Drop the memoized sentinel-blanked rows (#LazyExec) — call after any
   *  in-place mutation of the derived rows. */
  invalidateDisplay(): void {
    this.displayCache = null;
  }

  /** Apply a spec through the cache only (#LazyExec): no cell may spend a
   *  model call — evaluated cells refill from the cell cache, unevaluated
   *  cells stay pending. Undo, redo, history jumps, and gesture patches ride
   *  this path, so none of them ever costs an AI call. */
  async applySpecCached(spec: TablePlan): Promise<void> {
    await this.ensureHeadless().setSpec(spec, { fresh: true, cellFilter: () => false });
    this.changedCells.clear();
    this.displayCache = null;
  }

  /** Note a single-cell change (the inline-edit gesture) for the tint. */
  noteChangedCell(derivedRow: number, column: string, before: unknown): void {
    this.changedCells.set(`${derivedRow}:${column}`, before ?? null);
  }

  /** Shared post-load bookkeeping for loadInput / loadParsed: cache the source
   *  for model-change rebuilds and reset the per-load view state. */
  private afterLoad(runner: HeadlessRunner, sourcePath: string): void {
    this.loadedSource = {
      rows: runner.currentRows().map((r) => ({ ...r })),
      spec: structuredClone(runner.currentSpec()),
    };
    this.host.sourcePath = sourcePath;
    this.host.loaded = true;
    this.host.patch.clearJournal();
    this.overlay.clear();
    this.host.pageNum = 1;
    this.host.selection = null;
    this.host.lazy.reset();
    this.host.view.reset();
    this.displayCache = null;
    this.host.notify();
  }

  async request(
    text: string,
    opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; audio?: RequestAudio; label?: string; onTranscript?: (text: string) => void },
  ): Promise<void> {
    if (!this.host.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
    const runner = this.ensureHeadless();
    const prevSpec = structuredClone(runner.currentSpec());

    const ownAbort = opts?.signal ? null : new AbortController();
    const signal = opts?.signal ?? ownAbort!.signal;
    this.activeAbort = ownAbort;
    this.host.streaming = true;
    this.overlay.clear();
    this.host.selection = null;
    this.host.notify();

    // The chat's live run progress rides along from the start (#OpenFlow) —
    // a deterministic request just flashes its steps briefly. The feed also
    // paints the overlay, so the wrapper only forwards the caller's onChunk.
    this.changedCells.clear();
    const feed = this.runProgressFeed();
    // #LazyExec — the preview window's throughput seeds the estimate math.
    const started = Date.now();
    const callsBefore = this.host.lazy.cellCallCount();
    let chunkCount = 0;
    const onChunk = (u: ChunkUpdate): void => {
      chunkCount++;
      opts?.onChunk?.(u);
      feed.onChunk(u);
    };

    try {
      await runner.request(text, {
        signal,
        onChunk,
        onStep: feed.onStep,
        audio: opts?.audio,
        onTranscript: opts?.onTranscript,
        // #LazyExec — an AI step evaluates the rows in view; everything
        // already evaluated refills from the cell cache. The dependency rule
        // gates the commit when a new step reads an AI-made column.
        cellFilter: this.host.lazy.requestCellFilter(),
        confirmSpec: (next, prev) => this.host.lazy.confirmPatch(next, prev),
      });
      this.host.patch.record({
        label: opts?.label ?? text,
        prevSpec,
        nextSpec: structuredClone(runner.currentSpec()),
      });
    } catch (e) {
      // A declined dependency confirmation drops the patch silently — no
      // spec change, no history entry, no error surface.
      if (!isDeclined(e)) throw e;
    } finally {
      if (this.host.lazy.cellCallCount() > callsBefore) {
        this.host.lazy.recordTiming(Date.now() - started, chunkCount);
      }
      this.host.lazy.requestSettled();
      this.activeAbort = null;
      this.host.streaming = false;
      this.host.runProgress = null;
      this.overlay.clear();
      this.displayCache = null;
      if (this.overlayTimer) {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = undefined;
      }
      this.host.notify();
    }
  }

  /** Cancel the in-flight request, if any. */
  cancelActive(): void {
    this.activeAbort?.abort();
  }

  // #OpenFlow
  /** Build the live run-progress event feed for one run: the returned
   *  handlers keep `host.runProgress` (step/row progress + capped log)
   *  current — published immediately, for flow replays and chat requests
   *  alike — and paint streamed cells onto the overlay. */
  private runProgressFeed(
    totalSteps = 0,
  ): { onStep: (u: StepUpdate) => void; onChunk: (u: ChunkUpdate) => void } {
    const run: RunProgress = { step: 0, totalSteps, label: '', rowsDone: 0, rowsTotal: 0, log: [] };
    this.host.runProgress = run;
    const appendLog = (line: string): void => {
      run.log.push(line);
      if (run.log.length > FLOW_LOG_MAX) run.log.splice(0, run.log.length - FLOW_LOG_MAX);
    };
    return {
      onStep: (u) => {
        run.step = u.index + 1;
        run.totalSteps = u.total;
        run.label = u.label;
        run.rowsTotal = u.rows;
        run.rowsDone = 0;
        appendLog(`step ${u.index + 1}/${u.total} — ${u.label} · ${u.rows} rows`);
        // The exact code behind the label — the detail box shows what the
        // step runs, not just its name.
        for (const e of u.expressions) appendLog(`  ${e.label}: ${flowLogExpr(e.body)}`);
        this.host.notify();
      },
      onChunk: (u) => {
        run.rowsDone = Math.max(run.rowsDone, u.rowIndex + 1);
        appendLog(`${u.column} · row ${u.rowIndex + 1}: ${flowLogValue(u.before)} → ${flowLogValue(u.after)}`);
        this.overlay.set(`${u.rowIndex} ${u.column}`, u.after);
        // #LazyExec — remember the previous value for the changed-cell tint.
        const key = `${u.rowIndex}:${u.column}`;
        if (!this.changedCells.has(key)) this.changedCells.set(key, u.before ?? null);
        this.scheduleOverlayFlush();
      },
    };
  }

  currentRows(): Row[] {
    return this.ensureHeadless().currentRows();
  }

  currentSpec(): TablePlan {
    return this.ensureHeadless().currentSpec();
  }

  async exportAs(path: string): Promise<void> {
    await this.ensureHeadless().exportAs(path);
  }

  /** Translate the current flow to a standalone Python script (model-backed). */
  exportPython(): Promise<string> {
    return this.ensureHeadless().exportPython();
  }

  // ── Streaming overlay ────────────────────────────────────────────────────

  private scheduleOverlayFlush(): void {
    if (this.overlayTimer) return;
    this.overlayTimer = setTimeout(() => {
      this.overlayTimer = undefined;
      this.host.notify();
    }, 80);
  }

  // ── View accessors (never throw — safe before a file is loaded) ───────────

  displaySpec(): TablePlan {
    if (!this.host.loaded) return { columns: [], transformations: [] };
    return this.ensureHeadless().currentSpec();
  }

  /** The derived rows exactly as the engine holds them — sentinels included.
   *  The lazy scan and the view mapping key on this array's identity. */
  rawRows(): Row[] {
    if (!this.host.loaded) return [];
    return this.ensureHeadless().currentRows();
  }

  // Memoized sentinel-blanked copy of the derived rows (#LazyExec): pending
  // and failed cells display as empty. Keyed on the derived array identity;
  // skipped entirely when no cell carries a sentinel.
  private displayCache: { rowsRef: Row[]; rows: Row[] } | null = null;

  private blankSentinels(rows: Row[]): Row[] {
    if (this.displayCache && this.displayCache.rowsRef === rows) return this.displayCache.rows;
    let any = false;
    const mapped = rows.map((row) => {
      let patched: Row | undefined;
      for (const k of Object.keys(row)) {
        const v = row[k];
        if (isPendingCell(v) || isFailedCell(v)) {
          patched = patched ?? { ...row };
          patched[k] = null;
        }
      }
      if (patched) any = true;
      return patched ?? row;
    });
    const result = any ? mapped : rows;
    this.displayCache = { rowsRef: rows, rows: result };
    return result;
  }

  /** The current rows with sentinels blanked and any in-flight streaming
   *  chunks painted on top. */
  displayRows(): Row[] {
    if (!this.host.loaded) return [];
    const rows = this.blankSentinels(this.ensureHeadless().currentRows());
    if (this.overlay.size === 0) return rows;
    return rows.map((row, i) => {
      let patched: Row | undefined;
      for (const [key, value] of this.overlay) {
        const sep = key.indexOf(' ');
        if (Number(key.slice(0, sep)) !== i) continue;
        patched = patched ?? { ...row };
        patched[key.slice(sep + 1)] = value;
      }
      return patched ?? row;
    });
  }

  // #LazyExec — the run-all progress dialog's event feed reuses the chat
  // request-detail log format ("column · row n: before → after").
  appendRunLog(feed: RunProgress, u: ChunkUpdate): void {
    feed.log.push(`${u.column} · row ${u.rowIndex + 1}: ${flowLogValue(u.before)} → ${flowLogValue(u.after)}`);
    if (feed.log.length > FLOW_LOG_MAX) feed.log.splice(0, feed.log.length - FLOW_LOG_MAX);
  }
}
