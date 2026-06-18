// #TutorialMode
// Tutorial-panel state: a lightweight manifest of @tutorial/@web scenarios, the
// active tour/step cursors, and the per-step side effects (load a file, prefill
// the chat, surface a golden). Everything heavy — the `.feature` source, the
// input/golden fixtures, and the recorded cassette — loads lazily through the
// host's TutorialSources, so the JS bundle carries only the manifest.
//
// A playing tour also flips the engine into key-free *replay* mode: LLM-driven
// steps (`prefill-chat`) are served from the tour's recorded cassette fetched
// same-origin, so a visitor with no API key can run a full tour. See
// spec/code-contract.md § Tutorial mode.
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Row } from '@tamedtable/core';
import { parseTours, type TourScenario } from '@tamedtable/gherkin-tour';
import { replayFetch, type Cassette, type FetchLike } from '@tamedtable/cassette';
import type { ControllerHost } from './controller-context.ts';
import type { TutorialManifestEntry, TutorialSources } from './controller-types.ts';

export class TutorialManager {
  private readonly tutorialSrc: TutorialSources | null;
  /** The manifest entry the user has selected (not yet loaded/played). */
  private selected: TutorialManifestEntry | null = null;
  /** The fully parsed + loaded tour, set once playback starts. While non-null
   *  the engine runs in key-free replay mode against this tour's cassette. */
  private activeTour: TourScenario | null = null;
  private tutorialStepIndex: number | null = null;
  /** The in-flight prefill-chat request, exposed via `settle()` for tests. */
  private pending: Promise<void> | null = null;

  // Parsed feature files + loaded cassettes, cached so a re-play fetches once.
  private readonly featureCache = new Map<string, TourScenario[]>();
  private readonly cassetteCache = new Map<string, Cassette>();

  /** Tracks how the active tour was started so Finish can navigate correctly. */
  private launchedFrom: 'panel' | 'deeplink' = 'panel';

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
    this.tutorialSrc = host.opts.tutorialSources ?? null;
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

  /** Names of `@tutorial` tours — the clickable list in the panel. */
  tutorialScenarioNames(): string[] {
    return this.manifest.filter((t) => t.tags.includes('@tutorial')).map((t) => t.name);
  }

  /** Names of `@web` scenarios that are not `@tutorial` — the trailing "Dev"
   *  dropdown for smoke-testing a scenario without opening the .feature file. */
  devScenarioNames(): string[] {
    return this.manifest
      .filter((t) => t.tags.includes('@web') && !t.tags.includes('@tutorial'))
      .map((t) => t.name);
  }

  selectTutorialScenario(name: string): void {
    this.selected = this.manifest.find((t) => t.name === name) ?? null;
    this.activeTour = null;
    this.tutorialStepIndex = null;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    this.host.notify();
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
    this.activeTour = null;
    this.tutorialStepIndex = null;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    await this.playTutorial();
    // Stamp 'deeplink' after playTutorial so a direct Play from the panel always
    // resets to 'panel' first — overwrite only when we know it's a deep link.
    this.launchedFrom = 'deeplink';
    return true;
  }

  async playTutorial(): Promise<void> {
    if (!this.selected || !this.tutorialSrc) return;
    const tour = await this.loadTour(this.selected);
    if (!tour || tour.steps.length === 0) return;
    this.activeTour = tour;
    // Entering replay mode: rebuild the engine pinned to the recording config so
    // the request the tour issues fingerprints identically to what was taped.
    this.host.engine.reset();
    this.tutorialStepIndex = 0;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    this.launchedFrom = 'panel'; // overwritten to 'deeplink' by openTutorialFromLink if needed
    // Close the Tutorial panel — Driver.js takes over. The step is highlighted
    // but NOT executed yet; execution happens when the user clicks Next.
    this.host.tutorialOpen = false;
    this.host.notify();
  }

  async nextStep(): Promise<void> {
    if (this.tutorialStepIndex === null || !this.activeTour) return;
    const total = this.activeTour.steps.length;
    if (this.tutorialStepIndex >= total) return; // already done

    // Execute the currently highlighted step before advancing.
    await this.executeTutorialStep(this.tutorialStepIndex);

    if (this.tutorialStepIndex < total - 1) {
      // Advance to next step (still active).
      this.tutorialStepIndex++;
      this.host.notify();
    } else {
      // Last step executed — enter the done state. The completion is shown in
      // the Driver.js popover (anchored to the table), NOT the slide-over panel:
      // a deep-link visitor never opened that panel, so popping it up on Finish
      // is jarring. The panel stays closed; finishTutorial() handles navigation.
      this.tutorialStepIndex = total;
      this.host.notify();
    }
  }

  prevStep(): void {
    if (this.tutorialStepIndex === null || this.tutorialStepIndex === 0) return;
    // Don't step back past active range (done state has index = total).
    if (this.activeTour && this.tutorialStepIndex > this.activeTour.steps.length - 1) return;
    this.tutorialStepIndex--;
    this.host.notify();
  }

  cancelTutorial(): void {
    const wasReplaying = this.activeTour !== null;
    this.tutorialStepIndex = null;
    this.activeTour = null;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
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

  /** End the tour and return the user to wherever they started it.
   *
   *  - Started from the Tutorial panel → reopen the panel at the chooser. The
   *    panel *is* the source, so going back there is the natural "done".
   *  - Started from a deep link (e.g. a "Show me →" button on the marketing
   *    homepage) → go back to that source page. `history.back()` returns to the
   *    referring page when there is one; a direct visit (no referrer) has no
   *    source to return to, so we strip the tour's query params instead, leaving
   *    the bare app so a refresh doesn't replay the tour. */
  finishTutorial(): void {
    const fromLink = this.launchedFrom === 'deeplink';
    this.cancelTutorial();
    if (!fromLink) {
      this.openTutorial();
      return;
    }
    if (typeof window === 'undefined') return;
    if (document.referrer) {
      window.history.back();
    } else {
      window.location.replace(window.location.pathname);
    }
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

  /** Replay one model call from the active tour's cassette. Fetched (and
   *  parsed) once, then cached. A miss throws so the failure surfaces as a
   *  toast rather than hanging. */
  async replayFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const name = this.replayCassetteName();
    if (!name || !this.tutorialSrc) throw new Error('tutorial replay: no active tour');
    let tape = this.cassetteCache.get(name);
    if (!tape) {
      const text = await this.tutorialSrc.loadCassette(name);
      tape = JSON.parse(text) as Cassette;
      this.cassetteCache.set(name, tape);
    }
    const replay: FetchLike = replayFetch(tape);
    return replay(input, init);
  }

  /** Await the in-flight prefill-chat request, if any (used by tests). */
  async settle(): Promise<void> {
    await this.pending;
  }

  tutorialStepCount(): number {
    return this.activeTour?.steps.length ?? 0;
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
      case 'play-audio':
      case 'show-golden':
      case 'golden-source':
      case 'display': return 'tutorial-table-view';
    }
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
      case 'load-lookup': {
        // Write the lookup file into the in-memory store so the engine can
        // read it by path when executing the join transformation.
        const text = await this.loadFixture(action.filename);
        if (text !== undefined) {
          await mkdir(this.host.workDir, { recursive: true });
          await writeFile(join(this.host.workDir, action.filename), text, 'utf8');
        }
        break;
      }
      case 'prefill-chat':
        this.host.tutorialPrefill = action.text;
        // Notify so the chat input shows the prefill text before submitting.
        this.host.notify();
        // Brief pause so the user can see the filled input before the auto-submit.
        await new Promise<void>((r) => setTimeout(r, 500));
        // Auto-submit from the cassette. `settle()` lets tests await it.
        if (!this.host.streaming) this.pending = this.host.sendChat(action.text);
        // Clear the prefill so the input empties after submission (the empty
        // string triggers the ChatPanel effect; null would leave the draft).
        this.host.tutorialPrefill = '';
        break;
      case 'show-golden': {
        // The golden filename is lifted onto the scenario by the parser (from
        // the `the expected output is "X"` step), so no step scan is needed.
        const goldenFile = tour.golden;
        if (goldenFile) {
          const raw = await this.loadFixture(goldenFile);
          if (raw) {
            this.host.goldenRows = raw.trim().split('\n').filter(Boolean)
              .map((l) => JSON.parse(l) as Row);
          }
        }
        break;
      }
      case 'play-audio': {
        // Play the named audio clip in the browser. No-op in test environments
        // where the Audio constructor is not available.
        if (typeof Audio !== 'undefined') {
          const audio = new Audio(action.filename);
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
        }
        break;
      }
      case 'golden-source':
      case 'display':
        break;
    }
  }
}
