export type TourAction =
  | { kind: 'load-file';     filename: string }
  | { kind: 'load-lookup';   filename: string }
  | { kind: 'prefill-chat';  text: string     }
  | { kind: 'show-golden'                      }
  | { kind: 'golden-source'; filename: string }
  | { kind: 'play-audio';    filename: string }
  | { kind: 'display'                          }

export interface TourStep     { keyword: string; text: string; action: TourAction }
// `feature` (the source file name) is not set by parseTours — it sees only the
// source string. The consumer assembling tours from many files stamps it, so a
// deep link can match one tour by (feature, name).
export interface TourScenario { name: string; tags: string[]; steps: TourStep[]; golden?: string; feature?: string }

// ── Step classification ────────────────────────────────────────────────────

function classify(text: string): TourAction {
  const load = text.match(/^load "(.+)"$/);
  if (load) return { kind: 'load-file', filename: load[1]! };

  const lookup = text.match(/^load the lookup table "(.+)" with columns/);
  if (lookup) return { kind: 'load-lookup', filename: lookup[1]! };

  const chat = text.match(/^query "(.+)"$/);
  if (chat) return { kind: 'prefill-chat', text: chat[1]! };

  const golden = text.match(/^the expected output is "(.+)"$/);
  if (golden) return { kind: 'golden-source', filename: golden[1]! };

  if (text === 'compare with the expected output') return { kind: 'show-golden' };

  const audio = text.match(/^play audio "(.+)"$/);
  if (audio) return { kind: 'play-audio', filename: audio[1]! };

  return { kind: 'display' };
}

// ── Parser ─────────────────────────────────────────────────────────────────

type State = 'idle' | 'background' | 'scenario' | 'outline' | 'docstring';

const STEP_WORDS = new Set(['Given', 'When', 'Then', 'And', 'But']);

export function parseTours(source: string): TourScenario[] {
  const result: TourScenario[] = [];

  let state: State = 'idle';
  let docstringReturn: State = 'idle';

  // Background steps: top-level apply to all; rule-level apply only inside that rule.
  let topBg: TourStep[] = [];
  let ruleBg: TourStep[] = [];
  let inRule = false;

  // Current scenario being accumulated.
  let scenarioName = '';
  let scenarioTags: string[] = [];
  let scenarioSteps: TourStep[] = [];
  let hasScenario = false;

  // Tags that have been read but not yet attached to a Scenario.
  let pendingTags: string[] = [];

  function flush() {
    if (hasScenario) {
      const bg = inRule ? [...topBg, ...ruleBg] : [...topBg];
      const all = [...bg, ...scenarioSteps];

      // The golden source is data, not a tour step: lift it onto the scenario
      // and drop it from the visible step list.
      let golden: string | undefined;
      for (const s of all) {
        if (s.action.kind === 'golden-source') { golden = s.action.filename; break; }
      }

      // Verification / narration steps (anything unclassified) are test
      // machinery, not tour stops — drop them so a tour reads load → query →
      // compare. The golden-source step is dropped too (lifted above).
      const steps = all.filter(
        (s) => s.action.kind !== 'display' && s.action.kind !== 'golden-source',
      );

      const scenario: TourScenario = { name: scenarioName, tags: scenarioTags, steps };
      if (golden !== undefined) scenario.golden = golden;
      result.push(scenario);
    }
    hasScenario = false;
    scenarioName = '';
    scenarioTags = [];
    scenarioSteps = [];
  }

  for (const raw of source.split('\n')) {
    const line = raw.trim();

    // Docstring mode: absorb everything until closing """.
    if (state === 'docstring') {
      if (line === '"""') state = docstringReturn;
      continue;
    }
    if (line === '"""') {
      docstringReturn = state;
      state = 'docstring';
      continue;
    }

    // Skip comments and blank lines.
    if (line === '' || line.startsWith('#')) continue;

    // Feature: — no-op.
    if (line.startsWith('Feature:')) continue;

    // Rule: — new rule scope; finalize any open scenario first.
    if (line.startsWith('Rule:')) {
      flush();
      // Rule-scoped background resets; top-level background is preserved.
      ruleBg = [];
      inRule = true;
      state = 'idle';
      continue;
    }

    // @tags — accumulate; attached to the next Scenario.
    if (line.startsWith('@')) {
      pendingTags = line.split(/\s+/).filter((t) => t.startsWith('@'));
      continue;
    }

    // Background:
    if (line.startsWith('Background:')) {
      flush();
      pendingTags = [];
      if (inRule) {
        ruleBg = [];
        state = 'background';
      } else {
        topBg = [];
        state = 'background';
      }
      continue;
    }

    // Scenario Outline: — skip the whole block, including Examples table.
    if (line.startsWith('Scenario Outline:')) {
      flush();
      pendingTags = [];
      state = 'outline';
      continue;
    }

    // Scenario:
    if (line.startsWith('Scenario:')) {
      flush();
      scenarioName = line.slice('Scenario:'.length).trim();
      scenarioTags = pendingTags;
      scenarioSteps = [];
      hasScenario = true;
      pendingTags = [];
      state = 'scenario';
      continue;
    }

    // Step line.
    const keyword = line.split(/\s+/)[0] ?? '';
    if (STEP_WORDS.has(keyword)) {
      const text = line.slice(keyword.length).trim();
      const step: TourStep = { keyword, text, action: classify(text) };
      if (state === 'background') {
        inRule ? ruleBg.push(step) : topBg.push(step);
      } else if (state === 'scenario') {
        scenarioSteps.push(step);
      }
      // In outline state, steps are silently dropped.
      continue;
    }

    // Everything else (Examples:, table rows, etc.) in outline state — skip.
  }

  flush();
  return result;
}

// ── Tour driver ──────────────────────────────────────────────────────────────

// The driver owns the *flow* of a tour — cursor, step execution, done state,
// return-on-finish — but knows nothing about any host: no DOM ids, no engine, no
// cassette. The host supplies a TourAdapter that turns each typed action into a
// concrete side effect and owns its own element ids and navigation. This is what
// lets the same flow drive TamedTable's app and the package's standalone demo.

/** Host bridge: the driver calls these to execute each step's action and to
 *  resolve the element a step should spotlight. Every method is host-supplied. */
export interface TourAdapter {
  loadFile(filename: string): Promise<void>;
  loadLookup(filename: string): Promise<void>;
  prefillChat(text: string): Promise<void>;
  /** `goldenFile` is the scenario's lifted `golden`, or undefined when none. */
  showGolden(goldenFile: string | undefined): Promise<void>;
  playAudio(filename: string): Promise<void>;
  /** DOM id of the element a step should spotlight, or null for none. */
  elementIdFor(action: TourAction): string | null;
  /** Called once when the tour finishes — the host decides what comes next
   *  (the app opens its Tutorial panel; the demo shows a status line). */
  onFinish(): void;
}

/** Host-agnostic tour cursor. `play` arms a tour at step 1; `next` executes the
 *  highlighted step through the adapter then advances; the final `next` enters a
 *  *done* state (cursor past the last step) where `finish` calls the adapter's
 *  `onFinish` hook. Empty tours are ignored. */
export class TourDriver {
  private tour: TourScenario | null = null;
  private index: number | null = null;
  private readonly adapter: TourAdapter;

  constructor(adapter: TourAdapter) {
    this.adapter = adapter;
  }

  /** Arm a tour and highlight step 1. An empty tour is ignored. */
  play(tour: TourScenario): void {
    if (tour.steps.length === 0) return;
    this.tour = tour;
    this.index = 0;
  }

  /** Execute the highlighted step, then advance. The last step enters done. */
  async next(): Promise<void> {
    if (this.index === null || !this.tour) return;
    const total = this.tour.steps.length;
    if (this.index >= total) return; // already done
    await this.execute(this.tour.steps[this.index]!);
    this.index = this.index < total - 1 ? this.index + 1 : total;
  }

  /** Step the cursor back one stop. No-op at the first step or once done. */
  prev(): void {
    if (this.index === null || this.index === 0) return;
    if (this.tour && this.index > this.tour.steps.length - 1) return;
    this.index--;
  }

  /** Abandon the tour without executing anything further. */
  cancel(): void {
    this.tour = null;
    this.index = null;
  }

  /** End the tour and hand off to the adapter's onFinish hook. */
  finish(): void {
    this.cancel();
    this.adapter.onFinish();
  }

  /** True while a step is highlighted and awaiting execution. */
  isActive(): boolean {
    return this.tour !== null && this.index !== null && this.index < this.tour.steps.length;
  }

  /** True once every step has run and the tour awaits `finish`. */
  isDone(): boolean {
    return this.tour !== null && this.index !== null && this.index >= this.tour.steps.length;
  }

  /** The highlighted step, or null when no tour is active (or it is done). */
  currentStep(): TourStep | null {
    if (!this.isActive() || !this.tour || this.index === null) return null;
    return this.tour.steps[this.index] ?? null;
  }

  /** DOM id the host wants spotlighted for the current step, or null. */
  currentStepElementId(): string | null {
    const step = this.currentStep();
    return step ? this.adapter.elementIdFor(step.action) : null;
  }

  /** 1-based number of the highlighted step, or null when not active. */
  currentStepNumber(): number | null {
    return this.isActive() && this.index !== null ? this.index + 1 : null;
  }

  /** Total steps in the active tour, or 0 when none. */
  stepCount(): number {
    return this.tour?.steps.length ?? 0;
  }

  private async execute(step: TourStep): Promise<void> {
    const { action } = step;
    switch (action.kind) {
      case 'load-file':    await this.adapter.loadFile(action.filename);    break;
      case 'load-lookup':  await this.adapter.loadLookup(action.filename);  break;
      case 'prefill-chat': await this.adapter.prefillChat(action.text);     break;
      case 'show-golden':  await this.adapter.showGolden(this.tour?.golden); break;
      case 'play-audio':   await this.adapter.playAudio(action.filename);   break;
      case 'golden-source':
      case 'display': break;
    }
  }
}
