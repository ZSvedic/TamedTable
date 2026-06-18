// #TutorialMode
import { useEffect, useRef, type ReactNode } from 'react';
import { driver, type AllowedButtons } from 'driver.js';
import 'driver.js/dist/driver.css';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button, Icon } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

export function TutorialPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  // True while our code is programmatically destroying the driver (step change,
  // cleanup) — prevents onDestroyStarted from firing cancelTutorial().
  const silentDestroyRef = useRef(false);

  const open = controller.tutorialOpen;
  const active = controller.isTutorialActive();
  const done = controller.isTutorialDone();
  const stepNum = controller.currentTutorialStepNumber();
  const stepTotal = controller.tutorialStepCount();
  const names = controller.tutorialScenarioNames();
  const devNames = controller.devScenarioNames();
  const goldenRows = controller.goldenRows;
  const selectedTourName = controller.selectedTourName();
  const currentStep = controller.currentStepDetail();

  // Driver.js spotlight + popover with inline Prev/Next/Cancel buttons. Runs for
  // both an active step and the final done state, even though the slide-over
  // panel is closed during a tour (so the data table stays visible). The done
  // state shows a completion popover whose single "Done" button ends the tour and
  // returns the user to their source (chooser panel or referring page).
  useEffect(() => {
    const silentDestroy = (): void => {
      silentDestroyRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
      silentDestroyRef.current = false;
    };

    if (!active && !done) {
      silentDestroy();
      return;
    }

    // In the done state the step's own target may be gone — anchor to the table.
    const elementId = done ? 'tutorial-table-view' : controller.currentStepElementId();
    const el = elementId ? document.getElementById(elementId) : null;
    if (!el) return;

    silentDestroy();

    const isFirst = stepNum === 1;
    const isLast  = stepNum === stepTotal;

    const d = driver({
      animate: false,
      overlayOpacity: 0.25,
      // Prevent Driver.js overlay and Escape key from dismissing the tour —
      // only the explicit close/cancel controls should do that.
      allowClose: false,
      // Done: the lone "Done" button ends the tour and navigates back to source.
      // Mid-tour: Next executes the current step and advances.
      onNextClick:  () => { if (done) controller.finishTutorial(); else void controller.nextStep(); },
      onPrevClick:  () => { controller.prevStep(); },
      onCloseClick: () => { controller.cancelTutorial(); },
      // onDestroyStarted fires only when our silentDestroy() calls driver.destroy()
      // (programmatic, step-change cleanup). silentDestroyRef suppresses a spurious
      // cancelTutorial in that path.
      onDestroyStarted: () => { if (!silentDestroyRef.current) controller.cancelTutorial(); },
      // Subtle keyboard-shortcut hints, rendered below the popover buttons.
      onPopoverRender: (popover) => { renderKbHints(popover.wrapper, done); },
    });
    driverRef.current = d;

    if (done) {
      d.highlight({
        element: `#${elementId}`,
        popover: {
          title: 'Tutorial complete',
          description: 'Data is as expected.',
          side: 'bottom',
          align: 'start',
          showButtons: ['next'], // a single "Done" button — no Prev/Close
          nextBtnText: 'Done',
        },
      });
      return () => { silentDestroy(); };
    }

    const disableButtons: AllowedButtons[] = [];
    if (isFirst) disableButtons.push('previous');
    // Finish (last step's Next button) is intentionally NOT disabled — clicking
    // it executes the step and transitions to the done state.

    d.highlight({
      element: `#${elementId}`,
      popover: {
        title: `Step ${stepNum ?? 1} of ${stepTotal}`,
        description: currentStep ? asInstruction(currentStep.text) : '',
        side: 'bottom',
        align: 'start',
        // highlight() defaults showButtons:[] — override to show our buttons.
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: isLast ? 'Finish' : 'Next →',
        prevBtnText: '← Prev',
        ...(disableButtons.length > 0 ? { disableButtons } : {}),
      },
    });
    return () => { silentDestroy(); };
  }, [active, done, stepNum, stepTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation while a tour is active or awaiting the final Done.
  useEffect(() => {
    if (!active && !done) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight' || e.key === ' ' || (done && e.key === 'Enter')) {
        e.preventDefault();
        // Done: end the tour; otherwise advance (the last step enters done).
        if (done) controller.finishTutorial();
        else void controller.nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!done && stepNum !== 1) controller.prevStep();
      } else if (e.key === 'Escape') {
        controller.cancelTutorial();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, done, controller, stepNum, stepTotal]);

  // Render nothing when there is nothing to show and no active Driver.js effects.
  if (!open && !active && !done) return null;

  const labelStyle: React.CSSProperties = {
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 600,
    color: t.ink,
    marginBottom: space.px4,
  };

  return (
    <>
      {/* Visual panel — only rendered when open. Driver.js + keyboard effects
          above stay mounted as long as the component renders (active or done). */}
      {open && (
        <div
          onClick={() => { controller.closeTutorial(); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: t.overlay,
            display: 'flex',
            justifyContent: 'flex-end',
            // Must exceed Driver.js's overlay z-index (~100000) so the panel
            // buttons remain clickable when a spotlight is active.
            zIndex: 200000,
          }}
        >
          <div
            data-testid="tutorial-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 400,
              maxWidth: '92vw',
              height: '100%',
              background: t.surface,
              borderLeft: `1px solid ${t.line2}`,
              boxShadow: t.shadowLg,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* header */}
            <div
              style={{
                height: space.topbarH,
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                padding: `0 ${space.px14}px`,
                borderBottom: `1px solid ${t.line}`,
              }}
            >
              <span
                style={{
                  fontFamily: typography.ui,
                  fontSize: typography.size.md,
                  fontWeight: 600,
                  color: t.ink,
                }}
              >
                Tutorial
              </span>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => { controller.closeTutorial(); }}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: space.px4,
                  cursor: 'pointer',
                  color: t.ink3,
                  display: 'flex',
                }}
              >
                <Icon name="x" />
              </button>
            </div>

            {/* body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: space.px16,
                display: 'flex',
                flexDirection: 'column',
                gap: space.px16,
              }}
            >
              {!active ? (
                /* Scenario picker. The done state is shown in the Driver.js
                   completion popover, not here — the panel stays closed during a
                   tour, so a deep-link visitor never sees this slide-over. */
                <div>
                  <div style={labelStyle}>Pick a tutorial</div>
                  {names.length === 0 ? (
                    <div
                      style={{
                        fontFamily: typography.ui,
                        fontSize: typography.size.sm,
                        color: t.ink3,
                        padding: `${space.px8}px 0`,
                      }}
                    >
                      No tutorials available.
                    </div>
                  ) : (
                    <div role="listbox" style={{ display: 'flex', flexDirection: 'column', gap: space.px4 }}>
                      {names.map((name) => {
                        const selected = name === selectedTourName;
                        return (
                          <button
                            key={name}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => { controller.selectTutorialScenario(name); }}
                            onDoubleClick={() => { controller.selectTutorialScenario(name); void controller.playTutorial(); }}
                            style={{
                              textAlign: 'left',
                              padding: '8px 10px',
                              border: `1px solid ${selected ? t.accent : t.line2}`,
                              borderRadius: space.radiusSm,
                              background: selected ? t.accentSoft : t.surface2,
                              color: t.ink,
                              fontFamily: typography.ui,
                              fontSize: typography.size.base,
                              fontWeight: selected ? 600 : 400,
                              cursor: 'pointer',
                            }}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Dev: any @web scenario, for smoke-testing without opening the .feature file. */}
                  {devNames.length > 0 && (
                    <div style={{ marginTop: space.px16 }}>
                      <div style={{ ...labelStyle, color: t.ink3 }}>Dev — run any scenario</div>
                      <select
                        value={devNames.includes(selectedTourName) ? selectedTourName : ''}
                        onChange={(e) => { if (e.target.value) controller.selectTutorialScenario(e.target.value); }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: `1px solid ${t.line2}`,
                          borderRadius: space.radiusSm,
                          background: t.surface2,
                          color: t.ink,
                          fontFamily: typography.ui,
                          fontSize: typography.size.base,
                          cursor: 'pointer',
                          appearance: 'auto',
                        }}
                      >
                        <option value="">Select a scenario…</option>
                        {devNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ marginTop: space.px12 }}>
                    <Button
                      variant="primary"
                      onClick={() => { void controller.playTutorial(); }}
                      disabled={selectedTourName === ''}
                    >
                      Play
                    </Button>
                  </div>
                </div>
              ) : (
                /* Active tour — panel is normally closed during a tour, but may
                   briefly render here (e.g. when open=true during a step transition). */
                <div style={{ display: 'flex', flexDirection: 'column', gap: space.px12 }}>
                  <div
                    style={{
                      fontFamily: typography.ui,
                      fontSize: typography.size.sm,
                      color: t.ink3,
                    }}
                  >
                    {selectedTourName}
                  </div>
                  <div
                    data-testid="tutorial-step"
                    style={{
                      fontFamily: typography.ui,
                      fontSize: typography.size.sm,
                      fontWeight: 600,
                      color: t.accent,
                    }}
                  >
                    Step {stepNum} of {stepTotal}
                  </div>
                  {currentStep && (
                    <div
                      style={{
                        fontFamily: typography.ui,
                        fontSize: typography.size.base,
                        color: t.ink,
                        lineHeight: 1.5,
                        padding: `${space.px8}px ${space.px10}px`,
                        background: t.surface2,
                        borderRadius: space.radiusSm,
                        border: `1px solid ${t.line}`,
                      }}
                    >
                      {asInstruction(currentStep.text)}
                    </div>
                  )}

                  {/* Golden rows comparison */}
                  {goldenRows && (
                    <div>
                      <div style={{ ...labelStyle, marginBottom: space.px8 }}>
                        Expected output ({goldenRows.length} rows)
                      </div>
                      <div
                        style={{
                          overflowX: 'auto',
                          border: `1px solid ${t.line}`,
                          borderRadius: space.radiusSm,
                          maxHeight: 240,
                          overflowY: 'auto',
                        }}
                      >
                        <table
                          style={{
                            borderCollapse: 'collapse',
                            width: '100%',
                            fontFamily: typography.mono,
                            fontSize: typography.size.xs,
                          }}
                        >
                          {goldenRows.length > 0 && (
                            <thead>
                              <tr>
                                {Object.keys(goldenRows[0]!).map((col) => (
                                  <th
                                    key={col}
                                    style={{
                                      padding: '4px 8px',
                                      textAlign: 'left',
                                      borderBottom: `1px solid ${t.line}`,
                                      background: t.surface,
                                      color: t.ink2,
                                      whiteSpace: 'nowrap',
                                      position: 'sticky',
                                      top: 0,
                                    }}
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {goldenRows.map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).map((val, j) => (
                                  <td
                                    key={j}
                                    style={{
                                      padding: '3px 8px',
                                      borderBottom: `1px solid ${t.line}`,
                                      color: t.ink,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {val === null ? (
                                      <span style={{ color: t.ink4 }}>null</span>
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Tour steps read as imperative instructions ("load …", "query …", "compare
// …"). The Gherkin keyword (Given/When/Then) is test-suite structure, not
// something a learner needs — so the tour drops it and just capitalizes the
// step text for display.
function asInstruction(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

// Append a subtle keyboard-shortcut hint line below the popover's button row.
// Driver.js has no slot for this, so we inject a small muted footnote into the
// popover wrapper (after the footer) on each render. The id keeps it idempotent
// if Driver re-renders the same popover.
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
