// #GherkinTour
// Reusable tour UI: a Driver.js spotlight + popover (Previous / Next / Finish,
// each with a key-cap badge of its keyboard shortcut before the label) and
// keyboard navigation, driving a TourDriver. This is the only entry point that
// pulls in driver.js — the parser and driver in `./index.ts` stay zero-dep, so a
// consumer that only needs `parseTours` / `TourDriver` never ships driver.js.
//
// Lifted, host-agnostic, from the app's TutorialPanel.tsx: the React component
// kept the same Driver.js options, the same Prev/Next/Cancel wiring, and the
// same keyboard map — only the state now lives in TourDriver instead of the
// controller, and the spotlight targets come from the adapter's element ids.
import { driver } from 'driver.js';
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

  /** Begin driving the UI for an already-armed tour (after `driver.play()`):
   *  attach keyboard nav and render the first spotlight. */
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

    const d = driver({
      animate: false,
      overlayOpacity: 0.25,
      // Buttons live in our own footer (renderFooter) — driver renders none.
      allowClose: false,
      showButtons: [],
      onDestroyStarted: () => { if (!this.silentDestroy) this.cancel(); },
      onPopoverRender: (popover) => { this.renderFooter(popover.wrapper, done, isFirst); },
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
        },
      });
      this.opts.onChange?.();
      return;
    }

    const step = this.tour.currentStep();
    d.highlight({
      element: `#${elementId}`,
      popover: {
        title: `Step ${stepNum ?? 1} of ${stepTotal}`,
        description: step ? asInstruction(step.text) : '',
        side: 'bottom',
        align: 'start',
      },
    });
    this.opts.onChange?.();
  }

  /** Tear the overlay down and detach the keyboard handler. */
  destroy(): void {
    this.destroyOverlay();
    this.detachKeyboard();
  }

  // Replace Driver.js's button row with our own footer: Previous + Next grouped
  // on the left, Finish on the right, each with a key-cap badge of its keyboard
  // shortcut before the label. Driver has no slot for this, so we hide its
  // (empty) footer and append ours to the popover wrapper on each render.
  private renderFooter(wrapper: HTMLElement, done: boolean, isFirst: boolean): void {
    wrapper.querySelector('#tt-tour-footer')?.remove();
    const defFooter = wrapper.querySelector('.driver-popover-footer') as HTMLElement | null;
    if (defFooter) defFooter.style.display = 'none';

    // Driver caps the popover at 300px; the three-button row needs more, and the
    // extra width past the left group is what visually separates Next from Finish.
    wrapper.style.maxWidth = 'none';
    wrapper.style.minWidth = '370px';

    const footer = document.createElement('div');
    footer.id = 'tt-tour-footer';
    footer.style.cssText =
      'display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-top:14px';

    const left = document.createElement('div');
    left.style.cssText = 'display:flex;gap:8px';
    left.appendChild(this.footerButton('Previous', '←', done || isFirst,
      () => { this.tour.prev(); this.render(); }));
    left.appendChild(this.footerButton('Next', '→', done,
      () => { void this.advance(); }));

    const right = document.createElement('div');
    // margin-left guarantees a clear gap before Finish even if the popover does
    // not stretch to its min-width; space-between pushes it further right.
    right.style.cssText = 'display:flex;gap:8px;margin-left:24px';
    right.appendChild(this.footerButton('Finish', '↵', false,
      () => { this.finish(); }));

    footer.appendChild(left);
    footer.appendChild(right);
    wrapper.appendChild(footer);
  }

  /** One footer button: a key-cap badge for its shortcut, then the label. */
  private footerButton(label: string, key: string, disabled: boolean, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = disabled;
    btn.style.cssText = [
      'font:inherit', 'font-size:13px', 'display:inline-flex', 'align-items:center', 'gap:7px',
      'padding:5px 11px', 'border:1px solid', 'border-radius:6px', 'background:transparent',
      `cursor:${disabled ? 'default' : 'pointer'}`, `opacity:${disabled ? '0.4' : '1'}`,
    ].join(';');
    if (!disabled) btn.addEventListener('click', onClick);

    const cap = document.createElement('span');
    cap.textContent = key;
    cap.style.cssText = [
      'display:inline-flex', 'align-items:center', 'justify-content:center',
      'min-width:18px', 'height:18px', 'padding:0 4px', 'border:1px solid',
      'border-radius:4px', 'font-size:11px', 'line-height:1', 'opacity:0.7',
    ].join(';');

    btn.appendChild(cap);
    btn.appendChild(document.createTextNode(label));
    return btn;
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
      if (e.key === 'Enter') {
        e.preventDefault();
        this.finish();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
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
