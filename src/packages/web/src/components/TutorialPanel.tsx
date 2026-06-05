// #TutorialMode
import { useEffect, useRef, type ReactNode } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { space, typography } from '../lib/theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useTheme } from '../hooks/useTheme.tsx';
import { Button } from './Button.tsx';
import { Icon } from './Icons.tsx';

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
  const goldenRows = controller.goldenRows;
  const selectedTourName = controller.selectedTourName();
  const currentStep = controller.currentStepDetail();

  // Driver.js spotlight on active step
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
    const d = driver({
      animate: false,
      overlayOpacity: 0.25,
      // Only fire cancelTutorial when the user dismisses (Escape / overlay click),
      // not when our code programmatically replaces the driver on step changes.
      onDestroyStarted: () => { if (!silentDestroyRef.current) controller.cancelTutorial(); },
    });
    driverRef.current = d;
    d.highlight({
      element: `#${elementId}`,
      popover: {
        title: `Step ${stepNum ?? 1} of ${stepTotal}`,
        description: currentStep ? `${currentStep.keyword} ${currentStep.text}` : '',
        side: 'bottom',
        align: 'start',
      },
    });
    return () => { silentDestroy(); };
  }, [active, stepNum, stepTotal]); // eslint-disable-line react-hooks/exhaustive-deps

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
        zIndex: 100,
      }}
    >
      <div
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
                <select
                  value={selectedTourName}
                  onChange={(e) => { controller.selectTutorialScenario(e.target.value); }}
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
                  {names.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
              <div style={{ marginTop: space.px12 }}>
                <Button
                  variant="primary"
                  onClick={() => { void controller.playTutorial(); }}
                  disabled={names.length === 0}
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
                  <span style={{ color: t.ink3, marginRight: space.px6 }}>
                    {currentStep.keyword}
                  </span>
                  {currentStep.text}
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

        {/* footer */}
        {active && (
          <div
            style={{
              flex: '0 0 auto',
              display: 'flex',
              gap: space.px8,
              padding: space.px14,
              borderTop: `1px solid ${t.line}`,
            }}
          >
            <Button
              variant="chrome"
              onClick={() => { controller.prevStep(); }}
              disabled={stepNum === 1}
            >
              Prev
            </Button>
            <Button
              variant="primary"
              onClick={() => { void controller.nextStep(); }}
              disabled={stepNum === stepTotal}
            >
              Next
            </Button>
            <span style={{ flex: 1 }} />
            <Button variant="chrome" onClick={() => { controller.cancelTutorial(); }}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
