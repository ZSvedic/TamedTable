// #ModelConfig #ProviderSelect
// ModelChooser — the provider accordion: one card per provider with a masked
// API-key input (eye toggle to reveal) and that provider's models as a radio
// list. Pure component: props in, callbacks out; the host owns all state
// except the per-provider reveal toggles. Styled only via --mc-* CSS custom
// properties, each with a presentable light default, so it renders standalone
// and the host injects its theme by setting the variables on a wrapper.
// Spec: spec/packages/model-config/behavior.md § Model chooser component.
import { useState, type ReactNode } from 'react';
import type { ModelDef, Provider } from './index.ts';

export interface ModelChooserProps {
  models: readonly ModelDef[];
  provider: Provider;
  model: string;
  keys: Record<Provider, string>;
  expandedProvider: Provider | null;
  onProviderClick: (p: Provider) => void;
  onKeyChange: (p: Provider, value: string) => void;
  onModelSelect: (modelId: string) => void;
}

// ── Theme variables — every visual choice reads var(--mc-*, default) ───────

const v = (name: string, fallback: string): string => `var(--mc-${name}, ${fallback})`;

const ink = v('ink', '#27272a');
const ink3 = v('ink3', '#71717a');
const surface = v('surface', '#ffffff');
const surface2 = v('surface2', '#f7f7f8');
const surface3 = v('surface3', '#ececef');
const line = v('line', '#e0e0e3');
const line2 = v('line2', '#cfcfd4');
const accent = v('accent', '#4a8fd4');
const accentSoft = v('accent-soft', '#e9f2fb');
const ok = v('ok', '#247a4d');
const okSoft = v('ok-soft', '#e4f4ea');
const fontUi = v('font-ui', 'system-ui, sans-serif');
const fontMono = v('font-mono', 'ui-monospace, SFMono-Regular, Menlo, monospace');
const radius = v('radius', '6px');
const radiusSm = v('radius-sm', '4px');
const radiusLg = v('radius-lg', '10px');

// ── Provider metadata ──────────────────────────────────────────────────────

interface ProviderMeta {
  id: Provider;
  name: string;
  tagline: string;
  envHint: string;
  keyPlaceholder: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google',
    tagline: 'Gemini models',
    envHint: 'or set GEMINI_API_KEY in .env',
    keyPlaceholder: 'AIza…',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'GPT models',
    envHint: 'or set OPENAI_API_KEY in .env',
    keyPlaceholder: 'sk-…',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    tagline: 'Claude models',
    envHint: 'or set ANTHROPIC_API_KEY in .env',
    keyPlaceholder: 'sk-ant-…',
  },
];

// ── Inline icons (no host icon set) ────────────────────────────────────────

const eyeIcon = (open: boolean): ReactNode => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: '0 0 auto', display: 'block' }}
    aria-hidden="true"
  >
    <path
      d={
        open
          ? 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'
          : 'M6.2 6.2A2 2 0 0 0 9.8 9.8 M3 3l10 10 M5.2 5.3C2.9 6.6 1.5 8 1.5 8S4 12.5 8 12.5c1 0 1.9-.2 2.7-.6 M10.8 10.7C13 9.4 14.5 8 14.5 8S12 3.5 8 3.5'
      }
    />
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────

export function ModelChooser({
  models,
  provider,
  model,
  keys,
  expandedProvider,
  onProviderClick,
  onKeyChange,
  onModelSelect,
}: ModelChooserProps): ReactNode {
  const [revealed, setRevealed] = useState<Record<Provider, boolean>>({
    gemini: false, openai: false, anthropic: false,
  });

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
        fontFamily: fontUi,
        fontSize: 11.5,
        fontWeight: 500,
        background: hasVoice ? okSoft : surface3,
        color: hasVoice ? ok : ink3,
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
        fontFamily: fontUi,
        fontSize: 11.5,
        background: voice ? okSoft : surface3,
        color: voice ? ok : ink3,
        flexShrink: 0,
        marginLeft: 8,
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
        border: `1.5px solid ${selected ? accent : line2}`,
        background: selected ? accent : 'transparent',
        boxShadow: selected ? `inset 0 0 0 2.5px ${surface}` : 'none',
      }}
    />
  );

  const cardBody = (meta: ProviderMeta): ReactNode => {
    const providerModels = models.filter((m) => m.provider === meta.id);
    return (
      <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${line}` }}>
        {/* API key field */}
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: `1px solid ${line2}`,
              borderRadius: radius,
              padding: '6px 8px',
              background: surface2,
            }}
          >
            <input
              type={revealed[meta.id] ? 'text' : 'password'}
              data-mc-key={meta.id}
              value={keys[meta.id]}
              onChange={(e) => onKeyChange(meta.id, e.target.value)}
              placeholder={meta.keyPlaceholder}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: fontMono,
                fontSize: 12.5,
                color: ink,
              }}
            />
            <button
              type="button"
              data-mc-reveal={meta.id}
              onClick={() => toggleReveal(meta.id)}
              title={revealed[meta.id] ? 'Hide key' : 'Show key'}
              style={{
                background: 'transparent',
                border: 0,
                padding: 2,
                cursor: 'pointer',
                color: ink3,
                display: 'flex',
              }}
            >
              {eyeIcon(!revealed[meta.id])}
            </button>
          </div>
          {/* Env-var hint */}
          <div style={{ fontFamily: fontMono, fontSize: 11.5, color: ink3, marginTop: 4 }}>
            {meta.envHint}
          </div>
        </div>

        {/* Model list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
          {providerModels.map((m) => {
            const selected = m.id === model;
            return (
              <label
                key={m.id}
                data-mc-model={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 6px',
                  borderRadius: radiusSm,
                  cursor: 'pointer',
                  background: selected ? accentSoft : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="mc-model"
                  checked={selected}
                  onChange={() => onModelSelect(m.id)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                {radioKnob(selected)}
                <span style={{ fontFamily: fontMono, fontSize: 12.5, color: ink, flex: 1 }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {PROVIDERS.map((meta) => {
        const isSelected = provider === meta.id;
        const isExpanded = expandedProvider === meta.id;
        const hasVoice = models.some((m) => m.provider === meta.id && m.voiceInput);

        return (
          <div
            key={meta.id}
            style={{
              border: `1px solid ${isExpanded ? accent : line}`,
              borderRadius: radiusLg,
              overflow: 'hidden',
              background: surface,
            }}
          >
            {/* Card header — always visible */}
            <button
              type="button"
              data-mc-card={meta.id}
              onClick={() => onProviderClick(meta.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
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
                    fontFamily: fontUi,
                    fontSize: 14,
                    fontWeight: 600,
                    color: ink,
                    display: 'block',
                  }}
                >
                  {meta.name}
                </span>
                <span style={{ fontFamily: fontUi, fontSize: 11.5, color: ink3 }}>
                  {meta.tagline}
                </span>
              </span>
              {voiceBadge(hasVoice)}
            </button>

            {/* Card body — visible only when expanded */}
            {isExpanded && cardBody(meta)}
          </div>
        );
      })}
    </div>
  );
}
