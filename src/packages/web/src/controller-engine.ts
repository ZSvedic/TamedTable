// #WebUI
// Engine wiring + request/streaming overlay. Owns the headless Runner, the
// provider-auth fetch, the in-flight abort controller, and the chunk overlay
// painted onto the table while a long transformation streams. Translates the
// surface-agnostic Runner interface for the controller; records each committed
// turn into the patch journal.
import {
  createHeadlessRunner,
  type ChunkUpdate,
  type HeadlessRunner,
  type RequestAudio,
} from '@tamedtable/headless';
import type { Row, TablePlan } from '@tamedtable/core';
import { defaultModel, defaultCellModel } from '@tamedtable/model-config';
import type { FetchLike } from '@tamedtable/file-io';
import { requestBody, requestUrl } from '@tamedtable/cassette';
import type { ControllerHost } from './controller-context.ts';

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
    // Tutorial replay pins the recording config — the active tour's provider
    // defaults — so the request matches the taped one. A voice tour replays
    // against Gemini (where its audio request went), every other tour against
    // Anthropic; replayProvider() decides. The engine is rebuilt when replay
    // mode flips (and playTutorial resets it per tour, so the provider tracks).
    const replayProvider = replaying ? this.host.tutorial.replayProvider() : 'anthropic';
    this.headless = createHeadlessRunner({
      // A placeholder key is enough in replay because the cassette intercepts
      // every call. Otherwise pass the active provider's key (a non-empty
      // fallback lets the SDK initialise even with no key — the real error then
      // surfaces from the API response, which userFacingMessage describes).
      apiKey: replaying ? PLACEHOLDER_KEY : (this.host.settingsMgr.activeApiKey() ?? PLACEHOLDER_KEY),
      model: replaying ? defaultModel(replayProvider) : this.host.config.model,
      cellModel: replaying ? defaultCellModel(replayProvider) : this.host.config.cellModel,
      fetch: this.makeFetch(),
      batchSize: this.host.opts.batchSize,
      chunkSize: this.host.opts.chunkSize,
      onDebug: (info) => {
        this.host.lastDebug = info;
      },
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

  /** Rebuild the engine for a model change with a file loaded, reapplying the
   *  current spec onto the freshly-loaded source. Replays from the cached
   *  source rows (no filesystem) when present, else re-reads the path. */
  async rebuildForModelChange(spec: TablePlan): Promise<void> {
    this.headless = undefined;
    const runner = this.ensureHeadless();
    if (this.loadedSource) {
      await runner.loadParsed(this.loadedSource.rows, this.loadedSource.spec);
    } else {
      await runner.loadInput(this.host.sourcePath);
    }
    await runner.setSpec(spec);
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
    this.host.savedLabel = null;
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
    this.host.savedLabel = null;
    this.host.notify();

    const onChunk = (u: ChunkUpdate): void => {
      opts?.onChunk?.(u);
      this.overlay.set(`${u.rowIndex} ${u.column}`, u.after);
      this.scheduleOverlayFlush();
    };

    try {
      await runner.request(text, { signal, onChunk, audio: opts?.audio, onTranscript: opts?.onTranscript });
      this.host.patch.record({
        label: opts?.label ?? text,
        prevSpec,
        nextSpec: structuredClone(runner.currentSpec()),
      });
    } finally {
      this.activeAbort = null;
      this.host.streaming = false;
      this.overlay.clear();
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

  /** The current rows with any in-flight streaming chunks painted on top. */
  displayRows(): Row[] {
    if (!this.host.loaded) return [];
    const rows = this.ensureHeadless().currentRows();
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
}
