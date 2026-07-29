// #MobileShell
// The three bottom panes that take the dock's place: a text composer
// (KeyboardSheet), the voice recorder (VoiceSheet), and the undo timeline
// (HistorySheet). Voice and History share one fixed height so swapping
// between them never resizes the region under the table; the composer is only
// as tall as its input row — the OS keyboard right below it does the rest.
import { useEffect, useRef, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon } from '@tamedtable/ui-kit/components';
import { StatusDot } from '@tamedtable/chat-panel/components';
import type { TimelineStep } from '@tamedtable/headless';
import type { VoiceStatus } from '../../controller.ts';

const SHEET_H = 300;

// The composer's line height and its growth ceiling: the field grows with the
// draft up to five lines, then scrolls inside (the messaging-app behavior).
const COMPOSER_LINE_H = 22;
const COMPOSER_PAD_V = 9;
const COMPOSER_MAX_H = 5 * COMPOSER_LINE_H + 2 * COMPOSER_PAD_V;

const sheetBase = (t: Theme, fixedHeight?: number): React.CSSProperties => ({
  flex: '0 0 auto',
  // Grow by the home-indicator inset and pad it back, so the sheet keeps its
  // content height and nothing sits under the iOS home indicator. The
  // composer passes no fixedHeight — it hugs its input row.
  height: fixedHeight != null ? `calc(${fixedHeight}px + env(safe-area-inset-bottom))` : undefined,
  paddingBottom: 'env(safe-area-inset-bottom)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  background: t.surface,
  borderTop: `1px solid ${t.line}`,
});

// ── Type: composer ──────────────────────────────────────────────────────────
export function KeyboardSheet({
  t,
  draft,
  onDraft,
  onSend,
  onClose,
  lifted,
  inputId,
  disabledHint = null,
}: {
  t: Theme;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  /** True while the sheet rides above the OS keyboard — the keyboard covers
   *  the home indicator, so the safe-area padding would be dead space. */
  lifted: boolean;
  inputId?: string;
  /** Non-null disables the composer: the field and send grey out and this
   *  text shows as the placeholder — the same "input is off, here is why"
   *  state the desktop chat panel renders (staying in a finished tour). */
  disabledHint?: string | null;
}): ReactNode {
  const disabled = disabledHint !== null;
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);
  // Auto-grow: size the field to its content on every draft change (collapse
  // to a line first so deletions shrink it), capped at the five-line ceiling.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = `${COMPOSER_LINE_H + 2 * COMPOSER_PAD_V}px`;
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_H)}px`;
  }, [draft]);
  const hasDraft = !disabled && draft.trim() !== '';
  return (
    <div
      className="tt-sheet"
      data-mob-sheet="keyboard"
      style={{ ...sheetBase(t), ...(lifted ? { paddingBottom: 0 } : null) }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.px8, padding: space.px10 }}>
          <button
            type="button"
            onClick={onClose}
            title="Close keyboard"
            style={{
              width: 40,
              height: 40,
              flex: '0 0 auto',
              boxSizing: 'border-box',
              borderRadius: 11,
              border: `1px solid ${t.line2}`,
              background: 'transparent',
              color: t.ink3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="chevron" size={20} />
          </button>
          <div
            style={{
              flex: 1,
              boxSizing: 'border-box',
              display: 'flex',
              // Bottom-anchor the send button while the field grows upward.
              alignItems: 'flex-end',
              gap: space.px8,
              minHeight: 40,
              border: `1.5px solid ${t.accent}`,
              borderRadius: 12,
              padding: '0 4px 0 14px',
              background: t.surface,
              boxShadow: `0 0 0 3px ${t.ring}`,
            }}
          >
            <textarea
              id={inputId}
              ref={ref}
              // autoFocus + the mount focus below give iOS the best chance to
              // raise the native keyboard when the Type sheet opens.
              autoFocus={!disabled}
              value={disabled ? '' : draft}
              rows={1}
              placeholder={disabledHint ?? 'Describe a transformation…'}
              disabled={disabled}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              style={{
                flex: 1,
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: typography.ui,
                fontSize: typography.size.base,
                lineHeight: `${COMPOSER_LINE_H}px`,
                color: disabled ? t.ink3 : t.ink,
                height: COMPOSER_LINE_H + 2 * COMPOSER_PAD_V,
                maxHeight: COMPOSER_MAX_H,
                overflowY: 'auto',
                padding: `${COMPOSER_PAD_V}px 0`,
              }}
            />
            <button
              type="button"
              data-mob-send=""
              onClick={onSend}
              disabled={!hasDraft}
              title="Send"
              style={{
                width: 28,
                height: 28,
                flex: '0 0 auto',
                marginBottom: 6, // centered in the one-line row, bottom-anchored as it grows
                borderRadius: '50%',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasDraft ? 'pointer' : 'default',
                background: hasDraft ? t.accent : t.surface3,
                color: hasDraft ? t.inkOnAcc : t.ink4,
              }}
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── a small animated voice waveform ────────────────────────────────────────
function Waveform({ color, active }: { color: string; active: boolean }): ReactNode {
  const bars = 28;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 30, flex: 1 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: '100%',
            borderRadius: 2,
            background: color,
            transformOrigin: 'center',
            animation: active ? `tt-wave ${0.7 + (i % 5) * 0.12}s ease-in-out ${(i % 7) * 0.06}s infinite` : 'none',
            transform: active ? undefined : 'scaleY(.3)',
          }}
        />
      ))}
    </div>
  );
}

// ── Speak: record → send → transcribe-and-run → close ──────────────────────
export function VoiceSheet({
  t,
  status,
  onSend,
  onCancel,
}: {
  t: Theme;
  status: VoiceStatus;
  onSend: () => void;
  onCancel: () => void;
}): ReactNode {
  const recording = status === 'recording';
  const sending = status === 'sending';
  return (
    <div className="tt-sheet" data-mob-sheet="voice" style={{ ...sheetBase(t, SHEET_H), padding: '16px 16px calc(18px + env(safe-area-inset-bottom))' }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: space.px16,
        }}
      >
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, color: t.ink, lineHeight: 1.5, minHeight: 22 }}>
          {recording ? <span style={{ color: t.ink4 }}>Listening…</span> : <span style={{ color: t.ink4 }}>…</span>}
        </div>
        <Waveform color={recording ? t.accent : t.ink4} active={recording} />
        {sending && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space.px8,
              fontFamily: typography.ui,
              fontSize: typography.size.sm,
              color: t.ink3,
            }}
          >
            <span
              className="tt-spin"
              style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${t.line2}`, borderTopColor: t.ink2 }}
            />
            Transcribing &amp; running…
          </div>
        )}
      </div>
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: space.px10, marginTop: space.px12 }}>
        <button
          type="button"
          onClick={onCancel}
          title="Cancel"
          disabled={sending}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: `1px solid ${t.line2}`,
            background: 'transparent',
            color: t.ink2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: sending ? 'default' : 'pointer',
            opacity: sending ? 0.4 : 1,
          }}
        >
          <Icon name="x" size={18} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          data-mob-voice-send=""
          onClick={onSend}
          disabled={sending}
          title="Send"
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: 'none',
            background: sending ? t.surface3 : t.accent,
            color: sending ? t.ink4 : t.inkOnAcc,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: sending ? 'default' : 'pointer',
            paddingLeft: 3,
          }}
        >
          <Icon name="play" size={22} />
        </button>
      </div>
    </div>
  );
}

// ── History: the undo timeline (newest at top), tap a step to jump ──────────
function relTime(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 8) return 'now';
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

export function HistorySheet({
  t,
  steps,
  cursor,
  now,
  onClose,
  onJump,
  onUndo,
  onRedo,
}: {
  t: Theme;
  steps: TimelineStep[];
  cursor: number;
  now: number;
  onClose: () => void;
  onJump: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}): ReactNode {
  const order = steps.map((_, i) => i).reverse(); // newest first
  const navBtn = (icon: 'undo' | 'redo', label: string, on: () => void, enabled: boolean): ReactNode => (
    <button
      type="button"
      onClick={on}
      disabled={!enabled}
      title={label}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 8,
        border: `1px solid ${t.line2}`,
        background: 'transparent',
        color: enabled ? t.ink2 : t.ink4,
        cursor: enabled ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: space.px6,
        fontFamily: typography.ui,
        fontSize: typography.size.sm,
        fontWeight: 500,
      }}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
  return (
    <div className="tt-sheet" data-mob-sheet="history" style={sheetBase(t, SHEET_H)}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: space.px8,
          padding: '10px 10px 9px',
          borderBottom: `1px solid ${t.line}`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          title="Close history"
          style={{
            width: 36,
            height: 36,
            flex: '0 0 auto',
            borderRadius: 10,
            border: `1px solid ${t.line2}`,
            background: 'transparent',
            color: t.ink3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="chevron" size={20} />
        </button>
        <span style={{ fontFamily: typography.ui, fontSize: typography.size.xs, fontWeight: 700, letterSpacing: 0.7, color: t.ink3 }}>
          HISTORY
        </span>
        <span style={{ flex: 1 }} />
        {navBtn('undo', 'Undo', onUndo, cursor >= 0)}
        {navBtn('redo', 'Redo', onRedo, cursor < steps.length - 1)}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {steps.length === 0 && (
          <div style={{ padding: space.px16, color: t.ink3, fontFamily: typography.ui, fontSize: typography.size.sm }}>
            No changes yet.
          </div>
        )}
        {order.map((i) => {
          const state = i > cursor ? 'undone' : i === cursor ? 'cur' : 'done';
          return (
            <button
              key={i}
              type="button"
              data-mob-history-step={i}
              onClick={() => onJump(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: space.px12,
                width: '100%',
                padding: '11px 18px',
                border: 0,
                borderBottom: `1px solid ${t.line}`,
                background: state === 'cur' ? t.accentSoft : 'transparent',
                color: state === 'undone' ? t.ink4 : t.ink,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                fontWeight: state === 'cur' ? 600 : 400,
              }}
            >
              {/* The same marker logic the chat panel's replies use: solid ok
                  dot = applied, hollow circle = undone. The current point is
                  the highlighted row, not a third icon state. */}
              <StatusDot state={state === 'undone' ? 'undone' : 'ok'} size={8} />
              <span style={{ flex: 1 }}>{steps[i]!.label}</span>
              <span style={{ fontFamily: typography.mono, fontSize: typography.size.micro, color: t.ink4 }}>
                {relTime(steps[i]!.time, now)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
