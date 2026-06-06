// #WebUI — Settings panel: three provider accordion cards (Google, OpenAI, Anthropic)
// with per-model voice tags and live-apply (no Save button).
import { useState, type ReactNode } from 'react';
import { space, typography } from '../lib/theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useTheme } from '../hooks/useTheme.tsx';
import { Button } from './Button.tsx';
import { Icon } from './Icons.tsx';
import { ALL_MODELS, type Provider } from '@tamedtable/model-config';

// ── Provider metadata ──────────────────────────────────────────────────────

interface ProviderMeta {
  id: Provider;
  name: string;
  tagline: string;
  hasVoice: boolean;
  envHint: string;
  keyPlaceholder: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google',
    tagline: 'Gemini models',
    hasVoice: true,
    envHint: 'or set GEMINI_API_KEY in .env',
    keyPlaceholder: 'AIza…',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'GPT models',
    hasVoice: true,
    envHint: 'or set OPENAI_API_KEY in .env',
    keyPlaceholder: 'sk-…',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    tagline: 'Claude models · required for text requests',
    hasVoice: false,
    envHint: 'or set ANTHROPIC_API_KEY in .env',
    keyPlaceholder: 'sk-ant-…',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function SettingsPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const cfg = controller.getConfig();
  const expandedProvider = controller.expandedProvider;

  // Local key state — one entry per provider. Initialized from current config.
  const [keys, setKeys] = useState<Record<Provider, string>>({
    gemini:    cfg.geminiKey    ?? '',
    openai:    cfg.openaiKey    ?? '',
    anthropic: cfg.anthropicKey ?? '',
  });
  const [revealed, setRevealed] = useState<Record<Provider, boolean>>({
    gemini: false, openai: false, anthropic: false,
  });

  if (!controller.settingsOpen) return null;

  // ── handlers ───────────────────────────────────────────────────────────

  const handleCardClick = (p: Provider): void => {
    void controller.clickProviderCard(p);
  };

  const handleKeyChange = (p: Provider, value: string): void => {
    setKeys((prev) => ({ ...prev, [p]: value }));
    // Live-save the key
    if (p === 'gemini')    void controller.setConfig({ geminiKey:    value.trim() || null });
    if (p === 'openai')    void controller.setConfig({ openaiKey:    value.trim() || null });
    if (p === 'anthropic') void controller.setConfig({ anthropicKey: value.trim() || null });
  };

  const handleModelSelect = (modelId: string): void => {
    void controller.setConfig({ model: modelId });
  };

  const toggleReveal = (p: Provider): void => {
    setRevealed((prev) => ({ ...prev, [p]: !prev[p] }));
  };

  // ── sub-renderers ───────────────────────────────────────────────────────

  const voiceBadge = (hasVoice: boolean): ReactNode => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 12,
        fontFamily: typography.ui,
        fontSize: typography.size.xs,
        fontWeight: 500,
        background: hasVoice ? t.okSoft : t.surface3,
        color: hasVoice ? t.ok : t.ink3,
        flexShrink: 0,
      }}
    >
      {hasVoice ? '🎙 Voice input' : 'No voice input'}
    </span>
  );

  const voiceTag = (voice: boolean): ReactNode => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '1px 6px',
        borderRadius: 10,
        fontFamily: typography.ui,
        fontSize: typography.size.xs,
        background: voice ? t.okSoft : t.surface3,
        color: voice ? t.ok : t.ink3,
        flexShrink: 0,
        marginLeft: space.px8,
      }}
    >
      {voice ? '🎙 voice' : 'no voice'}
    </span>
  );

  const radioKnob = (selected: boolean): ReactNode => (
    <span
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        width: 14,
        height: 14,
        borderRadius: 7,
        border: `1.5px solid ${selected ? t.accent : t.line2}`,
        background: selected ? t.accent : 'transparent',
        boxShadow: selected ? `inset 0 0 0 2.5px ${t.surface}` : 'none',
      }}
    />
  );

  const cardBody = (meta: ProviderMeta): ReactNode => {
    const providerModels = ALL_MODELS.filter((m) => m.provider === meta.id);
    return (
      <div
        style={{
          padding: `${space.px8}px ${space.px14}px ${space.px12}px`,
          borderTop: `1px solid ${t.line}`,
        }}
      >
        {/* API key field */}
        <div style={{ marginBottom: space.px4 }}>
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
              type={revealed[meta.id] ? 'text' : 'password'}
              value={keys[meta.id]}
              onChange={(e) => handleKeyChange(meta.id, e.target.value)}
              placeholder={meta.keyPlaceholder}
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
              onClick={() => toggleReveal(meta.id)}
              title={revealed[meta.id] ? 'Hide key' : 'Show key'}
              style={{
                background: 'transparent',
                border: 0,
                padding: space.px2,
                cursor: 'pointer',
                color: t.ink3,
                display: 'flex',
              }}
            >
              <Icon name={revealed[meta.id] ? 'eyeOff' : 'eye'} />
            </button>
          </div>
          {/* Env-var hint */}
          <div
            style={{
              fontFamily: typography.mono,
              fontSize: typography.size.xs,
              color: t.ink3,
              marginTop: space.px4,
            }}
          >
            {meta.envHint}
          </div>
        </div>

        {/* Model list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: space.px8 }}>
          {providerModels.map((m) => {
            const selected = m.id === cfg.model;
            return (
              <label
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space.px8,
                  padding: '6px 6px',
                  borderRadius: space.radiusSm,
                  cursor: 'pointer',
                  background: selected ? t.accentSoft : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="tt-model"
                  checked={selected}
                  onChange={() => handleModelSelect(m.id)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                {radioKnob(selected)}
                <span
                  style={{
                    fontFamily: typography.mono,
                    fontSize: typography.size.sm,
                    color: t.ink,
                    flex: 1,
                  }}
                >
                  {m.id}
                </span>
                {voiceTag(m.voiceInput)}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // ── accordion cards ─────────────────────────────────────────────────────

  const cards = PROVIDERS.map((meta) => {
    const isSelected  = cfg.provider === meta.id;
    const isExpanded  = expandedProvider === meta.id;

    return (
      <div
        key={meta.id}
        className="pcard"
        style={{
          border: `1px solid ${isExpanded ? t.accent : t.line}`,
          borderRadius: space.radiusLg,
          overflow: 'hidden',
          background: t.surface,
        }}
      >
        {/* Card header — always visible */}
        <button
          type="button"
          onClick={() => handleCardClick(meta.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: space.px10,
            padding: `${space.px10}px ${space.px12}px`,
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {radioKnob(isSelected)}
          <span style={{ flex: 1 }}>
            <span
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.md,
                fontWeight: 600,
                color: t.ink,
                display: 'block',
              }}
            >
              {meta.name}
            </span>
            <span
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                color: t.ink3,
              }}
            >
              {meta.tagline}
            </span>
          </span>
          {voiceBadge(meta.hasVoice)}
        </button>

        {/* Card body — visible only when expanded */}
        {isExpanded && cardBody(meta)}
      </div>
    );
  });

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

        {/* body — scrollable accordion cards */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: space.px16,
            display: 'flex',
            flexDirection: 'column',
            gap: space.px8,
          }}
        >
          {cards}
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
