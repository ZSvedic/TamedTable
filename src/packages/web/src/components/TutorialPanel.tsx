// #TutorialMode
import { useEffect, type ReactNode } from 'react';
import { TourUi } from '@tamedtable/gherkin-tour/ui';
import type { TourCursor } from '@tamedtable/gherkin-tour';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button, Icon } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

export function TutorialPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();

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

  // The tour's spotlight, popover footer, and keyboard navigation are the shared
  // gherkin-tour TourUi — the same code the standalone demo runs, so the app and
  // the demo can no longer drift. We hand it a TourCursor backed by the
  // controller (which owns the cursor, engine, and cassette replay) plus the
  // app's theme colors. The slide-over panel below (chooser + golden table) stays
  // app-specific. A fresh TourUi is built whenever a tour becomes active or done
  // and torn down on the next transition (or unmount).
  useEffect(() => {
    if (!active && !done) return;
    const cursor: TourCursor = {
      isActive:             () => controller.isTutorialActive(),
      isDone:               () => controller.isTutorialDone(),
      currentStep:          () => controller.currentStepDetail(),
      currentStepElementId: () => controller.currentStepElementId(),
      currentStepNumber:    () => controller.currentTutorialStepNumber(),
      stepCount:            () => controller.tutorialStepCount(),
      next:                 () => controller.nextStep(),
      prev:                 () => { controller.prevStep(); },
      finish:               () => { controller.finishTutorial(); },
      cancel:               () => { controller.cancelTutorial(); },
    };
    const ui = new TourUi(cursor, {
      // In the done state the step's own target may be gone — anchor to the table.
      doneElementId: 'tutorial-table-view',
      doneTitle: 'Tutorial complete',
      theme: { background: t.surface, text: t.ink, border: t.line2, accent: t.accent },
    });
    ui.start();
    return () => { ui.destroy(); };
  }, [active, done]); // eslint-disable-line react-hooks/exhaustive-deps

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
