// #VoiceInput
// Press-and-hold microphone button for the chat sidebar. Visible only when the
// selected model accepts voice input and the provider's key is set. Holding
// records (a red ring animates), releasing sends, and Escape cancels.

import { useEffect, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

const RECORD_RED = '#dc2626';

export function MicButton({ controller, size }: { controller: WebController; size: CSSProperties }): ReactNode {
  useController(controller);
  const t = useTheme();

  const status = controller.voiceStatus;
  const recording = status === 'recording';
  const sending = status === 'sending';

  // Escape cancels an in-progress recording.
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        controller.cancelVoice();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recording, controller]);

  if (!controller.voiceAvailable()) return null;

  const press = (e: PointerEvent<HTMLButtonElement>): void => {
    if (sending) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    void controller.startVoice();
  };

  const release = (): void => {
    if (recording) void controller.stopVoice();
  };

  const title = recording
    ? 'Release to send · Esc to cancel'
    : sending
      ? 'Transcribing…'
      : 'Hold to record a voice request';

  return (
    <button
      type="button"
      className={recording ? 'tt-rec-ring' : undefined}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={() => controller.cancelVoice()}
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
      {sending ? (
        <span
          className="tt-spin"
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
