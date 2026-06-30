// #MobileShell
// The three bottom panes that take the dock's place: a text composer
// (KeyboardSheet), the voice recorder (VoiceSheet), and the undo timeline
// (HistorySheet). Each renders at the same fixed height so swapping between
// them never resizes the region under the table.
import { useEffect, useRef, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon } from '@tamedtable/ui-kit/components';
import type { TimelineStep } from '@tamedtable/headless';
import type { VoiceStatus } from '../../controller.ts';

const SHEET_H = 300;

const SUGGESTIONS = [
  'normalize phone numbers',
  'keep rows with Score ≥ 8',
  'add a Country column',
  'drop duplicate emails',
];

const sheetBase = (t: Theme): React.CSSProperties => ({
  flex: '0 0 auto',
  height: SHEET_H,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  background: t.surface,
  borderTop: `1px solid ${t.line}`,
});

// ── Type: composer + tap-to-fill suggestion chips ──────────────────────────
export function KeyboardSheet({
  t,
  draft,
  onDraft,
  onSend,
  onClose,
  inputId,
}: {
  t: Theme;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  inputId?: string;
}): ReactNode {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const hasDraft = draft.trim() !== '';
  return (
    <div className="tt-sheet" data-mob-sheet="keyboard" style={sheetBase(t)}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', gap: space.px6, padding: `${space.px8}px ${space.px10}px 0`, overflowX: 'auto' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onDraft(s)}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                lineHeight: 1,
                border: `1px solid ${t.line2}`,
                borderRadius: 16,
                padding: '0 12px',
                background: t.surface2,
                color: t.ink2,
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
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
              alignItems: 'center',
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
              value={draft}
              rows={1}
              placeholder="Describe a transformation…"
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
                lineHeight: '22px',
                color: t.ink,
                maxHeight: 80,
                padding: 0,
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
    <div className="tt-sheet" data-mob-sheet="voice" style={{ ...sheetBase(t), padding: '16px 16px 18px' }}>
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
    <div className="tt-sheet" data-mob-sheet="history" style={sheetBase(t)}>
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
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  flex: '0 0 auto',
                  border: `1.5px ${state === 'undone' ? 'dashed' : 'solid'} ${state === 'cur' ? t.accent : t.ink4}`,
                  background: state === 'cur' ? t.accent : 'transparent',
                }}
              />
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
