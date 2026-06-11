// #WebUI #SettingsCards — Settings panel: the sheet/overlay shell around the
// generic ModelChooser accordion provider cards (from @tamedtable/model-config). The panel binds the
// chooser's props/callbacks to WebController and injects the app theme via
// the --mc-* CSS custom properties on the wrapping element.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button, Icon } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { ALL_MODELS, type Provider } from '@tamedtable/model-config';
import { ModelChooser } from '@tamedtable/model-config/ModelChooser';

export function SettingsPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const cfg = controller.getConfig();

  // Local key state — one entry per provider. Initialized from current config.
  const [keys, setKeys] = useState<Record<Provider, string>>({
    gemini:    cfg.geminiKey    ?? '',
    openai:    cfg.openaiKey    ?? '',
    anthropic: cfg.anthropicKey ?? '',
  });

  if (!controller.settingsOpen) return null;

  const handleKeyChange = (p: Provider, value: string): void => {
    setKeys((prev) => ({ ...prev, [p]: value }));
    // Live-save the key
    if (p === 'gemini')    void controller.setConfig({ geminiKey:    value.trim() || null });
    if (p === 'openai')    void controller.setConfig({ openaiKey:    value.trim() || null });
    if (p === 'anthropic') void controller.setConfig({ anthropicKey: value.trim() || null });
  };

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
            model={cfg.model}
            keys={keys}
            expandedProvider={controller.expandedProvider}
            onProviderClick={(p) => void controller.clickProviderCard(p)}
            onKeyChange={handleKeyChange}
            onModelSelect={(modelId) => void controller.setConfig({ model: modelId })}
          />
        </div>

        {/* footer — Close only (changes are live) */}
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
