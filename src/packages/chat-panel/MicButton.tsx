// #ChatPanel
// Press-and-hold microphone button for the chat input row. Holding records
// (a red ring animates), releasing sends, and Escape or pointer-cancel
// cancels. Whether the button appears at all is the host's call. The ring
// and spinner animations ship inside the component.

import { useEffect, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useTheme } from '@tamedtable/ui-kit/components';
import { Icon } from '@tamedtable/ui-kit/components';
import type { VoiceButtonStatus } from './index.ts';

const RECORD_RED = '#dc2626';

const MIC_CSS =
  '@keyframes cp-rec-kf { 0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55); }' +
  ' 70% { box-shadow: 0 0 0 7px rgba(220, 38, 38, 0); }' +
  ' 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); } }' +
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
  onStop,
  onCancel,
  size = DEFAULT_SIZE,
}: {
  status: VoiceButtonStatus;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  size?: CSSProperties;
}): ReactNode {
  const t = useTheme();
  const recording = status === 'recording';
  const sending = status === 'sending';

  // Escape cancels an in-progress recording.
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recording, onCancel]);

  const press = (e: PointerEvent<HTMLButtonElement>): void => {
    if (sending) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events (tests) have no active pointer to capture.
    }
    onStart();
  };

  const release = (): void => {
    if (recording) onStop();
  };

  const title = recording
    ? 'Release to send · Esc to cancel'
    : sending
      ? 'Transcribing…'
      : 'Hold to record a voice request';

  return (
    <button
      type="button"
      className={recording ? 'cp-rec-ring' : undefined}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={onCancel}
      disabled={sending}
      title={title}
      aria-label={title}
      data-testid="mic-button"
      style={{
        ...size,
        border: `1px solid ${recording ? RECORD_RED : t.line2}`,
        background: recording ? RECORD_RED : 'transparent',
        color: recording ? '#fff' : sending ? t.ink3 : t.ink2,
        cursor: sending ? 'default' : 'pointer',
        touchAction: 'none',
      }}
    >
      <style>{MIC_CSS}</style>
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
