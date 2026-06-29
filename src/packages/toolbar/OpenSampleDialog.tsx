// #Toolbar
// The "Open sample" picker — a modal listing the bundled sample files. Pure
// props in, callbacks out: the host supplies the sample list (filenames +
// composed URLs); clicking a row loads it straight away via onPick, no extra
// confirm. Samples used to live inside the URL dialog; they get their own
// first-class surface so nobody has to guess they hide behind "URL".
import { useEffect, useState, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import { sampleKind, type ToolbarSample } from './index.ts';

export interface OpenSampleDialogProps {
  open: boolean;
  /** Bundled sample files — the host composes each full URL. */
  samples: ReadonlyArray<ToolbarSample>;
  /** Load the picked sample's URL. */
  onPick: (url: string) => void;
  onClose: () => void;
}

export function OpenSampleDialog({ open, samples, onPick, onClose }: OpenSampleDialogProps): ReactNode {
  const t = useTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = (url: string): void => {
    onPick(url);
    onClose();
  };

  return (
    <div
      data-tb-sample-dialog=""
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: t.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '92vw',
          maxHeight: '88vh',
          background: t.surface,
          border: `1px solid ${t.line2}`,
          borderRadius: space.radiusLg,
          boxShadow: t.shadowLg,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            padding: `${space.px12}px ${space.px16}px`,
            borderBottom: `1px solid ${t.line}`,
          }}
        >
          <span
            style={{
              fontFamily: typography.ui,
              fontSize: typography.size.md,
              fontWeight: 600,
              color: t.ink,
            }}
          >
            Open a sample
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{
              background: 'transparent',
              border: 0,
              padding: space.px4,
              cursor: 'pointer',
              color: t.ink3,
              display: 'flex',
            }}
          >
            <Icon name="x" />
          </button>
        </div>

        {/* body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: space.px16,
            display: 'flex',
            flexDirection: 'column',
            gap: space.px8,
          }}
        >
          <div
            style={{
              fontFamily: typography.ui,
              fontSize: typography.size.xs,
              lineHeight: 1.55,
              color: t.ink3,
            }}
          >
            Bundled with TamedTable. Pick one to load it now.
          </div>
          <div
            role="listbox"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              border: `1px solid ${t.line2}`,
              borderRadius: space.radius,
              background: t.surface2,
              padding: space.px4,
            }}
          >
            {samples.length === 0 && (
              <div
                style={{
                  padding: '8px 10px',
                  fontFamily: typography.ui,
                  fontSize: typography.size.sm,
                  color: t.ink3,
                }}
              >
                No sample files bundled.
              </div>
            )}
            {samples.map((sample) => (
              <SampleRow key={sample.name} sample={sample} onPick={() => pick(sample.url)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SampleRow({ sample, onPick }: { sample: ToolbarSample; onPick: () => void }): ReactNode {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      data-tb-sample=""
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Open ${sample.name}`}
      style={{
        textAlign: 'left',
        background: hover ? t.surface3 : 'transparent',
        border: 0,
        borderRadius: space.radiusSm,
        padding: '8px 10px',
        cursor: 'pointer',
        color: t.ink,
        fontFamily: typography.mono,
        fontSize: typography.size.sm,
        display: 'flex',
        alignItems: 'center',
        gap: space.px8,
      }}
    >
      <span
        style={{
          fontFamily: typography.ui,
          fontSize: typography.size.xs,
          color: t.ink3,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          minWidth: 36,
        }}
      >
        {sampleKind(sample.name)}
      </span>
      <span>{sample.name}</span>
    </button>
  );
}
