// #TutorialMode
// Tutorial-panel state: the parsed tours, the active tour/step cursors, and the
// per-step side effects (load a file, prefill the chat, surface a golden). The
// panel-open flag, golden rows, and chat prefill are observable on the host;
// the cursors and source tours are this manager's private state.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Row } from '@tamedtable/core';
import type { ControllerHost } from './controller-context.ts';
import type { TutorialSources } from './controller-types.ts';

export class TutorialManager {
  private readonly tutorialSrc: TutorialSources | null;
  private activeTourIndex: number | null = null;
  private tutorialStepIndex: number | null = null;

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
    this.tutorialSrc = host.opts.tutorialSources ?? null;
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
    return (this.tutorialSrc?.tours ?? [])
      .filter((t) => t.tags.includes('@tutorial'))
      .map((t) => t.name);
  }

  /** Names of `@web` scenarios that are not `@tutorial` — the trailing "Dev"
   *  dropdown for smoke-testing a scenario without opening the .feature file. */
  devScenarioNames(): string[] {
    return (this.tutorialSrc?.tours ?? [])
      .filter((t) => t.tags.includes('@web') && !t.tags.includes('@tutorial'))
      .map((t) => t.name);
  }

  selectTutorialScenario(name: string): void {
    const idx = this.tutorialSrc?.tours.findIndex((t) => t.name === name) ?? -1;
    this.activeTourIndex = idx >= 0 ? idx : null;
    this.tutorialStepIndex = null;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    this.host.notify();
  }

  async playTutorial(): Promise<void> {
    if (this.activeTourIndex === null) return;
    const tour = this.tutorialSrc?.tours[this.activeTourIndex];
    if (!tour || tour.steps.length === 0) return;
    this.tutorialStepIndex = 0;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    await this.executeTutorialStep(this.tutorialStepIndex);
    this.host.notify();
  }

  async nextStep(): Promise<void> {
    if (this.tutorialStepIndex === null || this.activeTourIndex === null) return;
    const tour = this.tutorialSrc?.tours[this.activeTourIndex];
    if (!tour) return;
    if (this.tutorialStepIndex < tour.steps.length - 1) {
      this.tutorialStepIndex++;
      await this.executeTutorialStep(this.tutorialStepIndex);
      this.host.notify();
    }
  }

  prevStep(): void {
    if (this.tutorialStepIndex === null || this.tutorialStepIndex === 0) return;
    this.tutorialStepIndex--;
    this.host.notify();
  }

  cancelTutorial(): void {
    this.tutorialStepIndex = null;
    this.host.goldenRows = null;
    this.host.tutorialPrefill = null;
    this.host.notify();
  }

  isTutorialActive(): boolean {
    return this.tutorialStepIndex !== null;
  }

  currentTutorialStepNumber(): number | null {
    return this.tutorialStepIndex !== null ? this.tutorialStepIndex + 1 : null;
  }

  tutorialStepCount(): number {
    if (this.activeTourIndex === null || !this.tutorialSrc) return 0;
    return this.tutorialSrc.tours[this.activeTourIndex]?.steps.length ?? 0;
  }

  /** Name of the currently selected tour, or empty string. */
  selectedTourName(): string {
    if (this.activeTourIndex === null || !this.tutorialSrc) return '';
    return this.tutorialSrc.tours[this.activeTourIndex]?.name ?? '';
  }

  /** Keyword and text of the current step, or null when no tour is active. */
  currentStepDetail(): { keyword: string; text: string } | null {
    if (this.activeTourIndex === null || this.tutorialStepIndex === null || !this.tutorialSrc) return null;
    const step = this.tutorialSrc.tours[this.activeTourIndex]?.steps[this.tutorialStepIndex];
    return step ? { keyword: step.keyword, text: step.text } : null;
  }

  /** Driver.js element id for the current step's UI focus target. */
  currentStepElementId(): string | null {
    if (this.activeTourIndex === null || this.tutorialStepIndex === null || !this.tutorialSrc) return null;
    const step = this.tutorialSrc.tours[this.activeTourIndex]?.steps[this.tutorialStepIndex];
    if (!step) return null;
    switch (step.action.kind) {
      case 'load-file':
      case 'load-lookup': return 'tutorial-open-btn';
      case 'prefill-chat': return 'tutorial-chat-input';
      case 'show-golden':
      case 'golden-source':
      case 'display': return 'tutorial-table-view';
    }
  }

  private async executeTutorialStep(index: number): Promise<void> {
    if (this.activeTourIndex === null || !this.tutorialSrc) return;
    const tour = this.tutorialSrc.tours[this.activeTourIndex];
    const step = tour?.steps[index];
    if (!step) return;
    const { action } = step;
    switch (action.kind) {
      case 'load-file': {
        const text = this.tutorialSrc.inputs[action.filename];
        if (text !== undefined) await this.host.files.loadFromText(action.filename, text);
        break;
      }
      case 'load-lookup': {
        // Write the lookup file into the in-memory store so the engine can
        // read it by path when executing the join transformation.
        const text = this.tutorialSrc.inputs[action.filename];
        if (text !== undefined) {
          await mkdir(this.host.workDir, { recursive: true });
          await writeFile(join(this.host.workDir, action.filename), text, 'utf8');
        }
        break;
      }
      case 'prefill-chat':
        this.host.tutorialPrefill = action.text;
        if (!this.host.streaming) void this.host.sendChat(action.text);
        break;
      case 'show-golden': {
        // The golden filename is lifted onto the scenario by the parser (from
        // the `the expected output is "X"` step), so no step scan is needed.
        const goldenFile = tour?.golden;
        if (goldenFile) {
          const raw = this.tutorialSrc.goldens[goldenFile];
          if (raw) {
            this.host.goldenRows = raw.trim().split('\n').filter(Boolean)
              .map((l) => JSON.parse(l) as Row);
          }
        }
        break;
      }
      case 'golden-source':
      case 'display':
        break;
    }
  }
}
