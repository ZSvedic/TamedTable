// #ChatPanel
// Toggle button for hands-free continuous voice — the waveform sibling of the
// press-and-hold MicButton. One click starts listening (the bars pulse), another
// stops; while a detected turn is being sent it shows a spinner. Whether it
// appears at all is the host's call. Animations ship inside the component.

import { type CSSProperties, type ReactNode } from 'react';
import { useTheme } from '@tamedtable/ui-kit/components';
import { Icon } from '@tamedtable/ui-kit/components';
import type { ContinuousButtonStatus } from './index.ts';

// Pulsing ring while listening, built from the theme's `rec` token so the red
// lives in one place; the spinner keyframe is shared with MicButton's spelling.
const waveCss = (rec: string): string =>
  `@keyframes cp-wave-kf { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, ${rec} 55%, transparent); }` +
  ` 70% { box-shadow: 0 0 0 7px color-mix(in srgb, ${rec} 0%, transparent); }` +
  ` 100% { box-shadow: 0 0 0 0 color-mix(in srgb, ${rec} 0%, transparent); } }` +
  ' .cp-wave-pulse { animation: cp-wave-kf 1.1s ease-out infinite; }' +
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

export function WaveButton({
  status,
  onToggle,
  size = DEFAULT_SIZE,
}: {
  status: ContinuousButtonStatus;
  onToggle: () => void;
  size?: CSSProperties;
}): ReactNode {
  const t = useTheme();
  const listening = status === 'listening';
  const sending = status === 'sending';
  const active = listening || sending;

  const title = listening
    ? 'Listening — click to stop'
    : sending
      ? 'Sending…'
      : 'Hands-free voice — click to start';

  return (
    <button
      type="button"
      className={listening ? 'cp-wave-pulse' : undefined}
      onClick={onToggle}
      title={title}
      aria-label={title}
      data-testid="wave-button"
      style={{
        ...size,
        border: `1px solid ${active ? t.rec : t.line2}`,
        background: active ? t.rec : 'transparent',
        color: active ? t.onRec : t.ink2,
        cursor: 'pointer',
      }}
    >
      <style>{waveCss(t.rec)}</style>
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
        <Icon name="wave" />
      )}
    </button>
  );
}
