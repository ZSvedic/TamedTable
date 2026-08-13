// #WebUI #SettingsCards — Settings panel: the sheet/overlay shell around the
// generic ModelChooser (from @tamedtable/model-config), where a user connects
// providers by pasting a key. The panel binds the chooser's props/callbacks to
// WebController and injects the app theme via the --mc-* CSS custom properties
// on the wrapping element.
import type { CSSProperties, ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button, Icon } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';
import { installPrompt } from '../install-prompt.ts';
import {
  modelFor, defaultModel, defaultCellModel, priceVariesByPlan, hasPaidModelSet, type Provider,
} from '@tamedtable/model-config';
import { ModelChooser, type ConnectedCard, type RoleRow } from '@tamedtable/model-config/ModelChooser';
import { speedOf } from '@tamedtable/model-config/storage';

export function SettingsPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const cfg = controller.getConfig();

  if (!controller.settingsOpen) return null;

  // One card per connected provider. Everything the card shows beyond the
  // model ids — the tier tag and the two measured lines — comes from the probe
  // the controller ran when the key was connected.
  // The card shows what a run would actually use, so the OpenRouter rows have
  // to follow the model set the user picked rather than the plain defaults.
  const paidSet = controller.config.openrouterPaid;
  const roleRow = (p: Provider, role: 'primary' | 'secondary'): RoleRow => {
    const paid = p === 'openrouter' && paidSet;
    const model = role === 'primary' ? defaultModel(p, paid) : defaultCellModel(p, paid);
    const priced = modelFor(p, model);
    return {
      model,
      // Price is the catalogue's, per thousand tokens — never measured.
      inUsdPer1kTok: priced ? priced.inUsdPerMtok / 1000 : null,
      outUsdPer1kTok: priced ? priced.outUsdPerMtok / 1000 : null,
      speed: speedOf(controller.probes[p]?.[role], controller.measuring[p] ?? false),
    };
  };
  const connected: ConnectedCard[] = controller.connectedProviders().map((p) => ({
    id: p,
    tier: controller.probes[p]?.tier ?? null,
    // Driven by the catalogue's voiceInput flag, not hardcoded per provider.
    voice: modelFor(p, defaultModel(p, p === 'openrouter' && paidSet))?.voiceInput ?? false,
    // Groq: a free tier we cannot detect, so its rows name no price.
    priceVariesByPlan: priceVariesByPlan(p),
    hasPaidModelSet: hasPaidModelSet(p),
    paidModelSet: p === 'openrouter' && paidSet,
    primary: roleRow(p, 'primary'),
    secondary: roleRow(p, 'secondary'),
  }));

  // #SettingsCards — the panel's three sections. The heading is deliberately
  // larger and heavier than the questions inside a section ("Already have an
  // API key?", "No API key?"): without that the sub-questions read as the
  // structure and the sections read as labels on it. The rule above each one
  // does the separating the chooser's OR divider used to.
  const section = (title: string, first = false): ReactNode => (
    <div
      style={{
        marginTop: first ? 0 : space.px16,
        paddingTop: first ? 0 : space.px16,
        borderTop: first ? undefined : `1px solid ${t.line}`,
        marginBottom: space.px12,
        fontFamily: typography.ui,
        fontSize: typography.size.lg,
        fontWeight: 700,
        color: t.ink,
      }}
    >
      {title}
    </div>
  );

  // The app theme, expressed as the chooser's --mc-* variables.
  const chooserTheme = {
    '--mc-ink': t.ink,
    '--mc-ink-on-ink': t.inkOnInk,
    '--mc-ink2': t.ink2,
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
    '--mc-err-soft': t.errSoft,
    '--mc-font-ui': typography.ui,
    '--mc-font-mono': typography.mono,
    '--mc-radius': `${space.radius}px`,
    '--mc-radius-sm': `${space.radiusSm}px`,
    '--mc-radius-lg': `${space.radiusLg}px`,
  } as CSSProperties;

  return (
    // A backdrop click closes the panel — except mid-connect. The Puter
    // sign-in puts a window in front of this one, and the click that brings the
    // tab back would otherwise dismiss the panel just as the new card was about
    // to appear on it.
    <div
      onClick={() => { if (!controller.keyBusy) controller.closeSettings(); }}
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

        {/* body — scrollable model chooser + the rest of the settings */}
        <div style={{ flex: 1, overflowY: 'auto', padding: space.px16, ...chooserTheme }}>
          {section('Model config', true)}
          <ModelChooser
            connected={connected}
            selected={connected.length > 0 ? cfg.provider : null}
            keyInput={controller.keyInput}
            error={controller.keyError}
            busy={controller.keyBusy}
            puterBusy={controller.puterBusy}
            onKeyInputChange={(value) => controller.setKeyInput(value)}
            onAdd={() => void controller.addKey()}
            onSelect={(p) => void controller.selectProvider(p)}
            onRemove={(p) => void controller.removeProvider(p)}
            onRefresh={(p) => void controller.refreshProvider(p)}
            onPaidModelSetChange={(p, paid) => void controller.setPaidModelSet(p, paid)}
            onPuterSignIn={
              controller.canSignInPuter() ? () => void controller.signInPuter() : undefined
            }
          />

          {/* #LazyExec — Simple mode: every AI step runs table-wide at once,
              with the estimate dialog gating runs of more than one page. */}
          {section('Execution')}
          <div>
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
          {section('Diagnostics')}
          <div>
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
            {/* One row, short labels — the section heading above already says
                these are about diagnostics, so the buttons need not repeat it.
                chrome, not ghost, on the two secondary actions: a borderless
                text action beside a real button reads as a label. */}
            <div style={{ display: 'flex', gap: space.px8 }}>
              <Button variant="primary" onClick={() => void controller.sendBugReport()}>
                Report a bug
              </Button>
              <Button variant="chrome" onClick={() => void controller.copyDiagnosticsReport()}>
                Copy report
              </Button>
              <Button variant="chrome" onClick={() => controller.clearDiagnostics()}>
                Reset
              </Button>
            </div>
          </div>

          {/* #MobileShell — opened from a home-screen icon the app runs
              full-screen, no browser bars. Android Chrome hands us its install
              prompt (captured at startup); iOS browsers have no API for it, so
              show the share-menu instruction instead. Desktop hides this. */}
          {isMobile && (
            <>
              {section('Add to home screen')}
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
            </>
          )}
        </div>

        {/* footer — Close only; changes are live, and a connected key shows as
            its own card, so there is nothing to confirm separately */}
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
