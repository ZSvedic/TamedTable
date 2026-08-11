// #ModelConfig #ProviderSelect
// ModelChooser — the panel a user connects providers in. Three parts, stacked:
// the connected-provider list (or an empty row), the "Already have an API key?"
// block that adds one, and the supported-providers footer. There is no provider
// list to pick from before connecting — the key names its own provider.
// Pure component: props in, callbacks out, no state of its own. Styled only via
// --mc-* CSS custom properties, each with a presentable light default, so it
// renders standalone and the host injects its theme by setting the variables on
// a wrapper.
// Spec: spec/packages/model-config/behavior.md § Model chooser component.
import type { ReactNode } from 'react';
import type { Provider, Tier } from './index.ts';
import { estimateSecPer1kTok, type ModelMeasure } from './probe.ts';

/** One role row on a card. The two prices are catalogue values per thousand
 *  tokens (null for a model the catalogue doesn't price); `speed` is the
 *  measurement — the numbers when they are in, `'measuring'` while the call is
 *  still out, and null when it failed. A working key with no speed reading is
 *  still a working key. */
export interface RoleRow {
  model: string;
  inUsdPer1kTok: number | null;
  outUsdPer1kTok: number | null;
  speed: ModelMeasure | 'measuring' | null;
}

export interface ConnectedCard {
  id: Provider;
  tier: Tier;
  /** Whether this provider's primary model accepts audio input. */
  voice: boolean;
  primary: RoleRow;
  secondary: RoleRow;
}

export interface ModelChooserProps {
  /** The cards to render, in the order they were connected. */
  connected: readonly ConnectedCard[];
  /** The default provider every run uses, or null when nothing is connected. */
  selected: Provider | null;
  keyInput: string;
  error: string;
  /** An add is in flight — the input and button are disabled so a slow
   *  provider cannot be double-submitted. */
  busy: boolean;
  /** Optional URL for the "How to get ↗" link. The host supplies the path so
   *  the component carries no site URL; the link is omitted when unset. */
  byokHelpUrl?: string;
  onKeyInputChange: (value: string) => void;
  onAdd: () => void;
  onSelect: (p: Provider) => void;
  onRemove: (p: Provider) => void;
  /** The ⟳ button — re-run this provider's measurements. Omit it and no card
   *  shows one, so a host with nothing to re-measure gets no dead button. */
  onRefresh?: (p: Provider) => void;
}

/** The display name for each provider. One home, so the host never spells
 *  these out again. */
export const PROVIDER_LABEL: Record<Provider, string> = {
  gemini: 'Google API',
  openai: 'OpenAI API',
  anthropic: 'Anthropic API',
  groq: 'Groq API',
  openrouter: 'OpenRouter API',
};

/** The footer's supported-provider list, in the order the design names them. */
const SUPPORTED_LIST = 'Google / OpenAI / Anthropic / OpenRouter / Groq';

// ── Theme variables — every visual choice reads var(--mc-*, default) ───────

const v = (name: string, fallback: string): string => `var(--mc-${name}, ${fallback})`;

const ink = v('ink', '#1c1f23');
const ink2 = v('ink2', '#4a5260');
const ink3 = v('ink3', '#6b7280');
const surface = v('surface', '#ffffff');
const surface2 = v('surface2', '#fbfbfc');
const surface3 = v('surface3', '#eceef1');
const line = v('line', '#e8eaee');
const line2 = v('line2', '#d5d9de');
const accent = v('accent', '#1a73e8');
const accentSoft = v('accent-soft', '#eef4fe');
const ok = v('ok', '#1a6b38');
const okSoft = v('ok-soft', '#e7f6ec');
const err = v('err', '#a3312b');
const errSoft = v('err-soft', '#fbeceb');
const fontUi = v('font-ui', 'system-ui, sans-serif');
const fontMono = v('font-mono', 'ui-monospace, Menlo, monospace');
const radius = v('radius', '8px');
const radiusSm = v('radius-sm', '4px');
const radiusLg = v('radius-lg', '11px');

// ── Formatting ─────────────────────────────────────────────────────────────

/** Price with as many decimals as it needs and no more: 0.0075, 0.00025, 0. */
function money(usd: number): string {
  return String(Number(usd.toFixed(6)));
}

/** The line under a model id: catalogue prices, then the measured time.
 *
 *   $0.0015 in / $0.0075 out per 1000 tokens · ~9.4 sec
 *
 * The prices are always there once the catalogue knows the model; the `· ~Z sec`
 * tail is the measurement, so it reads `· measuring…` while the call is out and
 * is dropped entirely if it failed. */
function costLine(row: RoleRow): string | null {
  const parts: string[] = [];
  if (row.inUsdPer1kTok !== null && row.outUsdPer1kTok !== null) {
    parts.push(`$${money(row.inUsdPer1kTok)} in / $${money(row.outUsdPer1kTok)} out per 1000 tokens`);
  }
  if (row.speed === 'measuring') parts.push('measuring…');
  else if (row.speed !== null) parts.push(`~${estimateSecPer1kTok(row.speed).toFixed(1)} sec`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

// ── Inline icons (no host icon set) ────────────────────────────────────────

const refreshIcon = (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
  </svg>
);

const trashIcon = (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
    aria-hidden="true"
  >
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────

export function ModelChooser({
  connected,
  selected,
  keyInput,
  error,
  busy,
  byokHelpUrl,
  onKeyInputChange,
  onAdd,
  onSelect,
  onRemove,
  onRefresh,
}: ModelChooserProps): ReactNode {
  const canAdd = keyInput.trim() !== '' && !busy;

  /** Shared shape for the two 26px header buttons (⟳ and delete). */
  const iconButton = {
    flex: '0 0 auto' as const,
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: 0,
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
  };

  // A small monospace tag: FREE / PAID / VOICE.
  const tag = (label: string, fg: string, bg: string, attr?: Record<string, string>): ReactNode => (
    <span
      {...attr}
      style={{
        padding: '4px 6px',
        borderRadius: radiusSm,
        fontFamily: fontMono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '.04em',
        whiteSpace: 'nowrap',
        color: fg,
        background: bg,
      }}
    >
      {label}
    </span>
  );

  // One role row: the label column, the model id, and the measured line under
  // it — aligned to the model id, not the label.
  const roleRow = (role: 'primary' | 'secondary', row: RoleRow): ReactNode => {
    const cost = costLine(row);
    return (
      <div data-mc-model={row.model} data-mc-role={role}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              width: 68,
              flex: '0 0 auto',
              fontFamily: fontUi,
              fontSize: 12,
              fontWeight: 650,
              whiteSpace: 'nowrap',
              color: role === 'primary' ? ink2 : ink3,
            }}
          >
            {role === 'primary' ? 'Primary' : 'Secondary'}
          </span>
          <span
            data-mc-model-id={row.model}
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: fontMono,
              fontSize: 13,
              color: ink,
              // A long id truncates rather than wrapping: on a phone a
              // char-wrapped id turns the row into a ragged three-line column.
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.model}
          </span>
        </div>
        {cost !== null && (
          <div
            data-mc-cost=""
            style={{
              paddingLeft: 76,
              fontFamily: fontUi,
              fontSize: 12,
              color: ink3,
              whiteSpace: 'nowrap',
            }}
          >
            {cost}
          </div>
        )}
      </div>
    );
  };

  const card = (c: ConnectedCard): ReactNode => {
    const isSelected = selected === c.id;
    return (
      <div
        key={c.id}
        style={{
          border: `1px solid ${isSelected ? accent : line}`,
          borderRadius: radiusLg,
          overflow: 'hidden',
          background: isSelected ? accentSoft : surface,
        }}
      >
        <div
          data-mc-card={c.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(c.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(c.id);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 12px',
            cursor: 'pointer',
          }}
        >
          {/* radio knob */}
          <span
            aria-hidden="true"
            style={{
              flex: '0 0 auto',
              width: 16,
              height: 16,
              borderRadius: 8,
              border: `2px solid ${isSelected ? accent : line2}`,
              background: isSelected ? accent : 'transparent',
              boxShadow: isSelected ? `inset 0 0 0 2px ${surface}` : 'none',
            }}
          />
          <span
            style={{
              fontFamily: fontUi,
              fontSize: 14,
              fontWeight: 650,
              color: ink,
              whiteSpace: 'nowrap',
            }}
          >
            {PROVIDER_LABEL[c.id]}
          </span>
          <span style={{ flex: 1, display: 'flex', gap: 5, alignItems: 'center' }}>
            {c.tier === 'free' && tag('FREE', ok, okSoft, { 'data-mc-tier': c.id })}
            {c.tier === 'paid' && tag('PAID', ink2, surface3, { 'data-mc-tier': c.id })}
            {c.voice && tag('VOICE', '#1a4a8a', accentSoft, { 'data-mc-voice': c.id })}
          </span>
          {/* Neither button may also select the card it sits on. */}
          {onRefresh && (
            <button
              type="button"
              data-mc-refresh={c.id}
              title={`Re-measure ${PROVIDER_LABEL[c.id]}`}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh(c.id);
              }}
              style={{ ...iconButton, color: ink3 }}
            >
              {refreshIcon}
            </button>
          )}
          <button
            type="button"
            data-mc-remove={c.id}
            title={`Remove ${PROVIDER_LABEL[c.id]}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(c.id);
            }}
            style={{ ...iconButton, color: err }}
          >
            {trashIcon}
          </button>
        </div>

        {/* Only the selected card shows its models — it is the one that runs. */}
        {isSelected && (
          <div
            style={{
              padding: '0 12px 12px 37px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {roleRow('primary', c.primary)}
            {roleRow('secondary', c.secondary)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {connected.length === 0 ? (
        <div
          data-mc-empty=""
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 14,
            border: `1px dashed ${line2}`,
            borderRadius: radiusLg,
            background: surface2,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 7, height: 7, borderRadius: 4, background: ink3, flex: '0 0 auto' }}
          />
          <span style={{ fontFamily: fontUi, fontSize: 14, fontWeight: 600, color: ink2 }}>
            No provider or model added.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {connected.map(card)}
        </div>
      )}

      {/* ── Already have an API key? ───────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ fontFamily: fontUi, fontSize: 14, fontWeight: 650, color: ink }}>
          Already have an API key?
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            gap: 8,
            fontFamily: fontUi,
            fontSize: 13,
            lineHeight: 1.5,
            color: ink2,
          }}
        >
          <span>Paste it below, we do the rest.</span>
          {byokHelpUrl && (
            <a
              data-mc-byok=""
              href={byokHelpUrl}
              target="_blank"
              rel="noopener"
              style={{ fontWeight: 600, color: accent, textDecoration: 'none' }}
            >
              How to get ↗
            </a>
          )}
        </div>

        {error !== '' && (
          <div
            data-mc-error=""
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 11px',
              borderRadius: radius,
              background: errSoft,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6, height: 6, borderRadius: 3, background: err,
                flex: '0 0 auto', marginTop: 6,
              }}
            />
            <span style={{ fontFamily: fontUi, fontSize: 12, fontWeight: 600, color: err, lineHeight: 1.45 }}>
              {error}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            data-mc-keyinput=""
            value={keyInput}
            disabled={busy}
            onChange={(e) => onKeyInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canAdd) onAdd();
            }}
            placeholder="AIza… / sk-proj-… / sk-ant-…"
            style={{
              flex: 1,
              minWidth: 0,
              padding: '10px 11px',
              border: `1px solid ${line2}`,
              borderRadius: radius,
              background: surface2,
              fontFamily: fontMono,
              fontSize: 13,
              color: ink,
            }}
          />
          <button
            type="button"
            data-mc-add=""
            disabled={!canAdd}
            onClick={onAdd}
            style={{
              flex: '0 0 auto',
              padding: '10px 18px',
              borderRadius: radius,
              border: `1px solid ${canAdd ? accent : line}`,
              background: canAdd ? accent : surface3,
              color: canAdd ? '#fff' : ink3,
              fontFamily: fontUi,
              fontSize: 13,
              fontWeight: 600,
              cursor: canAdd ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            {busy ? 'Checking…' : 'Add'}
          </button>
        </div>

        <div data-mc-providers="" style={{ fontFamily: fontUi, fontSize: 12, color: ink3 }}>
          {SUPPORTED_LIST}
        </div>
      </div>
    </div>
  );
}
