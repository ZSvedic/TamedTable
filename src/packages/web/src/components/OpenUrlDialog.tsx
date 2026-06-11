import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button, Icon } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

// Sample files bundled into the deployed site by vite.config.ts. Frozen at
// build time; surfaced here as one-click quick-picks.
declare const __TT_SAMPLE_FILES__: readonly string[];

/** Compose a full URL to a bundled sample file (so the URL field shows the
 *  exact location the user can copy and paste back later). */
function sampleUrl(name: string): string {
  // import.meta.env.BASE_URL is "/TamedTable/" on the deployed site and
  // "/" in some test configurations; both compose correctly through URL().
  return new URL(`${import.meta.env.BASE_URL}samples/${name}`, window.location.href).toString();
}

export function OpenUrlDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sorted, deduplicated for safety. Filenames only; sampleUrl() expands them.
  const samples = useMemo(() => [...__TT_SAMPLE_FILES__], []);

  // Reset on each open so the dialog starts clean.
  useEffect(() => {
    if (controller.urlDialogOpen) {
      setUrl('');
      setError(null);
      setLoading(false);
      // Defer focus until the input is in the DOM.
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return;
  }, [controller.urlDialogOpen]);

  if (!controller.urlDialogOpen) return null;

  const close = (): void => {
    if (loading) return;
    controller.closeUrlDialog();
  };

  const submit = async (target: string): Promise<void> => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await controller.loadFromUrl(target);
      controller.closeUrlDialog();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Picking a sample fills the URL field rather than auto-submitting. That
  // way the user sees the URL they're about to load (and can edit it) — and
  // one consistent action ("Load") submits, whether the URL was typed or
  // picked. Noted in the PR description.
  const pickSample = (name: string): void => {
    setUrl(sampleUrl(name));
    setError(null);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit(url);
    }
  };

  // Soft warning for http (the default is to support both; we don't refuse
  // it — just flag it so the user knows the connection is unencrypted).
  const httpWarning =
    url.trim().toLowerCase().startsWith('http://') ? 'Note: http:// is unencrypted.' : null;

  return (
    <div
      onClick={close}
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
        onKeyDown={onKeyDown}
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
            Open from URL
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={close}
            title="Close"
            disabled={loading}
            style={{
              background: 'transparent',
              border: 0,
              padding: space.px4,
              cursor: loading ? 'default' : 'pointer',
              color: t.ink3,
              display: 'flex',
              opacity: loading ? 0.4 : 1,
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
            gap: space.px16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                fontWeight: 600,
                color: t.ink,
                marginBottom: space.px4,
              }}
            >
              URL
            </div>
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                lineHeight: 1.55,
                color: t.ink3,
                marginBottom: space.px8,
              }}
            >
              Paste a link to a .csv or .jsonl file. The remote server must allow
              cross-origin requests.
            </div>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/data.csv"
              spellCheck={false}
              autoComplete="off"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                border: `1px solid ${t.line2}`,
                borderRadius: space.radius,
                background: t.surface2,
                fontFamily: typography.mono,
                fontSize: typography.size.sm,
                color: t.ink,
                outline: 'none',
              }}
            />
            {httpWarning && (
              <div
                style={{
                  marginTop: space.px6,
                  fontFamily: typography.ui,
                  fontSize: typography.size.xs,
                  color: t.ink3,
                }}
              >
                {httpWarning}
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                fontWeight: 600,
                color: t.ink,
                marginBottom: space.px4,
              }}
            >
              Or pick a sample file
            </div>
            <div
              style={{
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                lineHeight: 1.55,
                color: t.ink3,
                marginBottom: space.px8,
              }}
            >
              Shipped with TamedTable. Picking one fills the URL field — press
              Load to fetch.
            </div>
            <div
              role="listbox"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                maxHeight: 240,
                overflowY: 'auto',
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
              {samples.map((name) => (
                <SampleRow key={name} name={name} onPick={() => pickSample(name)} />
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: '8px 10px',
                border: `1px solid ${t.err}`,
                background: t.errSoft,
                borderRadius: space.radius,
                color: t.err,
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: space.px8,
              }}
            >
              <Icon name="err" />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: space.px8,
            padding: space.px14,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          <Button variant="chrome" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void submit(url)}
            disabled={loading || !url.trim()}
          >
            {loading ? 'Loading…' : 'Load'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SampleRow({ name, onPick }: { name: string; onPick: () => void }): ReactNode {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Use ${name}`}
      style={{
        textAlign: 'left',
        background: hover ? t.surface3 : 'transparent',
        border: 0,
        borderRadius: space.radiusSm,
        padding: '6px 8px',
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
        {name.endsWith('.csv') ? 'CSV' : 'JSONL'}
      </span>
      <span>{name}</span>
    </button>
  );
}
