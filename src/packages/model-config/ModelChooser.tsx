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
import { Fragment, useState, type ReactNode } from 'react';
import { KEY_SETUP, PROVIDER_NAME } from './index.ts';
import type { Provider, Tier } from './index.ts';
import { estimateSecPer1kTok } from './probe.ts';
// Type-only: the component still touches no storage at runtime, it just names
// the same four-state speed value the cache reader produces.
import type { RoleSpeed } from './storage.ts';
import puterLogoUrl from './puter-logo.png';

/** One role row on a card. The two prices are catalogue values per thousand
 *  tokens (null for a model the catalogue doesn't price); `speed` is the
 *  four-state measurement (`speedOf` in storage.ts builds it). A working key
 *  with no speed reading is still a working key. */
export interface RoleRow {
  model: string;
  inUsdPer1kTok: number | null;
  outUsdPer1kTok: number | null;
  speed: RoleSpeed;
}

export interface ConnectedCard {
  id: Provider;
  tier: Tier;
  /** Whether this provider's primary model accepts audio input. */
  voice: boolean;
  /** The catalogue price is not necessarily what this account pays, because
   *  the provider has a free tier we cannot detect (Groq). The rows then name
   *  no price at all — a number that is wrong for most of a provider's users
   *  is worse than saying we do not know. */
  priceVariesByPlan?: boolean;
  /** This provider serves a free and a paid model set, so the card offers the
   *  choice. OpenRouter is the only one. */
  hasPaidModelSet?: boolean;
  /** Which set is running. Meaningless without `hasPaidModelSet`. */
  paidModelSet?: boolean;
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
  /** The in-flight connect is the Puter sign-in, so its button says so rather
   *  than just greying. The sign-in happens in a window in front of the panel;
   *  a panel that looks untouched when the user comes back reads as a click
   *  that never registered. */
  puterBusy?: boolean;
  onKeyInputChange: (value: string) => void;
  onAdd: () => void;
  onSelect: (p: Provider) => void;
  onRemove: (p: Provider) => void;
  /** The ⟳ button — re-run this provider's measurements. Omit it and no card
   *  shows one, so a host with nothing to re-measure gets no dead button. */
  onRefresh?: (p: Provider) => void;
  /** Switch a card between its free and paid model sets. Omit it and the
   *  control is not rendered, so a host that cannot persist the choice shows no
   *  switch that would not stick. */
  onPaidModelSetChange?: (p: Provider, paid: boolean) => void;
  /** The "No API key?" block's Puter.js sign-in. Omit it and the whole block —
   *  divider included — is left out, so a host that cannot open a sign-in
   *  window (the CLI, the demo page) shows no button that would not work. */
  onPuterSignIn?: () => void;
}

/** What a card header reads. Derived from PROVIDER_NAME rather than spelled out
 *  again: every provider but the gateway is "<name> API", and Puter is not an
 *  API you hold a key to. Exported so the host never spells these out either. */
export const PROVIDER_LABEL: Record<Provider, string> = Object.fromEntries(
  (Object.keys(PROVIDER_NAME) as Provider[])
    .map((p) => [p, p === 'puter' ? PROVIDER_NAME[p] : `${PROVIDER_NAME[p]} API`]),
) as Record<Provider, string>;

// ── Theme variables — every visual choice reads var(--mc-*, default) ───────

const v = (name: string, fallback: string): string => `var(--mc-${name}, ${fallback})`;

const ink = v('ink', '#1c1f23');
/** Readable *on* `ink` — the primary button's text. */
const inkOnInk = v('ink-on-ink', '#ffffff');
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
 *   $0.0015 in / $0.0075 out per 1000 tok, ~9.4 sec
 *
 * The prices are there once the catalogue knows the model — unless the provider
 * has a free tier we cannot detect, in which case the catalogue's number is
 * wrong for most of its users and the line says so instead. The `~Z sec` tail
 * is the measurement, so it reads `measuring…` while the call is out and
 * `speed unknown` when the call came back an error — a row that simply went
 * blank looked identical to one still loading. */
function costLine(row: RoleRow, priceVariesByPlan = false): string | null {
  const parts: string[] = [];
  if (priceVariesByPlan) {
    parts.push('Price depends on your plan');
  } else if (row.inUsdPer1kTok !== null && row.outUsdPer1kTok !== null) {
    parts.push(`$${money(row.inUsdPer1kTok)} in / $${money(row.outUsdPer1kTok)} out per 1000 tok`);
  }
  if (row.speed === 'measuring') parts.push('measuring…');
  else if (row.speed === 'failed') parts.push('speed unknown');
  else if (row.speed !== null) parts.push(`~${estimateSecPer1kTok(row.speed).toFixed(1)} sec`);
  return parts.length > 0 ? parts.join(', ') : null;
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
  puterBusy,
  onKeyInputChange,
  onAdd,
  onSelect,
  onRemove,
  onRefresh,
  onPaidModelSetChange,
  onPuterSignIn,
}: ModelChooserProps): ReactNode {
  const puterConnected = connected.some((c) => c.id === 'puter');
  const canAdd = keyInput.trim() !== '' && !busy;
  // The one piece of state the component owns: which provider's instructions
  // are expanded. It is ephemeral and means nothing to the host — nothing is
  // stored, nothing is resolved from it — so threading it through two hosts
  // would buy nothing.
  const [howTo, setHowTo] = useState<Provider | null>(null);
  const open = KEY_SETUP.find((s) => s.provider === howTo);

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

  // One role row: the label column and the model id on one line, the priced
  // line under both. The cost line starts at the row's left edge rather than
  // indented under the model id — indented, it had a third of the card to fit
  // a sentence in and got clipped.
  const roleRow = (
    role: 'primary' | 'secondary', row: RoleRow, priceVaries: boolean,
  ): ReactNode => {
    const cost = costLine(row, priceVaries);
    return (
      <div data-mc-model={row.model} data-mc-role={role}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              // Fixed, so the two rows' model ids line up under each other.
              width: 104,
              flex: '0 0 auto',
              fontFamily: fontUi,
              fontSize: 12,
              fontWeight: 650,
              whiteSpace: 'nowrap',
              // Both roles read the same: the secondary model is not a lesser
              // setting, it is the one that runs on every row.
              color: ink2,
            }}
          >
            {role === 'primary' ? 'Chat model' : 'Cell model'}
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
              fontFamily: fontUi,
              fontSize: 12,
              color: ink3,
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
              // Icon-only, so the label has to be the accessible name too — a
              // tooltip alone leaves a screen reader reading "button".
              aria-label={`Re-measure ${PROVIDER_LABEL[c.id]}`}
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
            aria-label={`Remove ${PROVIDER_LABEL[c.id]}`}
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
            {roleRow('primary', c.primary, c.priceVariesByPlan === true)}
            {roleRow('secondary', c.secondary, c.priceVariesByPlan === true)}
            {/* The free/paid choice is the user's, not the account's. A key with
                credits still opens on free: having a balance is not the same as
                wanting to spend it. A $0 key cannot pick paid at all, because
                every call would 402. */}
            {c.hasPaidModelSet && onPaidModelSetChange && (
              <div
                data-mc-modelset={c.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: fontUi, fontSize: 12 }}
              >
                {([false, true] as const).map((paid) => {
                  const on = (c.paidModelSet === true) === paid;
                  const locked = paid && c.tier === 'free';
                  return (
                    <button
                      key={String(paid)}
                      type="button"
                      data-mc-modelset-option={paid ? 'paid' : 'free'}
                      aria-pressed={on}
                      disabled={locked}
                      title={locked ? 'This key has no credit, so it can only reach free models.' : undefined}
                      onClick={() => onPaidModelSetChange(c.id, paid)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: radiusSm,
                        border: `1px solid ${on ? accent : line2}`,
                        background: on ? accentSoft : surface,
                        color: locked ? ink3 : on ? accent : ink2,
                        fontFamily: fontUi,
                        fontSize: 12,
                        fontWeight: on ? 600 : 400,
                        cursor: locked ? 'not-allowed' : 'pointer',
                        opacity: locked ? 0.55 : 1,
                      }}
                    >
                      {paid ? 'Paid models' : 'Free models'}
                    </button>
                  );
                })}
              </div>
            )}
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
        <div style={{ fontFamily: fontUi, fontSize: 13, fontWeight: 650, color: ink }}>
          Already have an API key?
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
            placeholder="Paste an API key here"
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
              // Filled ink once there is something to add — the host's primary
              // button. The accent is a pale sky in this theme, so an
              // accent-filled button read as the secondary of the pair.
              border: `1px solid ${canAdd ? ink : line}`,
              background: canAdd ? ink : surface3,
              color: canAdd ? inkOnInk : ink3,
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

        {/* Instructions live here rather than behind a link to the FAQ: the
            user who needs them is standing in front of this input, and a new
            tab is a round trip many never come back from. */}
        {/* Inline, not flex: five names and four slashes have to fit on one
            line in a 400px sheet, so the separators carry no space of their
            own — the padding on each button keeps the labels off the slashes
            without a line break's worth of gap. The open one is underlined —
            the cheapest possible "this is the one you are reading". */}
        <div
          data-mc-providers=""
          style={{ fontFamily: fontUi, fontSize: 12, lineHeight: 1.6, color: ink3 }}
        >
          {'Instructions: '}
          {KEY_SETUP.map((setup, i) => (
            <Fragment key={setup.provider}>
              {i > 0 && <span aria-hidden="true">/</span>}
              <button
                type="button"
                data-mc-howto={setup.provider}
                aria-expanded={howTo === setup.provider}
                onClick={() => setHowTo(howTo === setup.provider ? null : setup.provider)}
                style={{
                  padding: '0 3px',
                  border: 0,
                  background: 'transparent',
                  fontFamily: fontUi,
                  fontSize: 12,
                  fontWeight: 600,
                  color: accent,
                  cursor: 'pointer',
                  textDecoration: howTo === setup.provider ? 'underline' : 'none',
                  textUnderlineOffset: 3,
                }}
              >
                {PROVIDER_NAME[setup.provider]}
              </button>
            </Fragment>
          ))}
        </div>

        {open !== undefined && (
          <div
            data-mc-howto-body={open.provider}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '10px 11px',
              borderRadius: radius,
              background: surface2,
              border: `1px solid ${line}`,
              fontFamily: fontUi,
              fontSize: 12,
              lineHeight: 1.5,
              color: ink2,
            }}
          >
            {/* One paragraph: the steps read as prose, not as a checklist of
                three one-line bullets. The recommended provider's first line is
                bold, because it is the answer to the question the user is
                actually asking here — which of these five do I pick? */}
            <span>
              {open.recommended && <strong>{open.steps[0]}{' '}</strong>}
              {open.steps.slice(open.recommended ? 1 : 0).join(' ')}
            </span>
            <span>
              <a
                href={open.url}
                target="_blank"
                rel="noopener"
                style={{ fontWeight: 600, color: accent, textDecoration: 'none' }}
              >
                {open.action} ↗
              </a>
              {` (starts with ${open.prefix})`}
            </span>
          </div>
        )}
      </div>

      {/* ── No API key? — sign in to the Puter.js gateway ───────────────── */}
      {onPuterSignIn && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontFamily: fontUi, fontSize: 13, fontWeight: 650, color: ink }}>
            No API key?
          </div>
          <button
            type="button"
            data-mc-puter=""
            disabled={puterConnected || busy}
            onClick={() => onPuterSignIn()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              width: '100%',
              padding: '11px 14px',
              borderRadius: 9,
              border: `1px solid ${puterConnected ? okSoft : line2}`,
              background: puterConnected ? okSoft : surface,
              color: puterConnected ? ok : ink,
              fontFamily: fontUi,
              fontSize: 13,
              fontWeight: 600,
              cursor: puterConnected ? 'default' : 'pointer',
            }}
          >
            <img
              data-mc-puter-logo=""
              src={puterLogoUrl}
              alt=""
              width={17}
              height={17}
              style={{ borderRadius: 5, display: 'block', flex: '0 0 auto' }}
            />
            {puterConnected
              ? 'Connected to Puter.js'
              : puterBusy ? 'Signing in…' : 'Sign in / Sign up to Puter.js'}
          </button>
          {/* Under the button, not above it: it is the reason to press the
              button, which reads better as a footnote than as a preamble. */}
          <div style={{ fontFamily: fontUi, fontSize: 12, lineHeight: 1.5, color: ink3 }}>
            $0.25 in API credits for any model on Puter.js sign up.
          </div>
        </div>
      )}
    </div>
  );
}
