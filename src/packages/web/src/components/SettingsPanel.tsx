import { useState, type ReactNode } from 'react';
import { space, typography } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { useTheme } from '../useTheme.tsx';
import { Button } from './Button.tsx';
import { Icon } from './Icons.tsx';

// The patch-turn model choices. Ids match the engine's `claude-<family>-<major>-<minor>`
// shape so the debug block renders them as "Family major.minor".
const MODELS: ReadonlyArray<{ id: string; name: string; desc: string }> = [
  { id: 'claude-opus-4-7', name: 'Opus 4.7', desc: 'Most capable — best for tricky requests.' },
  { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6', desc: 'Balanced — the default.' },
  { id: 'claude-haiku-4-5', name: 'Haiku 4.5', desc: 'Fastest and cheapest.' },
];

export function SettingsPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const [key, setKey] = useState(controller.getSettings().apiKey ?? '');
  const [model, setModel] = useState(controller.getSettings().model);
  const [reveal, setReveal] = useState(false);
  if (!controller.settingsOpen) return null;

  const save = async (): Promise<void> => {
    controller.setApiKey(key);
    await controller.setModel(model);
    controller.closeSettings();
  };

  const sectionTitle = (text: string): ReactNode => (
    <div
      style={{
        fontFamily: typography.ui,
        fontSize: typography.size.sm,
        fontWeight: 600,
        color: t.ink,
        marginBottom: space.px4,
      }}
    >
      {text}
    </div>
  );

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
          width: 380,
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

        {/* body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: space.px16,
            display: 'flex',
            flexDirection: 'column',
            gap: space.px20,
          }}
        >
          <div>
            {sectionTitle('Anthropic API key')}
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                lineHeight: 1.55,
                color: t.ink3,
                marginBottom: space.px8,
              }}
            >
              Required to send requests. Held only in this browser tab — natural-language
              requests call Anthropic directly from the browser.
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: space.px6,
                border: `1px solid ${t.line2}`,
                borderRadius: space.radius,
                padding: '6px 8px',
                background: t.surface2,
              }}
            >
              <input
                type={reveal ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-ant-…"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: typography.mono,
                  fontSize: typography.size.sm,
                  color: t.ink,
                }}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                title={reveal ? 'Hide key' : 'Show key'}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: space.px2,
                  cursor: 'pointer',
                  color: t.ink3,
                  display: 'flex',
                }}
              >
                <Icon name={reveal ? 'eyeOff' : 'eye'} />
              </button>
            </div>
          </div>

          <div>
            {sectionTitle('Model')}
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                lineHeight: 1.55,
                color: t.ink3,
                marginBottom: space.px8,
              }}
            >
              The Anthropic model that writes each spec patch. Switching it replays the
              current table against the new model.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.px4 }}>
              {MODELS.map((m) => {
                const selected = m.id === model;
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: space.px8,
                      padding: '7px 8px',
                      borderRadius: space.radiusSm,
                      cursor: 'pointer',
                      background: selected ? t.accentSoft : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="tt-model"
                      checked={selected}
                      onChange={() => setModel(m.id)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        flex: '0 0 auto',
                        width: 14,
                        height: 14,
                        marginTop: 2,
                        borderRadius: 7,
                        border: `1.5px solid ${selected ? t.accent : t.line2}`,
                        background: selected ? t.accent : 'transparent',
                        boxShadow: selected ? `inset 0 0 0 2.5px ${t.surface}` : 'none',
                      }}
                    />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span
                        style={{
                          fontFamily: typography.mono,
                          fontSize: typography.size.sm,
                          fontWeight: 500,
                          color: t.ink,
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          fontFamily: typography.ui,
                          fontSize: typography.size.xs,
                          color: t.ink3,
                        }}
                      >
                        {m.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: space.px8,
            padding: space.px14,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          <Button variant="chrome" onClick={() => controller.closeSettings()}>
            Close
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
