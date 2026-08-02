// #ModelConfig #ProviderSelect
// ModelChooser — the provider accordion: one card per provider with a masked
// API-key input (eye toggle to reveal). The user picks a provider, not
// individual models — each provider's primary (patch-turn) and secondary
// (per-row cell) models are fixed defaults, shown read-only inside the card
// with their per-Mtok prices. A single generic explainer sits above the cards.
// Pure component: props in, callbacks out; the host owns all state except the
// per-provider reveal toggles. Styled only via --mc-* CSS custom properties,
// each with a presentable light default, so it renders standalone and the host
// injects its theme by setting the variables on a wrapper.
// Spec: spec/packages/model-config/behavior.md § Model chooser component.
import { useState, type ReactNode } from 'react';
import type { ModelDef, Provider } from './index.ts';

export interface ModelChooserProps {
  models: readonly ModelDef[];
  provider: Provider;
  /** Primary (patch-turn) model id — the provider default, shown read-only. */
  primaryModel: string;
  /** Secondary (per-row cell) model id — the provider default, shown read-only. */
  secondaryModel: string;
  keys: Record<Provider, string>;
  expandedProvider: Provider | null;
  /** Provider whose config the host most recently saved, or null. That card's
   * header shows a "✓ Saved" badge, green fading to grey after savedFadeMs. */
  savedProvider?: Provider | null;
  /** Bumped by the host on every save — keys the badge so each save restarts
   * its green phase even when savedProvider is unchanged. */
  savedSeq?: number;
  /** How long the badge stays green before fading to grey. The host passes its
   * standard toast duration; defaults to 3000 ms. */
  savedFadeMs?: number;
  /** Optional URL for a general "how to get an API key" help link, shown at the
   * top below the explainer. The host supplies the path so the component
   * carries no site URL. */
  byokHelpUrl?: string;
  /** Optional URL for a "how to change the default models" help link, shown at
   * the bottom below the cards. Points at the FAQ entry that explains editing
   * models.json. The host supplies the path. */
  changeModelsHelpUrl?: string;
  /** The key test the host last ran, or null. Only the matching card renders
   *  it — every other card shows nothing. */
  testState?: KeyTest | null;
  onProviderClick: (p: Provider) => void;
  onKeyChange: (p: Provider, value: string) => void;
  /** The card's Test button was clicked. Omit it and no card shows a Test
   *  button — a host with no way to reach a provider gets no button that
   *  cannot work. */
  onTestKey?: (p: Provider) => void;
}

/** A card's verdict on its API key: what the host reports back after
 *  `onTestKey`. */
export interface KeyTest {
  provider: Provider;
  state: 'running' | 'ok' | 'error';
  message: string;
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
const err = v('err', '#b3261e');
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
  /** Direct link to that provider's "create API key" page. */
  keyUrl: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google',
    tagline: 'Gemini models',
    envHint: 'or set GEMINI_API_KEY in .env',
    keyPlaceholder: 'AIza…',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'GPT models',
    envHint: 'or set OPENAI_API_KEY in .env',
    keyPlaceholder: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    tagline: 'Claude models',
    envHint: 'or set ANTHROPIC_API_KEY in .env',
    keyPlaceholder: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    tagline: 'Free models',
    envHint: 'or set OPENROUTER_API_KEY in .env',
    keyPlaceholder: 'sk-or-…',
    keyUrl: 'https://openrouter.ai/settings/keys',
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
  primaryModel,
  secondaryModel,
  keys,
  expandedProvider,
  savedProvider,
  savedSeq,
  savedFadeMs = 3000,
  byokHelpUrl,
  changeModelsHelpUrl,
  testState,
  onProviderClick,
  onKeyChange,
  onTestKey,
}: ModelChooserProps): ReactNode {
  const [revealed, setRevealed] = useState<Record<Provider, boolean>>({
    gemini: false, openai: false, anthropic: false, openrouter: false,
  });

  const toggleReveal = (p: Provider): void => {
    setRevealed((prev) => ({ ...prev, [p]: !prev[p] }));
  };

  // ── sub-renderers ───────────────────────────────────────────────────────

  // "✓ Saved" confirmation on the card whose config just saved: green while
  // fresh, then fades to the grey of the surrounding metadata. Keyed on
  // savedSeq so every save replays the animation from green.
  const savedBadge = (p: Provider): ReactNode => (
    <span
      key={savedSeq}
      data-mc-saved={p}
      style={{
        fontFamily: fontUi,
        fontSize: 11.5,
        fontWeight: 500,
        flexShrink: 0,
        animation: `mc-saved-fade 400ms ease ${savedFadeMs}ms forwards`,
        color: ok,
      }}
    >
      ✓ Saved
    </span>
  );

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

  // Per-model tag: shown only for voice-capable models. Non-voice models carry
  // no tag (so OpenAI's text-only GPT models show none at all).
  const voiceTag = (voice: boolean): ReactNode =>
    voice ? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: '1px 6px',
          borderRadius: 10,
          fontFamily: fontUi,
          fontSize: 11.5,
          background: okSoft,
          color: ok,
          flexShrink: 0,
          marginLeft: 8,
        }}
      >
        🎙 voice
      </span>
    ) : null;

  // A small accent-coloured, new-tab help link. `attr` is the stable data
  // attribute the tests hook onto (data-mc-byok / data-mc-changemodels).
  const helpLink = (attr: string, href: string, label: string): ReactNode => (
    <a
      {...{ [attr]: '' }}
      href={href}
      target="_blank"
      rel="noopener"
      style={{
        fontFamily: fontUi,
        fontSize: 11.5,
        fontWeight: 500,
        color: accent,
        textDecoration: 'none',
        alignSelf: 'flex-start',
      }}
    >
      {label}
    </a>
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

  // Per-Mtok price pill: "$3 in / $15 out". Shown on each read-only default row.
  const priceTag = (m: ModelDef | undefined): ReactNode =>
    m ? (
      <span
        style={{
          fontFamily: fontMono,
          fontSize: 11.5,
          color: ink3,
          flexShrink: 0,
          marginLeft: 8,
        }}
      >
        ${m.inUsdPerMtok} in / ${m.outUsdPerMtok} out
      </span>
    ) : null;

  // One read-only row for a fixed role default: role label, model id, its
  // price, and (for voice-capable primaries) the voice tag.
  const defaultRow = (role: 'primary' | 'secondary', modelId: string): ReactNode => {
    const m = models.find((x) => x.id === modelId);
    return (
      <div
        data-mc-model={modelId}
        data-mc-role={role}
        style={{
          display: 'flex',
          alignItems: 'center',
          // Wrap on a narrow phone: the voice tag and price drop to a second
          // line instead of squeezing the model id into a ragged three-line
          // column.
          flexWrap: 'wrap',
          gap: 8,
          padding: '7px 6px',
          borderRadius: radiusSm,
          background: role === 'primary' ? accentSoft : 'transparent',
        }}
      >
        <span
          style={{
            width: 74,
            fontFamily: fontUi,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            color: ink3,
            flexShrink: 0,
          }}
        >
          {role}
        </span>
        <span data-mc-model-id={modelId} style={{ fontFamily: fontMono, fontSize: 12.5, color: ink, flex: 1, whiteSpace: 'nowrap' }}>
          {modelId}
        </span>
        {voiceTag(m?.voiceInput ?? false)}
        {priceTag(m)}
      </div>
    );
  };

  // The Test button + its verdict. A key that is merely typed is not a key
  // that works, and the alternative to asking now is finding out from a failed
  // transformation minutes later. The component runs nothing: it reports the
  // click and renders whatever the host hands back.
  const testButton = (meta: ProviderMeta): ReactNode => {
    if (!onTestKey) return null;
    const running = testState?.provider === meta.id && testState.state === 'running';
    const disabled = running || keys[meta.id].trim() === '';
    return (
      <button
        type="button"
        data-mc-test={meta.id}
        disabled={disabled}
        onClick={() => onTestKey(meta.id)}
        title={disabled && !running ? 'Enter an API key first' : 'Check this key against the provider'}
        style={{
          flex: '0 0 auto',
          padding: '7px 12px',
          border: `1px solid ${line2}`,
          borderRadius: radius,
          background: surface2,
          color: disabled ? ink3 : ink,
          fontFamily: fontUi,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {running ? 'Testing…' : 'Test'}
      </button>
    );
  };

  const testResult = (meta: ProviderMeta): ReactNode => {
    if (!testState || testState.provider !== meta.id || testState.state === 'running') return null;
    const good = testState.state === 'ok';
    return (
      <div
        data-mc-testresult={meta.id}
        data-mc-teststate={testState.state}
        style={{
          marginTop: 6,
          padding: '5px 8px',
          borderRadius: radiusSm,
          background: good ? okSoft : 'transparent',
          color: good ? ok : err,
          fontFamily: fontUi,
          fontSize: 11.5,
          lineHeight: 1.45,
        }}
      >
        {good ? `✓ ${testState.message}` : testState.message}
      </div>
    );
  };

  // The masked key input and its reveal toggle, in one bordered box.
  const keyField = (meta: ProviderMeta): ReactNode => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        minWidth: 0,
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
          minWidth: 0,
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
  );

  const cardBody = (meta: ProviderMeta): ReactNode => {
    return (
      <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${line}` }}>
        {/* API key field, with the Test button beside it */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
            {keyField(meta)}
            {testButton(meta)}
          </div>
          {testResult(meta)}
          {/* Env-var hint + deep link to the provider's key page */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
              marginTop: 4,
            }}
          >
            <span style={{ fontFamily: fontMono, fontSize: 11.5, color: ink3 }}>
              {meta.envHint}
            </span>
            <a
              data-mc-keyurl={meta.id}
              href={meta.keyUrl}
              target="_blank"
              rel="noopener"
              style={{
                fontFamily: fontUi,
                fontSize: 11.5,
                fontWeight: 500,
                color: accent,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Get API key ↗
            </a>
          </div>
        </div>

        {/* Fixed role defaults for this provider — read-only, not selectable. */}
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {defaultRow('primary', primaryModel)}
          {defaultRow('secondary', secondaryModel)}
        </div>
      </div>
    );
  };

  // ── accordion cards ─────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Keyframes for the Saved badge's green→grey fade. */}
      <style>{`@keyframes mc-saved-fade { to { color: ${ink3}; } }`}</style>
      {/* Generic role explainer — once, above the provider cards. */}
      <p
        style={{
          margin: 0,
          fontFamily: fontUi,
          fontSize: 11.5,
          lineHeight: 1.45,
          color: ink3,
        }}
      >
        Pick a provider — its models are chosen for you.{' '}
        <b style={{ color: ink }}>Primary</b> writes the spec patch each turn and
        handles voice input; <b style={{ color: ink }}>Secondary</b> fills per-row
        AI cells with a cheaper model for bulk work.
      </p>
      {/* General "how to get an API key" help link — top, below the explainer. */}
      {byokHelpUrl && helpLink('data-mc-byok', byokHelpUrl, 'New here? How to get an API key ↗')}
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
              {savedProvider === meta.id && savedBadge(meta.id)}
              {voiceBadge(hasVoice)}
            </button>

            {/* Card body — visible only when expanded */}
            {isExpanded && cardBody(meta)}
          </div>
        );
      })}
      {/* "How to change the default models" FAQ link — bottom, below the cards. */}
      {changeModelsHelpUrl &&
        helpLink(
          'data-mc-changemodels',
          changeModelsHelpUrl,
          'How to change primary and secondary models? ↗',
        )}
    </div>
  );
}
