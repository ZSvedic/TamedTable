// #GherkinTour
// Reusable tour UI: a Driver.js spotlight + popover driving a TourCursor. The
// popover uses Driver.js's own footer — its Next/Done button, its "X of Y"
// progress, its animation, and Esc-to-cancel — so there is no hand-rolled button
// row or key-cap badges to maintain. The tour only moves forward: there is no
// Previous button and no ← key (stepping back would desync the app's replay
// engine, so it was removed rather than made to undo state).
//
// This is the only entry point that pulls in driver.js — the parser and driver
// in `./index.ts` stay zero-dep, so a consumer that only needs `parseTours` /
// `TourDriver` never ships driver.js.
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { TourCursor } from './index.ts';

/** Optional color overrides so the popover matches a host theme. All fields are
 *  color strings supplied by the host (the app passes its ui-kit tokens); the
 *  package itself hard-codes no colors. Omit `theme` to keep Driver.js's default
 *  styling. */
export interface TourUiTheme {
  /** Popover box background. */            background?: string;
  /** Popover body + footer text. */        text?: string;
  /** Popover box + control borders. */     border?: string;
  /** Title / emphasis color. */            accent?: string;
  /** Primary (Next/Done) button fill — defaults to `accent`. */ primaryBg?: string;
  /** Primary button label color — defaults to `background`. */  primaryText?: string;
}

export interface TourUiOptions {
  /** Element the terminal popover anchors to — a step's own target may be gone
   *  by the time the tour is done, so the host names a stable fallback. */
  doneElementId: string;
  /** Run after every state change so the host can sync its own view (e.g. show
   *  a prefilled chat input) and re-render if a spotlight target appeared. */
  onChange?: () => void;
  /** Terminal-stop text — shown after the last real step has run, e.g.
   *  `Voilà, the "<tour>" tour is done.`. Defaults to "Done.". */
  doneDescription?: string;
  /** Host theme colors for the popover; omit to keep Driver.js defaults. */
  theme?: TourUiTheme;
}

/** Drives a Driver.js overlay from a TourCursor: spotlights the current step,
 *  wires Driver's own Next/Done button and keyboard back to the cursor, and
 *  re-renders on every transition. Host-agnostic — all DOM ids come from the
 *  cursor (`currentStepElementId`) plus the `doneElementId` fallback. */
export class TourUi {
  private readonly tour: TourCursor;
  private readonly opts: TourUiOptions;
  private d: ReturnType<typeof driver> | null = null;
  // True while our code is programmatically destroying the overlay (step change,
  // cleanup) — suppresses the spurious cancel that onDestroyStarted would fire.
  private silentDestroy = false;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(tour: TourCursor, opts: TourUiOptions) {
    this.tour = tour;
    this.opts = opts;
  }

  /** Begin driving the UI for an already-armed tour (after `play()`): attach
   *  keyboard nav and render the first spotlight. */
  start(): void {
    this.attachKeyboard();
    this.render();
  }

  /** Re-sync the spotlight to the cursor's current state. Safe to call after
   *  every transition; tears the overlay down once the tour is over. */
  render(): void {
    const active = this.tour.isActive();
    const done = this.tour.isDone();
    if (!active && !done) {
      this.destroyOverlay();
      this.opts.onChange?.();
      return;
    }

    // On the terminal stop the step's own target may be gone — anchor to the
    // host's stable fallback element instead.
    const elementId = done ? this.opts.doneElementId : this.tour.currentStepElementId();
    const el = elementId ? document.getElementById(elementId) : null;
    if (!el) return; // target not mounted yet; the host re-renders once it is

    this.destroyOverlay();

    const total = this.tour.stepCount();
    const num = done ? total : (this.tour.currentStepNumber() ?? 1);
    const description = done
      ? (this.opts.doneDescription ?? 'Done.')
      : asInstruction(this.tour.currentStep()?.text ?? '');

    const d = driver({
      animate: true,
      overlayOpacity: 0.25,
      allowClose: true,
      // Esc cancels (allowClose), but an accidental overlay click must not — a
      // no-op behavior keeps the tour from vanishing on a stray click.
      overlayClickBehavior: () => {},
      onDestroyStarted: () => { if (!this.silentDestroy) this.cancel(); },
      onPopoverRender: (popover) => { this.applyTheme(popover.wrapper); },
    });
    this.d = d;

    d.highlight({
      element: `#${elementId}`,
      popover: {
        description,
        side: 'bottom',
        align: 'start',
        // Driver's own footer: progress on the left, a single forward button on
        // the right (no Previous, no close button). Esc still cancels.
        showButtons: ['next'],
        showProgress: true,
        progressText: `${num} of ${total}`,
        nextBtnText: done ? 'Done' : 'Next &rarr;',
        onNextClick: () => { if (done) this.finish(); else void this.advance(); },
        onCloseClick: () => { this.cancel(); },
      },
    });
    this.opts.onChange?.();
  }

  /** Tear the overlay down and detach the keyboard handler. */
  destroy(): void {
    this.destroyOverlay();
    this.detachKeyboard();
  }

  // Paint the popover box, description, and Driver's footer controls with the
  // host's theme colors. No-op without a theme — the popover then keeps
  // Driver.js's default styling. No color literals here: every value comes from
  // the host-supplied theme.
  private applyTheme(wrapper: HTMLElement): void {
    const theme = this.opts.theme;
    if (!theme) return;
    if (theme.background) wrapper.style.background = theme.background;
    if (theme.text) wrapper.style.color = theme.text;
    if (theme.border) {
      wrapper.style.borderStyle = 'solid';
      wrapper.style.borderWidth = '1px';
      wrapper.style.borderColor = theme.border;
    }
    const desc = wrapper.querySelector('.driver-popover-description') as HTMLElement | null;
    if (desc && theme.text) desc.style.color = theme.text;
    const progress = wrapper.querySelector('.driver-popover-progress-text') as HTMLElement | null;
    if (progress && theme.text) progress.style.color = theme.text;
    const next = wrapper.querySelector('.driver-popover-next-btn') as HTMLElement | null;
    if (next) {
      next.style.textShadow = 'none';
      // A solid primary button (matches the host's primary button, e.g. "Load"):
      // a strong fill with a contrasting label, the same color for the border so
      // it reads as filled — not the low-contrast accent tint that looked disabled.
      const bg = theme.primaryBg ?? theme.accent;
      const fg = theme.primaryText ?? theme.background;
      if (bg) { next.style.background = bg; next.style.borderColor = bg; }
      if (fg) next.style.color = fg;
    }
    // The arrow's visible side is filled with the popover background; retint just
    // that side so it doesn't stay Driver's default light color on a dark theme.
    if (theme.background) {
      const arrow = wrapper.querySelector('.driver-popover-arrow') as HTMLElement | null;
      const side = (['top', 'bottom', 'left', 'right'] as const)
        .find((s) => arrow?.classList.contains(`driver-popover-arrow-side-${s}`));
      if (arrow && side) {
        const prop = `border${side[0]!.toUpperCase()}${side.slice(1)}Color` as
          'borderTopColor' | 'borderBottomColor' | 'borderLeftColor' | 'borderRightColor';
        arrow.style[prop] = theme.background;
      }
    }
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

  // Driver binds its arrow keys only in multi-step drive mode; we drive single
  // highlights, so bind the one forward key ourselves. → / Space / Enter advance
  // (or finish on the terminal stop); Esc cancels through Driver's own handler.
  // There is deliberately no ← key.
  private attachKeyboard(): void {
    if (this.keyHandler) return;
    this.keyHandler = (e: KeyboardEvent): void => {
      const done = this.tour.isDone();
      if (!this.tour.isActive() && !done) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (done) this.finish(); else void this.advance();
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

// Tour steps read as imperative instructions ("load …", "query …"). The Gherkin
// keyword (Given/When/Then) is test structure, not something a learner needs —
// so the tour drops it and just capitalizes the step text.
//
// A `query "…"` step is special: its text is typed into the chat box when the
// step is highlighted, so the popover doesn't repeat it — it just tells the
// learner to run what they can already see in the input.
function asInstruction(text: string): string {
  if (/^query "(.+)"$/.test(text)) return 'Run the query';
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}
