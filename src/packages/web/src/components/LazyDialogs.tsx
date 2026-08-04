// #LazyExec
// The two lazy-execution dialogs (spec/behavior.md § Lazy AI execution,
// mockup spec/mockups/lazy-ai.html):
//  - LargeFileDialog — one sentence, two one-click choices, Load shuffled
//    primary. Raised by any UI load of a file bigger than one page.
//  - RunAllDialog — the shared run-on-all / save / dependency confirmation:
//    rows remaining, estimated tokens, cost, and time; confirming swaps the
//    body for a progress bar with Cancel and a collapsed Show log expander
//    (the chat request-detail event feed). On the phone both render as
//    bottom sheets, like every other phone dialog.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button } from '@tamedtable/ui-kit/components';
import type { WebController, RunAllReason } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';

/** Compact token count: 950, 12.4k, 1.9M. */
export function formatTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Compact duration: ~40 s, ~4 min, ~2 h. */
export function formatSeconds(s: number): string {
  if (s < 90) return `~${Math.max(1, Math.round(s))} s`;
  if (s < 5400) return `~${Math.round(s / 60)} min`;
  return `~${(s / 3600).toFixed(1)} h`;
}

/** Cost with enough precision to never show $0.00 for a non-zero estimate. */
export function formatUsd(usd: number): string {
  if (usd >= 0.1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.001) return `$${usd.toFixed(3)}`;
  return usd > 0 ? '<$0.001' : '$0.00';
}

const CONFIRM_LABELS: Record<RunAllReason, { title: string; note: string; confirm: string; decline: string; partial?: string }> = {
  'run-all': {
    title: 'Run on all rows?',
    note: '',
    confirm: 'Run all',
    decline: 'Not yet',
  },
  save: {
    title: 'Run on all rows?',
    note: 'A saved file always contains fully evaluated rows.',
    confirm: 'Run all & save',
    decline: 'Not yet',
  },
  dependency: {
    title: 'Run on all rows?',
    note: 'This step reads an AI column across every row, so all rows must be evaluated first. Declining leaves the step out.',
    confirm: 'Run all & apply',
    decline: 'Leave it out',
  },
  sort: {
    title: 'Run on all rows?',
    note: 'Sorting by an AI column needs every row evaluated first — or sort what is already computed, free (unevaluated rows sink to the end).',
    confirm: 'Run all & sort',
    decline: "Don't sort",
    partial: 'Sort evaluated rows',
  },
  filter: {
    title: 'Run on all rows?',
    note: 'Filtering by an AI column needs every row evaluated first — or filter what is already computed, free (unevaluated rows stay hidden).',
    confirm: 'Run all & filter',
    decline: "Don't filter",
    partial: 'Filter evaluated rows',
  },
};

function Overlay({ isMobile, children, onBackdrop }: { isMobile: boolean; children: ReactNode; onBackdrop?: () => void }): ReactNode {
  const t = useTheme();
  return (
    <div
      onClick={onBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: t.overlay,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
    >
      {children}
    </div>
  );
}

function cardStyle(t: ReturnType<typeof useTheme>, isMobile: boolean): CSSProperties {
  return {
    maxWidth: isMobile ? undefined : 420,
    width: '100%',
    background: t.surface,
    border: `1px solid ${t.line2}`,
    borderRadius: isMobile ? `${space.radius}px ${space.radius}px 0 0` : space.radius,
    boxShadow: t.shadowLg,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: space.px12,
  };
}

export function LargeFileDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const dialog = controller.largeFileDialog;
  if (!dialog) return null;
  return (
    <Overlay isMobile={isMobile}>
      {/* The id is the lazy tour's spotlight target for its Load-shuffled step. */}
      <div id="tutorial-load-shuffled" data-tt-largefile-dialog="" role="dialog" onClick={(e) => e.stopPropagation()} style={cardStyle(t, isMobile)}>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.ink }}>
          {dialog.rowCount.toLocaleString()} rows — sample it?
        </div>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2, lineHeight: 1.5 }}>
          Work page by page; saving preserves original row order.
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: space.px8 }}>
          <Button variant="chrome" data-tt-load-original="" onClick={() => void controller.loadOriginalOrder()}>
            Load in original order
          </Button>
          <Button variant="primary" data-tt-load-shuffled="" onClick={() => void controller.loadShuffled()}>
            🔀 Load shuffled
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

// #LazyExec — the save confirmation. The work that had to happen first —
// running rows, or the model call that writes the Python script — consumed the
// original click's user gesture, and browsers refuse a save picker outside
// one — so the picker opens from this dialog's fresh click instead of
// throwing "Must be handling a user gesture".
const SAVE_READY_COPY = {
  rows: { title: 'All rows evaluated', body: 'The table is fully evaluated and ready to write.' },
  python: { title: 'Python script ready', body: 'The flow is translated to Python and ready to write.' },
} as const;

export function SaveReadyDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const kind = controller.saveReadyDialog;
  if (!kind) return null;
  const copy = SAVE_READY_COPY[kind];
  return (
    <Overlay isMobile={isMobile}>
      <div data-tt-saveready-dialog="" role="dialog" onClick={(e) => e.stopPropagation()} style={cardStyle(t, isMobile)}>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.ink }}>
          {copy.title}
        </div>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2, lineHeight: 1.5 }}>
          {copy.body}
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: space.px8 }}>
          <Button variant="chrome" data-tt-saveready-cancel="" onClick={() => controller.dismissSaveReady()}>
            Not now
          </Button>
          <Button variant="primary" data-tt-saveready-confirm="" onClick={() => void controller.confirmSaveReady()}>
            Save file…
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

export function RunAllDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const [showLog, setShowLog] = useState(false);
  const confirm = controller.runAllDialog;
  const running = controller.lazy.runAllActive() ? controller.runProgress : null;
  if (!confirm && !running) return null;

  const label: CSSProperties = { fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2 };
  const value: CSSProperties = { fontFamily: typography.mono, fontSize: typography.size.sm, color: t.ink, textAlign: 'right' };

  return (
    <Overlay isMobile={isMobile}>
      {/* The id is the lazy tour's spotlight target for its estimate finale. */}
      <div id="tutorial-runall-dialog" data-tt-runall-dialog="" role="dialog" onClick={(e) => e.stopPropagation()} style={cardStyle(t, isMobile)}>
        {confirm ? (
          <>
            <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.ink }}>
              {CONFIRM_LABELS[confirm.reason].title}
            </div>
            {CONFIRM_LABELS[confirm.reason].note && (
              <div style={{ ...label, lineHeight: 1.5 }}>{CONFIRM_LABELS[confirm.reason].note}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: space.px6, columnGap: space.px16 }}>
              <span style={label}>Rows remaining</span>
              <span style={value} data-tt-est-rows="">{confirm.estimate.rowsRemaining.toLocaleString()}</span>
              <span style={label}>Estimated tokens</span>
              <span style={value}>{formatTokens(confirm.estimate.estTokens)}</span>
              <span style={label}>Estimated cost</span>
              <span style={{ ...value, fontWeight: 700 }}>{formatUsd(confirm.estimate.estUsd)}</span>
              <span style={label}>Estimated time</span>
              <span style={value}>{formatSeconds(confirm.estimate.estSeconds)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: space.px8, borderTop: `1px solid ${t.line}`, paddingTop: space.px12 }}>
              {/* chrome, not ghost: next to two more buttons a borderless
                  decline reads as a label. */}
              <Button variant="chrome" data-tt-runall-decline="" onClick={() => controller.declineRunAll()}>
                {CONFIRM_LABELS[confirm.reason].decline}
              </Button>
              {CONFIRM_LABELS[confirm.reason].partial && (
                <Button variant="chrome" data-tt-runall-partial="" onClick={() => controller.applyEvaluatedOnly()}>
                  {CONFIRM_LABELS[confirm.reason].partial}
                </Button>
              )}
              <Button variant="primary" data-tt-runall-confirm="" onClick={() => controller.confirmRunAll()}>
                {CONFIRM_LABELS[confirm.reason].confirm}
              </Button>
            </div>
          </>
        ) : running ? (
          <>
            <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.ink }}>
              Running on all rows…
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: t.line,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${running.rowsTotal > 0 ? Math.min(100, (running.rowsDone / running.rowsTotal) * 100) : 0}%`,
                  background: t.accent,
                  transition: 'width .2s',
                }}
              />
            </div>
            <div style={{ ...label, fontVariantNumeric: 'tabular-nums' }} data-tt-runall-progress="">
              {running.rowsDone.toLocaleString()} / {running.rowsTotal.toLocaleString()} rows done
            </div>
            <button
              type="button"
              data-tt-runall-log-toggle=""
              onClick={() => setShowLog((v) => !v)}
              style={{
                border: 'none',
                background: 'transparent',
                color: t.ink3,
                textAlign: 'left',
                padding: 0,
                cursor: 'pointer',
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
              }}
            >
              {showLog ? '▾ Hide log' : '▸ Show log'}
            </button>
            {showLog && (
              <pre
                data-tt-runall-log=""
                style={{
                  margin: 0,
                  maxHeight: 160,
                  overflow: 'auto',
                  padding: space.px8,
                  background: t.surface2,
                  border: `1px solid ${t.line}`,
                  borderRadius: space.radiusSm,
                  font: `11px/1.5 ${typography.mono}`,
                  color: t.ink2,
                }}
              >
                {running.log.slice(-100).join('\n')}
              </pre>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="chrome" data-tt-runall-cancel="" onClick={() => controller.cancelRunAll()}>
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Overlay>
  );
}
