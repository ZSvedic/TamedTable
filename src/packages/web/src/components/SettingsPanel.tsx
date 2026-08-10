// #WebUI #SettingsCards — Settings panel: the sheet/overlay shell around the
// generic ModelChooser accordion provider cards (from @tamedtable/model-config). The panel binds the
// chooser's props/callbacks to WebController and injects the app theme via
// the --mc-* CSS custom properties on the wrapping element.
import type { CSSProperties, ReactNode } from 'react';
import { space, typography, toastDurationMs } from '@tamedtable/ui-kit';
import { useTheme, Button, Icon } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';
import { installPrompt } from '../install-prompt.ts';
import { ALL_MODELS } from '@tamedtable/model-config';
import { ModelChooser } from '@tamedtable/model-config/ModelChooser';

export function SettingsPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const cfg = controller.getConfig();

  if (!controller.settingsOpen) return null;

  // The app theme, expressed as the chooser's --mc-* variables.
  const chooserTheme = {
    '--mc-ink': t.ink,
    '--mc-ink3': t.ink3,
    '--mc-surface': t.surface,
    '--mc-surface2': t.surface2,
    '--mc-surface3': t.surface3,
    '--mc-line': t.line,
    '--mc-line2': t.line2,
    '--mc-accent': t.accent,
    '--mc-accent-soft': t.accentSoft,
    '--mc-ok': t.ok,
    '--mc-ok-soft': t.okSoft,
    '--mc-err': t.err,
    '--mc-font-ui': typography.ui,
    '--mc-font-mono': typography.mono,
    '--mc-radius': `${space.radius}px`,
    '--mc-radius-sm': `${space.radiusSm}px`,
    '--mc-radius-lg': `${space.radiusLg}px`,
  } as CSSProperties;

  return (
    <div
      onClick={() => controller.closeSettings()}
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
        className="tt-sheet"
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
            Settings
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => controller.closeSettings()}
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

        {/* body — scrollable provider accordion */}
        <div style={{ flex: 1, overflowY: 'auto', padding: space.px16, ...chooserTheme }}>
          <ModelChooser
            models={ALL_MODELS}
            provider={cfg.provider}
            primaryModel={cfg.model}
            secondaryModel={cfg.cellModel}
            keys={controller.keyDrafts}
            expandedProvider={controller.expandedProvider}
            savedProvider={controller.savedProvider}
            savedSeq={controller.savedSeq}
            savedFadeMs={toastDurationMs('✓ Saved')}
            byokHelpUrl="../BYOK-setup.html"
            changeModelsHelpUrl="../FAQ.html#change-models"
            testState={controller.keyTest}
            onProviderClick={(p) => void controller.clickProviderCard(p)}
            onKeyChange={(p, value) => controller.setKeyDraft(p, value)}
            onKeyCommit={(p) => void controller.commitKeyDraft(p)}
            onPuterSignIn={() => void controller.signInPuter()}
            puterSignedIn={controller.isPuterSignedIn()}
            onTestKey={() => void controller.testKey()}
          />

          {/* #LazyExec — Simple mode: every AI step runs table-wide at once,
              with the estimate dialog gating runs of more than one page. */}
          <div style={{ marginTop: space.px16 }}>
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                fontWeight: 600,
                color: t.ink,
                marginBottom: space.px8,
              }}
            >
              Execution
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: space.px8,
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                color: t.ink2,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                data-tt-always-run-all=""
                checked={cfg.alwaysRunAll}
                onChange={(e) => void controller.setConfig({ alwaysRunAll: e.target.checked })}
                style={{ marginTop: 2 }}
              />
              <span>
                Always run on all rows
                <span
                  style={{
                    display: 'block',
                    fontSize: typography.size.xs,
                    color: t.ink3,
                  }}
                >
                  If on, every AI step runs the whole table immediately (not recommended for
                  large tables).
                </span>
              </span>
            </label>
          </div>

          {/* #Diagnostics — send the maintainers a redacted bug report */}
          <div style={{ marginTop: space.px16 }}>
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                fontWeight: 600,
                color: t.ink,
                marginBottom: space.px8,
              }}
            >
              Diagnostics
            </div>
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                color: t.ink3,
                marginBottom: space.px8,
              }}
            >
              Hit a bug? Send the TamedTable maintainers a redacted report (no API keys) so they can
              reproduce it.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.px8 }}>
              <Button variant="primary" onClick={() => void controller.sendBugReport()}>
                Send a bug report
              </Button>
              <Button variant="chrome" onClick={() => void controller.copyDiagnosticsReport()}>
                Copy diagnostics report
              </Button>
              {/* chrome, not ghost: a borderless text action next to two real
                  buttons reads as a label, not a button. */}
              <Button variant="chrome" onClick={() => controller.clearDiagnostics()}>
                Clear diagnostics
              </Button>
            </div>
          </div>

          {/* #MobileShell — opened from a home-screen icon the app runs
              full-screen, no browser bars. Android Chrome hands us its install
              prompt (captured at startup); iOS browsers have no API for it, so
              show the share-menu instruction instead. Desktop hides this. */}
          {isMobile && (
            <div style={{ marginTop: space.px16 }}>
              <div
                style={{
                  fontFamily: typography.ui,
                  fontSize: typography.size.sm,
                  fontWeight: 600,
                  color: t.ink,
                  marginBottom: space.px8,
                }}
              >
                Add to home screen
              </div>
              <div
                style={{
                  fontFamily: typography.ui,
                  fontSize: typography.size.xs,
                  color: t.ink3,
                  marginBottom: space.px8,
                }}
              >
                Opened from a home-screen icon, TamedTable runs full-screen — no browser bars.
              </div>
              {installPrompt() ? (
                <Button variant="primary" onClick={() => void installPrompt()!.prompt()}>
                  Add to home screen
                </Button>
              ) : (
                <div style={{ fontFamily: typography.ui, fontSize: typography.size.xs, color: t.ink2 }}>
                  {/iPad|iPhone|iPod/.test(navigator.userAgent)
                    ? 'In your browser: Share → Add to Home Screen.'
                    : 'In your browser menu: Add to Home screen.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer — Close only (changes are live; each save confirms with the
            inline ✓ Saved badge on the provider card) */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: space.px14,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          <Button variant="chrome" onClick={() => controller.closeSettings()}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
