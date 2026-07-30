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
   *  `Voilà, "<tour>" is done.`. Defaults to "Done.". */
  doneDescription?: string;
  /** Terminal-stop primary button label — defaults to "Done". */
  doneBtnText?: string;
  /** Terminal-stop secondary (stay) button label — defaults to "Stay here".
   *  Shown only when the cursor implements `stay()`. */
  stayBtnText?: string;
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
  // Some hosts mount a step's target lazily — the mobile composer rises only
  // when the tour reaches a chat step, a render after the cursor advanced. When
  // the target isn't there yet, re-attempt the spotlight for a short while
  // rather than leaving the popover stuck on the previous step.
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryFor: string | null = null;
  private retries = 0;
  // Fixed stand-in box for an oversized target (see spotlightTarget).
  private proxy: HTMLElement | null = null;
  // Scroll forwarding (watch-only blocks clicks, not scrolling): while the
  // overlay is up, Driver.js puts pointer-events:none on the whole page, so
  // wheel/touch scrolls would die. These handlers find the scrollable region
  // under the pointer geometrically and scroll it by hand.
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private touchStartHandler: ((e: TouchEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  private lastTouch: { x: number; y: number } | null = null;
  // Wheel events arrive in bursts — cache the found scroller briefly.
  private scrollHit: { el: HTMLElement; at: number } | null = null;

  constructor(tour: TourCursor, opts: TourUiOptions) {
    this.tour = tour;
    this.opts = opts;
  }

  /** Begin driving the UI for an already-armed tour (after `play()`): attach
   *  keyboard nav and render the first spotlight. */
  start(): void {
    this.attachKeyboard();
    this.attachScrollForwarding();
    this.render();
  }

  /** Re-sync the spotlight to the cursor's current state. Safe to call after
   *  every transition; tears the overlay down once the tour is over. */
  render(): void {
    const active = this.tour.isActive();
    const done = this.tour.isDone();
    if (!active && !done) {
      this.clearRetry();
      this.destroyOverlay();
      this.opts.onChange?.();
      return;
    }

    // On the terminal stop the step's own target may be gone — anchor to the
    // host's stable fallback element instead.
    const elementId = done ? this.opts.doneElementId : this.tour.currentStepElementId();
    const el = elementId ? document.getElementById(elementId) : null;
    if (!el) {
      // Target not mounted yet (a lazily-opened sheet). Re-attempt briefly; the
      // host's own re-render will also call render() once it mounts.
      this.scheduleRetry(elementId);
      return;
    }
    this.clearRetry();

    this.destroyOverlay();

    const total = this.tour.stepCount();
    const num = done ? total : (this.tour.currentStepNumber() ?? 1);
    const description = done
      ? (this.opts.doneDescription ?? 'Done.')
      : asInstruction(this.tour.currentStep()?.text ?? '');

    // The terminal stop offers a second exit when the cursor supports it:
    // "stay" keeps what the tour built on screen. The button rides in Driver's
    // previous-button slot — a first-class Driver.js button, no DOM injection —
    // and Esc then means stay, the non-destructive reading of "dismiss".
    const canStay = done && typeof this.tour.stay === 'function';

    const d = driver({
      animate: true,
      overlayOpacity: 0.25,
      allowClose: true,
      // Tours are watch-only: the spotlighted element is not clickable —
      // Next/Esc are the only controls, and the popover narrates what the
      // tour itself is doing ("Opening the sample …").
      disableActiveInteraction: true,
      // Esc dismisses (allowClose), but an accidental overlay click must not —
      // a no-op behavior keeps the tour from vanishing on a stray click.
      overlayClickBehavior: () => {},
      onDestroyStarted: () => {
        if (this.silentDestroy) return;
        if (canStay) this.stay(); else this.cancel();
      },
      onPopoverRender: (popover) => { this.applyTheme(popover.wrapper); },
    });
    this.d = d;

    d.highlight({
      element: this.spotlightTarget(el),
      popover: {
        description,
        side: 'bottom',
        align: 'start',
        // Driver's own footer: progress on the left, forward button on the
        // right (no close button). Steps are forward-only; the previous slot
        // appears only on the terminal stop, repurposed as the stay button.
        showButtons: canStay ? ['previous', 'next'] : ['next'],
        showProgress: true,
        progressText: `${num} of ${total}`,
        nextBtnText: done ? (this.opts.doneBtnText ?? 'Done') : 'Next &rarr;',
        prevBtnText: this.opts.stayBtnText ?? 'Stay here',
        onNextClick: () => { if (done) this.finish(); else void this.advance(); },
        onPrevClick: () => { this.stay(); },
        onCloseClick: () => { if (canStay) this.stay(); else this.cancel(); },
      },
    });
    this.opts.onChange?.();
  }

  /** Tear the overlay down and detach the keyboard and scroll handlers. */
  destroy(): void {
    this.clearRetry();
    this.destroyOverlay();
    this.detachKeyboard();
    this.detachScrollForwarding();
  }

  // Re-attempt render() until the step's target mounts, capped so a target that
  // never appears stops spinning (the popover then stays on the prior step).
  private scheduleRetry(elementId: string | null): void {
    if (this.retryFor !== elementId) {
      this.retryFor = elementId;
      this.retries = 0;
    }
    if (this.retries >= 25) return; // ~2s of 80ms ticks, then give up
    this.retries += 1;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.render();
    }, 80);
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryFor = null;
    this.retries = 0;
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
    // The stay button (Driver's previous slot) reads as secondary: outlined on
    // the popover background, next to the filled primary.
    const prev = wrapper.querySelector('.driver-popover-prev-btn') as HTMLElement | null;
    if (prev) {
      prev.style.textShadow = 'none';
      if (theme.background) prev.style.background = theme.background;
      if (theme.border) prev.style.borderColor = theme.border;
      if (theme.text) prev.style.color = theme.text;
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
    this.detachScrollForwarding();
  }

  private stay(): void {
    this.tour.stay?.();
    this.render();
    this.detachKeyboard();
    this.detachScrollForwarding();
  }

  private cancel(): void {
    this.tour.cancel();
    this.render();
    this.detachKeyboard();
    this.detachScrollForwarding();
  }

  // ── Scroll forwarding ──────────────────────────────────────────────────────
  // Watch-only blocks clicks, not scrolling (behavior.md § TourUi). While the
  // overlay is up, Driver.js disables pointer events across the page, which
  // also swallows wheel/touch scrolling — so hit-testing (elementsFromPoint)
  // can't see the page either. Instead, find the innermost scrollable element
  // whose box contains the pointer geometrically and scroll it directly.
  // Scrolls over the popover stay with the popover; when nothing scrollable
  // sits under the pointer the event keeps its default (the phone's document
  // scroller still works untouched).

  private attachScrollForwarding(): void {
    if (this.wheelHandler) return;
    this.wheelHandler = (e: WheelEvent): void => {
      if (!this.d || this.overPopover(e.target)) return;
      const el = this.scrollableAt(e.clientX, e.clientY);
      if (!el) return;
      // Normalize line/page wheel deltas (deltaMode 1/2) to pixels.
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      el.scrollLeft += e.deltaX * scale;
      el.scrollTop += e.deltaY * scale;
      e.preventDefault();
    };
    this.touchStartHandler = (e: TouchEvent): void => {
      const t = e.touches.length === 1 ? e.touches[0] : undefined;
      this.lastTouch = this.d && t ? { x: t.clientX, y: t.clientY } : null;
    };
    this.touchMoveHandler = (e: TouchEvent): void => {
      const t = e.touches.length === 1 ? e.touches[0] : undefined;
      if (!this.d || !t || !this.lastTouch || this.overPopover(e.target)) return;
      const dx = this.lastTouch.x - t.clientX;
      const dy = this.lastTouch.y - t.clientY;
      this.lastTouch = { x: t.clientX, y: t.clientY };
      const el = this.scrollableAt(t.clientX, t.clientY);
      if (!el) return;
      el.scrollLeft += dx;
      el.scrollTop += dy;
      e.preventDefault();
    };
    window.addEventListener('wheel', this.wheelHandler, { passive: false, capture: true });
    window.addEventListener('touchstart', this.touchStartHandler, { passive: true, capture: true });
    window.addEventListener('touchmove', this.touchMoveHandler, { passive: false, capture: true });
  }

  private detachScrollForwarding(): void {
    if (this.wheelHandler) window.removeEventListener('wheel', this.wheelHandler, { capture: true });
    if (this.touchStartHandler) window.removeEventListener('touchstart', this.touchStartHandler, { capture: true });
    if (this.touchMoveHandler) window.removeEventListener('touchmove', this.touchMoveHandler, { capture: true });
    this.wheelHandler = null;
    this.touchStartHandler = null;
    this.touchMoveHandler = null;
    this.lastTouch = null;
    this.scrollHit = null;
  }

  private overPopover(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('.driver-popover') !== null;
  }

  // The innermost scrollable element under the point — overflowing content
  // plus an auto/scroll overflow style — with driver chrome and the spotlight
  // proxy skipped. Wheel events arrive in bursts, so the last hit is reused
  // while the pointer stays inside it.
  private scrollableAt(x: number, y: number): HTMLElement | null {
    const now = Date.now();
    const hit = this.scrollHit;
    if (hit && now - hit.at < 300 && hit.el.isConnected) {
      const r = hit.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        hit.at = now;
        return hit.el;
      }
    }
    let best: HTMLElement | null = null;
    let bestArea = Infinity;
    for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
      if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) continue;
      if (el.closest('.driver-popover') || el.hasAttribute('data-gt-spotlight-proxy')) continue;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const s = getComputedStyle(el);
      if (!/(auto|scroll)/.test(s.overflowY + s.overflowX)) continue;
      const area = r.width * r.height;
      if (area < bestArea) {
        best = el;
        bestArea = area;
      }
    }
    this.scrollHit = best ? { el: best, at: now } : null;
    return best;
  }

  // A target can be larger than the screen — the app's table fills it. A
  // cutout that big leaves the popover nowhere to sit, and Driver's
  // scroll-into-view yanks the page. Spotlight a fixed stand-in box clamped
  // to the target's visible top region instead, so the cutout and the popover
  // below it always fit on screen together. Small targets pass through and
  // keep Driver's own scroll-into-view behavior.
  private spotlightTarget(el: HTMLElement): HTMLElement {
    this.removeProxy();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxH = vh * 0.55;
    let rect = el.getBoundingClientRect();
    if (rect.height <= maxH && rect.width <= vw) return el;

    // The visible slice of the target; if it is (almost) fully off screen,
    // bring it on first so the clamp has something to cover.
    if (Math.min(rect.bottom, vh) - Math.max(rect.top, 0) < 40) {
      el.scrollIntoView({ block: 'nearest' });
      rect = el.getBoundingClientRect();
    }
    const top = Math.max(rect.top, 0);
    const left = Math.max(rect.left, 0);
    const width = Math.min(rect.right, vw) - left;
    const height = Math.min(Math.min(rect.bottom, vh) - top, maxH);

    const proxy = document.createElement('div');
    proxy.setAttribute('data-gt-spotlight-proxy', '');
    proxy.style.cssText =
      `position:fixed;top:${top}px;left:${left}px;width:${width}px;height:${height}px;` +
      'pointer-events:none;';
    document.body.appendChild(proxy);
    this.proxy = proxy;
    return proxy;
  }

  private removeProxy(): void {
    this.proxy?.remove();
    this.proxy = null;
  }

  private destroyOverlay(): void {
    this.silentDestroy = true;
    this.d?.destroy();
    this.d = null;
    this.silentDestroy = false;
    this.removeProxy();
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

// Tours are watch-only, so each popover narrates progressively — "watch this
// happen", never an instruction to act. The Gherkin keyword (Given/When/Then)
// is test structure, not something a learner needs, so it is dropped.
//
// A `query "…"` step's text is typed into the chat box when the step is
// highlighted, so the popover doesn't repeat it. A `speak "…"` step is the
// voice analogue: the clip plays for the learner, who watches the Speak
// control it highlights.
function asInstruction(text: string): string {
  if (/^query "(.+)"$/.test(text)) return 'Typing and running the query…';
  if (/^speak "(.+)"$/.test(text)) return 'Speaking and running the voice query…';
  // The load step opens a bundled sample (the UI's "Open sample…" action), so
  // the narration names that action — and the file — rather than echoing the
  // Gherkin verb.
  const load = text.match(/^load "(.+)"$/);
  if (load) return `Opening the sample "${load[1]}"…`;
  if (/^loads? the shuffled sample$/.test(text)) return 'Loading the shuffled sample…';
  if (/^opens? the run-on-all estimate dialog$/.test(text)) return 'Opening the run-on-all estimate…';
  // The remaining-row count is the lazy showcase's fixture math
  // (showcase-lazy-input.csv: 25,000 rows − the 100-row evaluated page).
  if (/^declines? the estimate with "Not yet"$/.test(text)) {
    return 'Choosing "Not yet". "Run all" would clean the remaining 24,900 rows but it would take some time.';
  }
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}…`;
}
