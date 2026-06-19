// #GherkinTour
// Reusable tour UI: a Driver.js spotlight + popover (Prev / Next / Cancel) and
// keyboard navigation, driving a TourDriver. This is the only entry point that
// pulls in driver.js — the parser and driver in `./index.ts` stay zero-dep, so a
// consumer that only needs `parseTours` / `TourDriver` never ships driver.js.
//
// Lifted, host-agnostic, from the app's TutorialPanel.tsx: the React component
// kept the same Driver.js options, the same Prev/Next/Cancel wiring, and the
// same keyboard map — only the state now lives in TourDriver instead of the
// controller, and the spotlight targets come from the adapter's element ids.
import { driver, type AllowedButtons } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TourDriver } from './index.ts';

export interface TourUiOptions {
  /** Element the completion popover anchors to — a step's own target may be
   *  gone by the time the tour is done, so the host names a stable fallback. */
  doneElementId: string;
  /** Run after every state change so the host can sync its own view (e.g. show
   *  a prefilled chat input) and re-render if a spotlight target appeared. */
  onChange?: () => void;
}

/** Drives a Driver.js overlay from a TourDriver: spotlights the current step,
 *  wires the popover buttons and the keyboard back to the driver, and re-renders
 *  on every transition. Host-agnostic — all DOM ids come from the driver's
 *  adapter (`elementIdFor`) plus the `doneElementId` fallback. */
export class TourUi {
  private readonly tour: TourDriver;
  private readonly opts: TourUiOptions;
  private d: ReturnType<typeof driver> | null = null;
  // True while our code is programmatically destroying the overlay (step change,
  // cleanup) — suppresses the spurious cancel that onDestroyStarted would fire.
  private silentDestroy = false;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(tour: TourDriver, opts: TourUiOptions) {
    this.tour = tour;
    this.opts = opts;
  }

  /** Begin driving the UI for an already-armed tour (after `driver.play()` or
   *  `startFromLink()`): attach keyboard nav and render the first spotlight. */
  start(): void {
    this.attachKeyboard();
    this.render();
  }

  /** Re-sync the spotlight to the driver's current state. Safe to call after
   *  every transition; tears the overlay down once the tour is over. */
  render(): void {
    const active = this.tour.isActive();
    const done = this.tour.isDone();
    if (!active && !done) {
      this.destroyOverlay();
      this.opts.onChange?.();
      return;
    }

    // In the done state the step's own target may be gone — anchor to the host's
    // stable fallback element instead.
    const elementId = done ? this.opts.doneElementId : this.tour.currentStepElementId();
    const el = elementId ? document.getElementById(elementId) : null;
    if (!el) return; // target not mounted yet; the host re-renders once it is

    this.destroyOverlay();

    const stepNum = this.tour.currentStepNumber();
    const stepTotal = this.tour.stepCount();
    const isFirst = stepNum === 1;
    const isLast = stepNum === stepTotal;

    const d = driver({
      animate: false,
      overlayOpacity: 0.25,
      // Only the explicit close/cancel controls dismiss the tour.
      allowClose: false,
      onNextClick: () => { if (done) { this.finish(); } else { void this.advance(); } },
      onPrevClick: () => { this.tour.prev(); this.render(); },
      onCloseClick: () => { this.cancel(); },
      onDestroyStarted: () => { if (!this.silentDestroy) this.cancel(); },
      onPopoverRender: (popover) => { renderKbHints(popover.wrapper, done); },
    });
    this.d = d;

    if (done) {
      d.highlight({
        element: `#${elementId}`,
        popover: {
          title: 'Tour complete',
          description: 'Data is as expected.',
          side: 'bottom',
          align: 'start',
          showButtons: ['next'], // a single "Done" button — no Prev/Close
          nextBtnText: 'Done',
        },
      });
      this.opts.onChange?.();
      return;
    }

    const step = this.tour.currentStep();
    const disableButtons: AllowedButtons[] = [];
    if (isFirst) disableButtons.push('previous');
    // The last step's Next ("Finish") is intentionally enabled — it executes the
    // step and transitions to the done state.

    d.highlight({
      element: `#${elementId}`,
      popover: {
        title: `Step ${stepNum ?? 1} of ${stepTotal}`,
        description: step ? asInstruction(step.text) : '',
        side: 'bottom',
        align: 'start',
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: isLast ? 'Finish' : 'Next →',
        prevBtnText: '← Prev',
        ...(disableButtons.length > 0 ? { disableButtons } : {}),
      },
    });
    this.opts.onChange?.();
  }

  /** Tear the overlay down and detach the keyboard handler. */
  destroy(): void {
    this.destroyOverlay();
    this.detachKeyboard();
  }

  private async advance(): Promise<void> {
    await this.tour.next();
    this.render();
  }

  private finish(): void {
    this.tour.finish();
    this.render();
    this.detachKeyboard();
  }

  private cancel(): void {
    this.tour.cancel();
    this.render();
    this.detachKeyboard();
  }

  private destroyOverlay(): void {
    this.silentDestroy = true;
    this.d?.destroy();
    this.d = null;
    this.silentDestroy = false;
  }

  private attachKeyboard(): void {
    if (this.keyHandler) return;
    this.keyHandler = (e: KeyboardEvent): void => {
      const done = this.tour.isDone();
      const active = this.tour.isActive();
      if (!active && !done) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || (done && e.key === 'Enter')) {
        e.preventDefault();
        if (done) this.finish(); else void this.advance();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!done && this.tour.currentStepNumber() !== 1) { this.tour.prev(); this.render(); }
      } else if (e.key === 'Escape') {
        this.cancel();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private detachKeyboard(): void {
    if (!this.keyHandler) return;
    window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = null;
  }
}

// Tour steps read as imperative instructions ("load …", "query …", "compare
// …"). The Gherkin keyword (Given/When/Then) is test structure, not something a
// learner needs — so the tour drops it and just capitalizes the step text.
function asInstruction(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

// Append a subtle keyboard-shortcut hint below the popover's button row.
// Driver.js has no slot for this, so inject a small muted footnote into the
// popover wrapper on each render. The id keeps it idempotent on re-render.
const KB_HINT_ID = 'tt-kb-hint';
function renderKbHints(wrapper: HTMLElement, done: boolean): void {
  if (wrapper.querySelector(`#${KB_HINT_ID}`)) return;
  const hint = document.createElement('div');
  hint.id = KB_HINT_ID;
  hint.textContent = done
    ? 'Enter or Space to finish'
    : '← Prev    → / Space Next    Esc Cancel';
  hint.style.cssText = [
    'padding: 8px 4px 2px',
    'font-size: 11px',
    'line-height: 1.4',
    'letter-spacing: 0.02em',
    'text-align: center',
    'opacity: 0.55',
    'user-select: none',
  ].join(';');
  wrapper.appendChild(hint);
}
