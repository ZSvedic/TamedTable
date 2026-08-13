// #Toolbar
// The "Open sample" picker — a modal in two tiers. It leads with the handful
// of recommended samples the host passes (titled rows, one per homepage
// feature section), and hides the whole bundle behind a "Show all …"
// disclosure: a first-time visitor should meet files worth opening, not sixty
// test fixtures, while a developer is one click from all of them. Pure props
// in, callbacks out: the host composes every URL; clicking any row loads it
// straight away via onPick, no extra confirm. Samples used to live inside the
// URL dialog; they get their own first-class surface so nobody has to guess
// they hide behind "URL".
import { useEffect, useState, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import { sampleKind, type RecommendedSample, type ToolbarSample } from './index.ts';

export interface OpenSampleDialogProps {
  open: boolean;
  /** The curated rows, in display order — the host composes each full URL. */
  recommended: ReadonlyArray<RecommendedSample>;
  /** Every bundled sample file, behind the "Show all …" disclosure. */
  samples: ReadonlyArray<ToolbarSample>;
  /** Load the picked sample's URL. */
  onPick: (url: string) => void;
  onClose: () => void;
}

export function OpenSampleDialog({
  open,
  recommended,
  samples,
  onPick,
  onClose,
}: OpenSampleDialogProps): ReactNode {
  const t = useTheme();
  // With nothing recommended there is nothing to lead with — show the bundle.
  const [showAll, setShowAll] = useState(recommended.length === 0);

  // Each opening starts collapsed again — the dialog stays mounted between
  // opens, so without this the disclosure would remember the last visit.
  useEffect(() => {
    if (open) setShowAll(recommended.length === 0);
  }, [open, recommended.length]);

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
            {recommended.length > 0
              ? 'One table per feature — the same ones the tours use. Pick one to load it now.'
              : 'Bundled with TamedTable. Pick one to load it now.'}
          </div>

          {recommended.length > 0 && (
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
              {recommended.map((sample) => (
                <RecommendedRow key={sample.name} sample={sample} onPick={() => pick(sample.url)} />
              ))}
            </div>
          )}

          {/* The whole bundle — a developer's testing surface, one click away
              but never the first impression. */}
          {!showAll && (
            <button
              type="button"
              data-tb-sample-more=""
              onClick={() => setShowAll(true)}
              style={{
                alignSelf: 'flex-start',
                background: 'transparent',
                border: 0,
                padding: `${space.px4}px 0`,
                cursor: 'pointer',
                color: t.ink3,
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                textDecoration: 'underline',
              }}
            >
              {`Show all ${samples.length} bundled files`}
            </button>
          )}

          {showAll && (
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
          )}
        </div>
      </div>
    </div>
  );
}

/** A recommended row: the human title on the leading line, the filename below
 *  it — the file still matters (it is what you copy and re-open), it just
 *  stops being the headline. */
function RecommendedRow({ sample, onPick }: { sample: RecommendedSample; onPick: () => void }): ReactNode {
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
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span
        style={{
          fontFamily: typography.ui,
          fontSize: typography.size.sm,
          fontWeight: 600,
          color: t.ink,
        }}
      >
        {sample.title}
      </span>
      <span
        style={{
          fontFamily: typography.mono,
          fontSize: typography.size.xs,
          color: t.ink3,
        }}
      >
        {sample.name}
      </span>
    </button>
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
