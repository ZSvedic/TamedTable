// #ChatPanel
// Microphone button for the chat input row, with two ways to record — matching
// the pattern voice chat apps use, so users who hold AND users who tap both work:
//
//  • Press and hold → records while held, sends on release (push-to-talk).
//  • Quick tap → latches recording hands-free; the button swaps to explicit
//    cancel (✕) and send (✓) controls, so a tap never sends an empty clip.
//
// A release counts as a hold only past HOLD_MS; anything shorter latches. The
// ring and spinner animations ship inside the component.

import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useTheme } from '@tamedtable/ui-kit/components';
import { Icon } from '@tamedtable/ui-kit/components';
import type { VoiceButtonStatus } from './index.ts';

/** A release shorter than this latches (tap); longer sends (hold). */
const HOLD_MS = 250;

// The pulsing record ring is built from the theme's `rec` token so the red
// lives in one place (ui-kit) — color-mix fades the same token to transparent.
const micCss = (rec: string): string =>
  `@keyframes cp-rec-kf { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, ${rec} 55%, transparent); }` +
  ` 70% { box-shadow: 0 0 0 7px color-mix(in srgb, ${rec} 0%, transparent); }` +
  ` 100% { box-shadow: 0 0 0 0 color-mix(in srgb, ${rec} 0%, transparent); } }` +
  ' .cp-rec-ring { animation: cp-rec-kf 1.1s ease-out infinite; }' +
  ' @keyframes cp-spin-kf { to { transform: rotate(360deg); } }' +
  ' .cp-spin { animation: cp-spin-kf 0.7s linear infinite; }';

const DEFAULT_SIZE: CSSProperties = {
  height: 30,
  width: 30,
  flex: '0 0 auto',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function MicButton({
  status,
  onStart,
  onLatch,
  onStop,
  onCancel,
  size = DEFAULT_SIZE,
  id,
}: {
  status: VoiceButtonStatus;
  onStart: () => void;
  /** A quick tap released this recording hands-free — keep recording, show the
   *  cancel/send controls. */
  onLatch: () => void;
  onStop: () => void;
  onCancel: () => void;
  size?: CSSProperties;
  /** DOM id (e.g. for a Driver.js tour spotlight on the voice control). */
  id?: string;
}): ReactNode {
  const t = useTheme();
  const recording = status === 'recording';
  const latched = status === 'latched';
  const sending = status === 'sending';

  // A live press, tracked in a ref (not `status`) so the tap/hold decision works
  // even before the async `onStart` has flipped the status to 'recording'.
  const pressedRef = useRef(false);
  const pressTimeRef = useRef(0);

  // Escape cancels an in-progress recording, whether held or latched.
  useEffect(() => {
    if (!recording && !latched) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recording, latched, onCancel]);

  const press = (e: PointerEvent<HTMLButtonElement>): void => {
    if (sending) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events (tests) have no active pointer to capture.
    }
    pressedRef.current = true;
    pressTimeRef.current = Date.now();
    onStart();
  };

  const release = (): void => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    // Held long enough → push-to-talk send; a quick tap → latch and keep going.
    if (Date.now() - pressTimeRef.current >= HOLD_MS) onStop();
    else onLatch();
  };

  const pointerCancel = (): void => {
    pressedRef.current = false;
    onCancel();
  };

  // Latched: the press-and-hold mic gives way to explicit controls — cancel (✕)
  // discards, send (✓) stops and sends. A pulsing dot signals it is still live.
  if (latched) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <style>{micCss(t.rec)}</style>
        <span
          aria-hidden
          className="cp-rec-ring"
          style={{ width: 10, height: 10, borderRadius: '50%', background: t.rec, flex: '0 0 auto' }}
        />
        <button
          type="button"
          onClick={onCancel}
          title="Cancel recording"
          aria-label="Cancel recording"
          data-testid="mic-cancel"
          style={{
            ...size,
            border: `1px solid ${t.line2}`,
            background: 'transparent',
            color: t.ink2,
            cursor: 'pointer',
          }}
        >
          <Icon name="x" />
        </button>
        <button
          type="button"
          onClick={onStop}
          title="Send recording"
          aria-label="Send recording"
          data-testid="mic-send"
          style={{
            ...size,
            border: `1px solid ${t.accent}`,
            background: t.accent,
            color: t.inkOnInk,
            cursor: 'pointer',
          }}
        >
          <Icon name="ok" />
        </button>
      </div>
    );
  }

  const title = recording
    ? 'Release to send · tap for hands-free · Esc to cancel'
    : sending
      ? 'Transcribing…'
      : 'Hold to record, or tap for hands-free';

  return (
    <button
      type="button"
      id={id}
      className={recording ? 'cp-rec-ring' : undefined}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={pointerCancel}
      disabled={sending}
      title={title}
      aria-label={title}
      data-testid="mic-button"
      style={{
        ...size,
        border: `1px solid ${recording ? t.rec : t.line2}`,
        background: recording ? t.rec : 'transparent',
        color: recording ? t.onRec : sending ? t.ink3 : t.ink2,
        cursor: sending ? 'default' : 'pointer',
        touchAction: 'none',
      }}
    >
      <style>{micCss(t.rec)}</style>
      {sending ? (
        <span
          className="cp-spin"
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: `2px solid ${t.line2}`,
            borderTopColor: t.ink2,
            display: 'block',
          }}
        />
      ) : (
        <Icon name="mic" />
      )}
    </button>
  );
}
