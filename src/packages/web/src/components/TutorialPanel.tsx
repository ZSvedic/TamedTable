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
  const stepNum = controller.currentTutorialStepNumber();
  const stepTotal = controller.tutorialStepCount();
  const names = controller.tutorialScenarioNames();
  const devNames = controller.devScenarioNames();
  const goldenRows = controller.goldenRows;
  const selectedTourName = controller.selectedTourName();
  const currentStep = controller.currentStepDetail();

  // Driver.js spotlight + popover with inline Prev/Next/Cancel buttons.
  useEffect(() => {
    const silentDestroy = (): void => {
      silentDestroyRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
      silentDestroyRef.current = false;
    };

    if (!active) {
      silentDestroy();
      return;
    }
    const elementId = controller.currentStepElementId();
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
      onNextClick:  () => { void controller.nextStep(); },
      onPrevClick:  () => { controller.prevStep(); },
      onCloseClick: () => { controller.cancelTutorial(); },
      // onDestroyStarted fires only when our silentDestroy() calls driver.destroy()
      // (programmatic, step-change cleanup). silentDestroyRef suppresses a spurious
      // cancelTutorial in that path.
      onDestroyStarted: () => { if (!silentDestroyRef.current) controller.cancelTutorial(); },
    });
    driverRef.current = d;

    const disableButtons: AllowedButtons[] = [];
    if (isFirst) disableButtons.push('previous');
    if (isLast)  disableButtons.push('next');

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
  }, [active, stepNum, stepTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation while a tour is active.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (stepNum !== stepTotal) void controller.nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (stepNum !== 1) controller.prevStep();
      } else if (e.key === 'Escape') {
        controller.cancelTutorial();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, controller, stepNum, stepTotal]);

  if (!open) return null;

  const labelStyle: React.CSSProperties = {
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 600,
    color: t.ink,
    marginBottom: space.px4,
  };

  return (
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
            /* Scenario picker */
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
            /* Active tour */
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

              {/* Keyboard hints */}
              <div
                style={{
                  fontFamily: typography.ui,
                  fontSize: typography.size.xs,
                  color: t.ink4,
                  display: 'flex',
                  gap: space.px8,
                  flexWrap: 'wrap',
                }}
              >
                <span><kbd style={kbdStyle}>←</kbd> prev</span>
                <span><kbd style={kbdStyle}>→</kbd> / <kbd style={kbdStyle}>Space</kbd> next</span>
                <span><kbd style={kbdStyle}>Esc</kbd> cancel</span>
              </div>

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
  );
}

// Tour steps read as imperative instructions ("load …", "query …", "compare
// …"). The Gherkin keyword (Given/When/Then) is test-suite structure, not
// something a learner needs — so the tour drops it and just capitalizes the
// step text for display.
function asInstruction(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 4px',
  borderRadius: 3,
  border: '1px solid currentColor',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  lineHeight: 1.4,
};
