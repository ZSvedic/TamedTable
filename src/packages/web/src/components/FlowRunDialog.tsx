// #OpenFlow
// The flow-run progress dialog — modal while an opened .flow replays. Shows
// step/row progress over a bar, an expandable event log (collapsed by
// default), and a Cancel that aborts the replay leaving the table untouched.
// No backdrop-click close: the only ways out are completion or Cancel.
import { useEffect, useRef, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

export function FlowRunDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const run = controller.flowRun;
  const logRef = useRef<HTMLPreElement>(null);

  // Keep the expanded log pinned to its newest line.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run?.log.length]);

  // Unmounting on run end means the next run's <details> starts collapsed.
  if (!run) return null;

  // Whole completed steps, plus the streaming step's row fraction.
  const fraction =
    run.totalSteps === 0
      ? 1
      : Math.min(1, (Math.max(0, run.step - 1) + (run.rowsTotal > 0 ? run.rowsDone / run.rowsTotal : 0)) / run.totalSteps);

  return (
    <div
      data-flow-run-dialog=""
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
            padding: `${space.px12}px ${space.px16}px`,
            borderBottom: `1px solid ${t.line}`,
            fontFamily: typography.ui,
            fontSize: typography.size.md,
            fontWeight: 600,
            color: t.ink,
          }}
        >
          Running {run.name}
        </div>

        {/* body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: space.px16,
            display: 'flex',
            flexDirection: 'column',
            gap: space.px12,
          }}
        >
          <div
            data-flow-run-status=""
            style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink }}
          >
            {run.step === 0
              ? 'Starting…'
              : `Step ${run.step} of ${run.totalSteps} — ${run.kind}` +
                (run.rowsTotal > 0 && run.rowsDone > 0 ? ` · ${run.rowsDone} / ${run.rowsTotal} rows` : '')}
          </div>

          {/* progress bar */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fraction * 100)}
            style={{
              height: 8,
              borderRadius: space.radius,
              background: t.surface2,
              border: `1px solid ${t.line2}`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${fraction * 100}%`,
                height: '100%',
                background: t.accent,
                transition: 'width 120ms ease',
              }}
            />
          </div>

          {/* expandable log — collapsed by default */}
          <details data-flow-run-log="">
            <summary
              style={{
                cursor: 'pointer',
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                color: t.ink3,
                userSelect: 'none',
              }}
            >
              Log ({run.log.length} {run.log.length === 1 ? 'line' : 'lines'})
            </summary>
            <pre
              ref={logRef}
              style={{
                margin: `${space.px8}px 0 0`,
                padding: space.px8,
                maxHeight: 200,
                overflowY: 'auto',
                background: t.surface2,
                border: `1px solid ${t.line2}`,
                borderRadius: space.radius,
                fontFamily: typography.mono,
                fontSize: typography.size.xs,
                lineHeight: 1.5,
                color: t.ink2,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {run.log.join('\n')}
            </pre>
          </details>
        </div>

        {/* footer */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: space.px14,
            borderTop: `1px solid ${t.line}`,
          }}
        >
          <Button variant="danger" onClick={() => controller.cancelFlowRun()}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
