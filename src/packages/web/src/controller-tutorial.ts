// #TutorialMode
// Tutorial-panel state: a lightweight manifest of @tour/@web scenarios, the
// active tour/step cursors, and the per-step side effects (load a file, prefill
// the chat, surface a golden). Everything heavy — the `.feature` source, the
// input/golden fixtures, and the recorded cassette — loads lazily through the
// host's TutorialSources, so the JS bundle carries only the manifest.
//
// A playing tour also flips the engine into key-free *replay* mode: LLM-driven
// steps (`prefill-chat`) are served from the tour's recorded cassette fetched
// same-origin, so a visitor with no API key can run a full tour. See
// spec/code-contract.md § Tutorial mode.
import { basename } from 'node:path';
import { parseTable } from '@tamedtable/file-io';
import type { Row } from '@tamedtable/core';
import type { RequestAudio } from '@tamedtable/headless';
import type { Provider } from '@tamedtable/model-config';
import { audioMediaType } from '@tamedtable/voice-input';
import { parseTours, type TourScenario } from '@tamedtable/gherkin-tour';
import { parseCassette, replayFetch, type Cassette, type FetchLike } from '@tamedtable/cassette';
import type { ControllerHost } from './controller-context.ts';
import type { TutorialManifestEntry, TutorialSources } from './controller-types.ts';
import { TUTORIAL_CATEGORIES } from './tutorial-categories.ts';

export class TutorialManager {
  private readonly tutorialSrc: TutorialSources | null;
  /** The manifest entry the user has selected (not yet loaded/played). */
  private selected: TutorialManifestEntry | null = null;
  /** The fully parsed + loaded tour, set once playback starts. While non-null
   *  the engine runs in key-free replay mode against this tour's cassette. */
  private activeTour: TourScenario | null = null;
  private tutorialStepIndex: number | null = null;
  /** Highest step index whose side effect has already run. Steps execute once:
   *  stepping back then forward re-visits a step that already loaded its file or
   *  sent its query — re-sending in replay mode would miss the cassette, so a
   *  re-visit just navigates. -1 means nothing executed yet. */
  private executedThrough = -1;
  /** The in-flight prefill-chat request, exposed via `settle()` for tests. */
  private pending: Promise<void> | null = null;

  // Parsed feature files + loaded cassettes, cached so a re-play fetches once.
  private readonly featureCache = new Map<string, TourScenario[]>();
  private readonly cassetteCache = new Map<string, Cassette>();

  /** Names of tours the visitor has finished (reached the terminal stop). The
   *  panel marks these with a checkmark. Persisted to localStorage best-effort
   *  so progress survives reloads; falls back to in-memory when storage is
   *  unavailable (headless tests, private mode). */
  private readonly completed = new Set<string>();
  private static readonly COMPLETED_KEY = 'tt-completed-tours';

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
    this.tutorialSrc = host.opts.tutorialSources ?? null;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(TutorialManager.COMPLETED_KEY) : null;
      if (raw) for (const n of JSON.parse(raw) as string[]) this.completed.add(n);
    } catch { /* ignore corrupt/absent storage */ }
  }

  /** Whether a tour has been finished at least once. */
  isTourCompleted(name: string): boolean {
    return this.completed.has(name);
  }

  private markCompleted(name: string): void {
    if (!name || this.completed.has(name)) return;
    this.completed.add(name);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TutorialManager.COMPLETED_KEY, JSON.stringify([...this.completed]));
      }
    } catch { /* ignore storage write failure */ }
  }

  private get manifest(): TutorialManifestEntry[] {
    return this.tutorialSrc?.manifest ?? [];
  }

  openTutorial(): void {
    this.host.tutorialOpen = true;
    this.host.notify();
  }

  closeTutorial(): void {
    this.host.tutorialOpen = false;
    this.cancelTutorial();
  }

  /** Names of `@tour` tours — the clickable list in the panel. */
  tutorialScenarioNames(): string[] {
    return this.manifest.filter((t) => t.tags.includes('@tour')).map((t) => t.name);
  }

  /** `@tour` tours grouped by their `@cat-…` category, in homepage order
   *  (the eight sections from `TUTORIAL_CATEGORIES`). Empty categories are
   *  dropped so the panel shows only populated sections. */
  tutorialGroups(): { title: string; names: string[] }[] {
    const tours = this.manifest.filter((t) => t.tags.includes('@tour'));
    return TUTORIAL_CATEGORIES.map(({ tag, title }) => ({
      title,
      names: tours.filter((t) => t.tags.includes(tag)).map((t) => t.name),
    })).filter((g) => g.names.length > 0);
  }

  /** Names of `@web` scenarios that are not `@tour` — the trailing "Dev"
   *  dropdown for smoke-testing a scenario without opening the .feature file. */
  devScenarioNames(): string[] {
    return this.manifest
      .filter((t) => t.tags.includes('@web') && !t.tags.includes('@tour'))
      .map((t) => t.name);
  }

  selectTutorialScenario(name: string): void {
    this.selected = this.manifest.find((t) => t.name === name) ?? null;
    // Leave any playing or stayed tour through the full cancel cleanup. A bare
    // `activeTour = null` here once flipped replay mode off while the stayed
    // tour's data was still marked loaded — the next render then read rows from
    // a freshly rebuilt (empty) engine and crashed. cancelTutorial resets the
    // engine and the loaded flag together, so the app returns to the empty
    // state before the newly selected tour plays.
    this.cancelTutorial();
  }

  /** Deep link: select by (feature, scenario) and play from step 1, keeping
   *  the Tutorial panel closed (Driver.js overlay takes over immediately).
   *  Returns true when a tour matched; otherwise leaves the panel closed and
   *  returns false. A missing/empty arg or an unknown file/scenario never
   *  opens the panel — a deep link must not block a normal visit. */
  async openTutorialFromLink(feature: string | null, scenario: string | null): Promise<boolean> {
    if (!feature || !scenario) return false;
    const entry = this.manifest.find((t) => t.feature === feature && t.name === scenario);
    if (!entry) return false;
    this.selected = entry;
    // Same full cleanup as selectTutorialScenario — see the comment there.
    this.cancelTutorial();
    await this.playTutorial();
    return true;
  }

  async playTutorial(): Promise<void> {
    if (!this.selected || !this.tutorialSrc) return;
    const loaded = await this.loadTour(this.selected);
    if (!loaded || loaded.steps.length === 0) return;
    // A `load the lookup table …` step is a silent prerequisite — the join query
    // reads the file from the work dir, the user never opens it — so it is not a
    // tour step. Write those files up front and drop them from the visible steps,
    // leaving a tour that reads Load → Run query (not a phantom "load the lookup"
    // step that spotlights a button the user doesn't touch).
    const lookups = loaded.steps.filter((s) => s.action.kind === 'load-lookup');
    const tour = lookups.length
      ? { ...loaded, steps: loaded.steps.filter((s) => s.action.kind !== 'load-lookup') }
      : loaded;
    if (tour.steps.length === 0) return;
    this.activeTour = tour;
    // Entering replay mode: rebuild the engine pinned to the recording config so
    // the request the tour issues fingerprints identically to what was taped.
    // Return to the empty state (like cancelTutorial) so the first step — always
    // a Load — spotlights the Open control the empty page shows. On the phone the
    // Open button exists only in the empty state, so without this a tour started
    // over a loaded file would spotlight nothing and show a blank overlay.
    this.host.engine.reset();
    this.host.loaded = false;
    this.host.sourcePath = '';
    for (const step of lookups) {
      if (step.action.kind === 'load-lookup') await this.writeLookup(step.action.filename);
    }
    this.tutorialStepIndex = 0;
    this.executedThrough = -1;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    // Close the Tutorial panel — Driver.js takes over. The step is highlighted
    // but NOT executed yet; execution happens when the user clicks Next.
    this.host.tutorialOpen = false;
    this.prefillCurrentStep();
    this.host.notify();
  }

  /** True while nextStep is executing a step — a re-entrant Next (clicked
   *  during a voice clip's seconds-long playback, say) is ignored, or it would
   *  fire the step a second time and double-advance past the next one. */
  private advancing = false;

  async nextStep(): Promise<void> {
    if (this.advancing) return;
    this.advancing = true;
    try {
      await this.advanceStep();
    } finally {
      this.advancing = false;
    }
  }

  private async advanceStep(): Promise<void> {
    if (this.tutorialStepIndex === null || !this.activeTour) return;
    // A showcase tour chains query steps; the previous step's replayed request
    // may still be streaming, and the prefill-chat execute guard refuses to
    // send during a stream. Wait it out so a fast Next never skips a query.
    await this.pending;
    const total = this.activeTour.steps.length;
    if (this.tutorialStepIndex >= total) return; // already done

    // Execute each step once. A re-visit (Previous then Next) skips the side
    // effect — the file is already loaded, the query already sent — so replay
    // doesn't fire a second, unrecorded request.
    if (this.tutorialStepIndex > this.executedThrough) {
      await this.executeTutorialStep(this.tutorialStepIndex);
      this.executedThrough = this.tutorialStepIndex;
    }

    if (this.tutorialStepIndex < total - 1) {
      // Advance to next step (still active).
      this.tutorialStepIndex++;
      this.prefillCurrentStep();
      this.host.notify();
    } else {
      // Last real step executed — enter the terminal stop. The trailing
      // `compare with the expected output` collapsed into here, so surface the
      // golden now (never before the query has run). The "Voilà …" completion is
      // shown in the Driver.js popover, numbered "N of N"; the slide-over panel
      // stays closed until the user clicks Done, at which point finishTutorial()
      // opens the Tutorial chooser.
      this.tutorialStepIndex = total;
      this.host.tutorialPrefill = '';
      this.markCompleted(this.activeTour.name);
      await this.surfaceGolden();
      this.host.notify();
    }
  }

  cancelTutorial(): void {
    const wasReplaying = this.activeTour !== null;
    this.tutorialStepIndex = null;
    this.executedThrough = -1;
    this.activeTour = null;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    // #LazyExec — a tour can end with the estimate or large-file dialog
    // open (the lazy tour's finale shows the estimate); close both.
    this.host.lazy.declineRunAll();
    this.host.files.dismissLargeFile();
    // Leaving replay mode: the tour owned the engine (pinned config, replaced
    // dataset), so drop it and return to the empty state. Browsing the panel
    // without ever playing leaves the user's own table untouched.
    if (wasReplaying) {
      this.host.engine.reset();
      this.host.loaded = false;
      this.host.sourcePath = '';
    }
    this.host.notify();
  }

  /** End the tour and open the Tutorial panel chooser, however the tour was
   *  started, so the user can pick another tutorial. A deep-link visitor arrived
   *  in a new tab (the homepage opens "Show me →" links in a new tab) and closes
   *  that tab to return to the homepage — the app does not navigate for them. */
  finishTutorial(): void {
    this.cancelTutorial();
    this.openTutorial();
  }

  /** Leave the terminal stop but keep the finished tour on screen: the step
   *  cursor clears (the overlay tears down) while the active tour — and with it
   *  key-free cassette replay — stays. Undo/redo re-runs replay from the tape;
   *  new requests are refused (see the sendChat/sendAudioRequest guards). */
  stayTutorial(): void {
    if (!this.isTutorialDone()) return;
    this.tutorialStepIndex = null;
    this.host.tutorialPrefill = null;
    this.host.notify();
  }

  /** True after `stayTutorial()`: a tour is loaded (replay mode on) but no step
   *  is highlighted and the terminal stop is dismissed. */
  isTutorialStayed(): boolean {
    return this.activeTour !== null && this.tutorialStepIndex === null;
  }

  isTutorialActive(): boolean {
    return (
      this.tutorialStepIndex !== null &&
      this.activeTour !== null &&
      this.tutorialStepIndex < this.activeTour.steps.length
    );
  }

  /** True once all steps have been executed and the tour awaits the Finish action. */
  isTutorialDone(): boolean {
    return (
      this.activeTour !== null &&
      this.tutorialStepIndex !== null &&
      this.tutorialStepIndex >= this.activeTour.steps.length
    );
  }

  /** True while a tour is playing — the engine pins the recording config and
   *  routes model calls through the tour's cassette. */
  isReplaying(): boolean {
    return this.activeTour !== null;
  }

  /** Feature base name (e.g. `validate`) of the cassette to replay, or null. */
  replayCassetteName(): string | null {
    return this.activeTour ? basename(this.activeTour.feature ?? '', '.feature') : null;
  }

  /** Provider the active tour pins for replay. Every committed cassette —
   *  voice tours included — records with the Gemini provider defaults, so
   *  every tour replays against Gemini. Drives the replay model in
   *  `EngineManager.ensureHeadless`. */
  replayProvider(): Provider {
    return 'gemini';
  }

  /** Replay one model call from the active tour's cassette. Fetched (and
   *  parsed) once, then cached. A miss throws so the failure surfaces as a
   *  toast rather than hanging. */
  async replayFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const name = this.replayCassetteName();
    if (!name || !this.tutorialSrc) throw new Error('tutorial replay: no active tour');
    let tape = this.cassetteCache.get(name);
    if (!tape) {
      const text = await this.tutorialSrc.loadCassette(name);
      tape = parseCassette(text);
      this.cassetteCache.set(name, tape);
    }
    const replay: FetchLike = replayFetch(tape);
    return replay(input, init);
  }

  /** Await the in-flight prefill-chat request, if any (used by tests). */
  async settle(): Promise<void> {
    await this.pending;
  }

  /** Total stops including the terminal "Voilà …" one, so progress reads "N of
   *  N" there — matching the gherkin-tour cursor contract. */
  tutorialStepCount(): number {
    return this.activeTour ? this.activeTour.steps.length + 1 : 0;
  }

  /** Name of the currently selected tour, or empty string. */
  selectedTourName(): string {
    return this.selected?.name ?? '';
  }

  /** Keyword and text of the current step, or null when no tour is active or done. */
  currentTutorialStepNumber(): number | null {
    if (this.tutorialStepIndex === null || this.isTutorialDone()) return null;
    return this.tutorialStepIndex + 1;
  }

  currentStepDetail(): { keyword: string; text: string } | null {
    if (this.tutorialStepIndex === null || !this.activeTour) return null;
    const step = this.activeTour.steps[this.tutorialStepIndex];
    return step ? { keyword: step.keyword, text: step.text } : null;
  }

  /** Driver.js element id for the current step's UI focus target. */
  currentStepElementId(): string | null {
    if (this.tutorialStepIndex === null || !this.activeTour) return null;
    const step = this.activeTour.steps[this.tutorialStepIndex];
    if (!step) return null;
    switch (step.action.kind) {
      case 'load-file':
      case 'load-lookup': return 'tutorial-open-btn';
      case 'prefill-chat': return 'tutorial-chat-input';
      case 'play-audio': return 'tutorial-speak';
      case 'load-shuffled': return 'tutorial-load-shuffled';
      // Highlighted while the step is still pending — the dialog it opens
      // does not exist yet, so the spotlight lands on the button instead.
      case 'open-estimate': return 'tutorial-runall-btn';
      case 'show-golden':
      case 'golden-source':
      case 'display': return 'tutorial-table-view';
    }
  }

  /** When the highlighted step is a `query "…"`, drop its text into the chat box
   *  so the learner sees the query while the popover says "Run the query"; any
   *  other step empties the box. Runs on every step transition. */
  private prefillCurrentStep(): void {
    if (this.tutorialStepIndex === null || !this.activeTour) return;
    const step = this.activeTour.steps[this.tutorialStepIndex];
    this.host.tutorialPrefill = step?.action.kind === 'prefill-chat' ? step.action.text : '';
  }

  /** Fetch + parse a manifest entry's feature, returning its matching tour. */
  private async loadTour(entry: TutorialManifestEntry): Promise<TourScenario | null> {
    let tours = this.featureCache.get(entry.feature);
    if (!tours) {
      const src = await this.tutorialSrc!.loadFeature(entry.feature);
      // Stamp each tour with its source filename so a deep link matches on
      // (feature, name) — parseTours sees only the source string.
      tours = parseTours(src).map((t) => ({ ...t, feature: entry.feature }));
      this.featureCache.set(entry.feature, tours);
    }
    return tours.find((t) => t.name === entry.name) ?? null;
  }

  /** Fetch a fixture's text, surfacing a fetch failure as a toast. */
  private async loadFixture(filename: string): Promise<string | undefined> {
    try {
      return await this.tutorialSrc!.loadFixture(filename);
    } catch (e) {
      this.host.pushToast('error', `Could not load tutorial fixture "${filename}": ${(e as Error).message}`);
      return undefined;
    }
  }

  /** Stage a lookup fixture so a join query resolves it by name (no
   *  filesystem). A silent prerequisite of a join tour, not a visible step. */
  private async writeLookup(filename: string): Promise<void> {
    const text = await this.loadFixture(filename);
    if (text === undefined) return;
    const { rows } = await parseTable(filename, new TextEncoder().encode(text));
    this.host.engine.registerLookup(filename, rows);
  }

  /** Fetch an audio clip's raw bytes, surfacing a fetch failure as a toast. */
  private async loadAudio(filename: string): Promise<Uint8Array | undefined> {
    try {
      return await this.tutorialSrc!.loadAudio(filename);
    } catch (e) {
      this.host.pushToast('error', `Could not load tutorial audio "${filename}": ${(e as Error).message}`);
      return undefined;
    }
  }

  private async executeTutorialStep(index: number): Promise<void> {
    const tour = this.activeTour;
    const step = tour?.steps[index];
    if (!tour || !step) return;
    const { action } = step;
    switch (action.kind) {
      case 'load-file': {
        const text = await this.loadFixture(action.filename);
        if (text !== undefined) await this.host.files.loadFromText(action.filename, text);
        break;
      }
      case 'load-lookup':
        // Normally pre-written in playTutorial (lookups are not tour steps), but
        // kept here for any caller that steps a load-lookup directly.
        await this.writeLookup(action.filename);
        break;
      // #LazyExec — the Lazy AI execution tour's two clicks.
      case 'load-shuffled':
        await this.host.files.resolveLargeFile(true);
        break;
      case 'open-estimate':
        // Shown, not executed: the estimate dialog opens and waits; the
        // parked promise resolves when the visitor (or the tour's cleanup)
        // confirms or declines.
        void this.host.lazy.runOnAllRows('run-all');
        break;
      case 'prefill-chat':
        // The query is already typed into the chat box (animated in when this
        // step was highlighted, so the popover could just say "Run the query").
        // Next runs it: a brief pause simulates the LLM call, then submit from
        // the cassette — `settle()` lets tests await it.
        if (!this.host.streaming) {
          await simulateModelLatency();
          this.pending = this.host.sendChat(action.text);
        }
        // Empty the box after submission (the empty string triggers the ChatPanel
        // effect; null would leave the draft).
        this.host.tutorialPrefill = '';
        break;
      case 'play-audio': {
        // A voice step: fetch the clip, play it aloud for the demo, then run it
        // through the engine as a real voice turn — reusing the mic-release
        // plumbing so the request fingerprints identically to the recorded
        // voice turn and replays from the tour's cassette, key-free.
        const bytes = await this.loadAudio(action.filename);
        if (!bytes) break;
        // Play the clip aloud from the bytes we just fetched. A blob URL is used
        // rather than the bare filename: `new Audio("voice-….m4a")` resolves
        // against /app/, 404s, and fires `onerror` at once — so nothing is heard
        // and the step finishes instantly. Playing the in-memory bytes both makes
        // it audible and lets us await real playback, so the tour pauses for the
        // clip. No-op where the Audio constructor is unavailable (headless tests).
        if (typeof Audio !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: audioMediaType(action.filename) }));
          try {
            const sound = new Audio(url);
            await new Promise<void>((resolve) => {
              sound.onended = () => resolve();
              sound.onerror = () => resolve();
              void sound.play().catch(() => resolve());
            });
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        const audio: RequestAudio = { data: bytes, mediaType: audioMediaType(action.filename) };
        this.pending = this.host.voice.sendAudioRequest(audio);
        await this.pending;
        break;
      }
      case 'show-golden':
      case 'golden-source':
      case 'display':
        break;
    }
  }

  /** Load the scenario's golden (lifted by the parser from `the expected output
   *  is "X"`) into `goldenRows` for the side-by-side comparison. Called when the
   *  tour reaches its terminal stop — the trailing `compare with the expected
   *  output` collapsed into there. No golden ⇒ nothing to show. */
  private async surfaceGolden(): Promise<void> {
    const goldenFile = this.activeTour?.golden;
    if (!goldenFile) return;
    const raw = await this.loadFixture(goldenFile);
    if (raw) {
      this.host.goldenRows = raw.trim().split('\n').filter(Boolean)
        .map((l) => JSON.parse(l) as Row);
    }
  }
}

// A playing tutorial replays its model call from a cassette, which returns
// instantly — too fast to read as "the model is working". In a real browser a
// short pause after Next restores that beat; in headless tests (no DOM) it is
// skipped so the suite stays fast.
function simulateModelLatency(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, 500));
}
