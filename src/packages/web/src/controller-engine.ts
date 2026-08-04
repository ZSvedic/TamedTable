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
import { aiMadeColumns, newlyWrittenColumns } from './controller-lazy.ts';

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

  /** Journal-entry id of the last committed request, or null when the latest
   *  request committed nothing (declined, failed) — read by the chat/voice
   *  reply paths to link their bubble to its undo state. */
  lastCommitId: number | null = null;

  // The freshly-loaded source (rows + base plan), captured on every load so a
  // model change can rebuild the engine without a filesystem round-trip.
  private loadedSource: { rows: Row[]; spec: TablePlan } | null = null;

  // #LookupJoin — lookup tables staged this session, by the name a join's
  // `with` asks for. Held here rather than only in the runner so a rebuild
  // (model or key change) re-registers them; a join must not start asking for
  // a file the user already picked. They outlive a table load — a lookup is a
  // file of its own.
  private readonly stagedLookups = new Map<string, Row[]>();

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
          // with the active tour/scenario and the missing fingerprint. The note
          // lets the request path end the tour cleanly when the failure
          // settles — the raw mismatch message never reaches a toast.
          this.host.tutorial.noteReplayMiss();
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
    // #LookupJoin — a fresh runner starts with no lookup tables; hand back the
    // ones already staged so a rebuild never re-asks for a picked file.
    for (const [name, rows] of this.stagedLookups) this.headless.registerLookup(name, rows);
    this.builtForReplay = replaying;
    return this.headless;
  }

  /** Whether a runner has been built yet (a model change only forces a reload
   *  when there is a live engine to rebuild). */
  hasRunner(): boolean {
    return this.headless !== undefined;
  }

  /** #ProviderSelect — the Settings Test button's one-call key check. Runs
   *  through the same engine a request would, so a green tick means requests
   *  will work; needs no loaded table. */
  testConnection(): Promise<{ model: string }> {
    return this.ensureHeadless().testConnection();
  }

  /** Drop the engine so the next ensureHeadless() rebuilds it with current
   *  config (used after a model change with no file loaded). */
  reset(): void {
    this.headless = undefined;
  }

  /** Rebuild the engine for a model or key change with a file loaded. The derived
   *  rows and the per-cell result cache carry over verbatim (#LazyExec):
   *  evaluated rows keep their values, pending rows stay pending, and not a
   *  single model call is made — indicators re-derive from the same data. */
  async rebuildForConfigChange(spec: TablePlan): Promise<void> {
    const old = this.headless;
    const rows = old?.currentRows();
    const origins = old?.rowOrigins();
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
    if (rows) await runner.adoptState(spec, rows, origins);
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
   *  instead of reading a file by path. Kept for the session, so a rebuilt
   *  engine gets it back. */
  registerLookup(name: string, rows: Row[]): void {
    this.stagedLookups.set(name, rows);
    this.ensureHeadless().registerLookup(name, rows);
  }

  /** The names a join can resolve without asking the user for a file. */
  stagedLookupNames(): ReadonlySet<string> {
    return new Set(this.stagedLookups.keys());
  }

  /** Drop a staged lookup by name — tour cleanup (#TutorialMode): a tour's
   *  bundled lookup must not outlive the tour, or the user's own join naming
   *  the same file would silently join against tour data. The runner itself
   *  is dropped by the tour-end engine reset; this clears the rebuild seed. */
  unregisterLookup(name: string): void {
    this.stagedLookups.delete(name);
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
    this.changedCells.clear();
    const prevSpec = structuredClone(runner.currentSpec());
    const beforeRows = this.snapshotRows();
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
      // #LazyExec — mark the cells the flow filled on its preview page —
      // structurally written columns included — and point the grid at the
      // start of the changed block.
      this.recordFilled(beforeRows, true,
        newlyWrittenColumns(prevSpec, runner.currentSpec(), beforeRows, runner.currentRows()));
      this.refreshReveal();
      this.pruneViewToSpec();
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

  // #LazyExec — lazy evaluation passes stream like a request: each landed
  // chunk paints onto the display overlay (batched notify), and the pass
  // clears it once the derived rows carry the values.
  paintChunk(u: ChunkUpdate): void {
    this.overlay.set(`${u.rowIndex} ${u.column}`, u.after);
    this.scheduleOverlayFlush();
  }

  clearOverlay(): void {
    this.overlay.clear();
    if (this.overlayTimer) {
      clearTimeout(this.overlayTimer);
      this.overlayTimer = undefined;
    }
  }

  /** Apply a spec through the cache only (#LazyExec): no cell may spend a
   *  model call — evaluated cells refill from the cell cache, unevaluated
   *  cells stay pending. Undo, redo, history jumps, and gesture patches ride
   *  this path, so none of them ever costs an AI call. */
  async applySpecCached(spec: TablePlan): Promise<void> {
    await this.ensureHeadless().setSpec(spec, { fresh: true, cellFilter: () => false });
    this.changedCells.clear();
    this.host.setReveal(null);
    this.displayCache = null;
    this.pruneViewToSpec();
  }

  /** Bring the view back in step with the spec — drops view sort/filters on
   *  columns the spec no longer has, and stands the shuffled sample down (or
   *  back up) as the spec gains or loses an ordering step. Called after every
   *  spec change (undo/redo/jump/gesture patches ride applySpecCached; chat
   *  requests and flow replays call it on commit). */
  private pruneViewToSpec(): void {
    this.host.view.syncToSpec(this.ensureHeadless().currentSpec());
  }

  /** Note a single-cell change (the inline-edit gesture) for the tint. */
  noteChangedCell(derivedRow: number, column: string, before: unknown): void {
    this.changedCells.set(`${derivedRow}:${column}`, before ?? null);
  }

  /** Replace the changed-cell marks wholesale — undo/redo/jump restoring the
   *  marks a history entry recorded — and refresh the reveal target so the
   *  grid scrolls back to that step's changed block. */
  restoreChangedCells(cells: ReadonlyMap<string, unknown>): void {
    this.changedCells.clear();
    for (const [key, before] of cells) this.changedCells.set(key, before);
    this.refreshReveal();
  }

  /** Point the grid at the start of the changed block: the first changed
   *  column in display order (spec/behavior.md § Grid upgrades), or clear the
   *  target when the last step changed nothing. */
  refreshReveal(): void {
    const cols = new Set<string>();
    for (const key of this.changedCells.keys()) cols.add(key.slice(key.indexOf(':') + 1));
    const first = this.host.loaded && cols.size > 0
      ? this.ensureHeadless().currentSpec().columns.find((c) => cols.has(c.id))?.id ?? null
      : null;
    this.host.setReveal(first);
  }

  // #LazyExec — the changed-cell tint means "filled by the current request".
  // A pass records what it changed by diffing the AI-made columns' shown
  // values (a pending/failed sentinel reads as blank) against `before`: a cell
  // that went blank→value (a live call OR a free cache refill — a page-open
  // seeds the cache, so one page's pass can quietly fill the rest) or was
  // overwritten counts as filled; a cache refill that reproduces the same
  // value does not. Diffing the data — not trusting which cells a live call
  // streamed through onChunk — is what keeps a shuffled or sorted view from
  // tinting one block and leaving an identically filled block below it bare.
  // `reset` starts a new request's marks; page-open, run-all, and retry passes
  // pass `false` so an AI column tints uniformly as the reader pages through
  // it. Earlier marks keep their recorded previous value (the hover tooltip).
  // `extraCols` widens the diff beyond the AI-made columns — the commit paths
  // pass the columns the request's own steps wrote (a {js}/{sql} mutate, a
  // split, a validate's flag pair), so a structural fill tints and reveals
  // like an AI one (spec/behavior.md § Grid upgrades).
  recordFilled(before: Row[], reset: boolean, extraCols?: ReadonlySet<string>): void {
    if (reset) this.changedCells.clear();
    const runner = this.ensureHeadless();
    const after = runner.currentRows();
    const cols = aiMadeColumns(runner.currentSpec());
    if (extraCols) for (const c of extraCols) cols.add(c);
    if (cols.size === 0) return;
    const shown = (v: unknown): unknown =>
      isPendingCell(v) || isFailedCell(v) ? undefined : v;
    for (let i = 0; i < after.length; i++) {
      const a = after[i];
      if (!a) continue;
      const b = before[i];
      for (const c of cols) {
        if (!(c in a)) continue;
        const av = shown(a[c]);
        if (av === undefined) continue; // still blank — not filled
        const bv = b && c in b ? shown(b[c]) : undefined;
        if (bv === av) continue; // unchanged (an already-evaluated cache refill)
        if (!this.changedCells.has(`${i}:${c}`)) this.changedCells.set(`${i}:${c}`, bv ?? null);
      }
    }
  }

  /** Snapshot the derived rows (shallow per row) so a pass can diff what it
   *  filled once it settles. */
  snapshotRows(): Row[] {
    return this.ensureHeadless().currentRows().map((r) => ({ ...r }));
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
    this.changedCells.clear();
    this.host.setReveal(null);
    this.lastCommitId = null;
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
    this.lastCommitId = null;

    // The engine always owns the abort controller, so cancelActive() (the
    // chat Stop button) reaches every kind of run. A caller-passed signal —
    // the voice path's Escape — is chained in rather than passed through:
    // either source of abort cancels the request.
    const ownAbort = new AbortController();
    if (opts?.signal) {
      if (opts.signal.aborted) ownAbort.abort();
      else opts.signal.addEventListener('abort', () => ownAbort.abort(), { once: true });
    }
    const signal = ownAbort.signal;
    this.activeAbort = ownAbort;
    this.host.streaming = true;
    this.overlay.clear();
    this.host.selection = null;
    this.host.notify();

    // The chat's live run progress rides along from the start (#OpenFlow) —
    // a deterministic request just flashes its steps briefly. The feed also
    // paints the overlay, so the wrapper only forwards the caller's onChunk.
    // #LazyExec — this request resets the changed-cell tint; recordFilled
    // marks what it changed once it commits (diffed against this snapshot).
    this.changedCells.clear();
    const beforeRows = this.snapshotRows();
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
        // Two gates on the patch the model just produced, both able to drop it
        // cleanly: #LookupJoin asks for a join's second file (the browser has
        // no path to read it from), then #LazyExec's dependency rule. The
        // lookup runs first — declining it means the step cannot run at all,
        // so there is nothing to estimate.
        confirmSpec: async (next, prev) =>
          (await this.host.files.ensureLookups(next)) &&
          (await this.host.lazy.confirmPatch(next, prev)),
      });
      // #LazyExec — mark the cells this request filled on its preview page
      // (before the journal snapshots them) — structurally written columns
      // included — and point the grid at the start of the changed block (the
      // reveal scroll).
      this.recordFilled(beforeRows, true,
        newlyWrittenColumns(prevSpec, runner.currentSpec(), beforeRows, runner.currentRows()));
      this.refreshReveal();
      this.pruneViewToSpec();
      this.lastCommitId = this.host.patch.record({
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
        // #LazyExec — the changed-cell tint is recorded by recordFilled once
        // the pass settles (it diffs the data so free cache refills count too),
        // not per streamed chunk; the overlay above is just the live paint.
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

  /** Source-row origin per derived row (#LazyExec) — the lazy manager's
   *  derived-to-step-input index mapping. */
  rowOrigins(): ReadonlyArray<number | undefined> {
    if (!this.host.loaded) return [];
    return this.ensureHeadless().rowOrigins();
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
