// #ChatPanel
// The chat sidebar — pure props in, callbacks out. The host owns the message
// list and the streaming flag; the panel owns only its draft text and which
// detail panels are open. App copy (empty state, help lines) and the mic
// button arrive as props, so the panel knows nothing about engines or files.
import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { space, typography, TYPING_MS_PER_CHAR, type Theme } from '@tamedtable/ui-kit';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import type { ChatPanelMessage, ChatRequestDetail, ChatRunProgress } from './index.ts';

// Input growth bounds: three lines minimum, ten maximum (~24px line-height);
// past the maximum the textarea scrolls internally.
const INPUT_MIN_H = 68;
const INPUT_MAX_H = 240;

const CP_CSS =
  '@keyframes cp-pulse-kf { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }' +
  ' .cp-pulse { animation: cp-pulse-kf 1.2s ease-in-out infinite; }';

function UserBubble({ t, children }: { t: Theme; children: ReactNode }): ReactNode {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        data-cp-message="user"
        style={{
          maxWidth: '88%',
          background: t.accentSoft,
          color: t.ink,
          border: `1px solid ${t.line}`,
          borderRadius: space.radius,
          padding: '6px 10px',
          fontFamily: typography.ui,
          fontSize: typography.size.base,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Render the request-detail panel's full text — also what the copy icon
 *  puts on the clipboard. */
function debugDetailText(debug: ChatRequestDetail): string {
  return [
    '── request ──────────────────────────',
    debug.userRequest,
    `${debug.modelCalls.map((m) => `${m.model} ×${m.calls}`).join(', ')} · ${(debug.inputTokens + debug.outputTokens).toLocaleString('en-US')} tokens · ${(debug.elapsedMs / 1000).toFixed(1)}s`,
    '',
    '── response ─────────────────────────',
    ...debug.turns.flatMap((turn, i) => [
      `turn ${i + 1}: ${turn.outcome}`,
      JSON.stringify(turn.ops, null, 2),
    ]),
    ...(debug.cellSamples.length > 0 ? [
      '',
      '── cell samples (up to 3 per column) ──',
      ...debug.cellSamples.flatMap((s) =>
        s.samples.map((p) => `${s.column}: ${JSON.stringify(p.in)} → ${JSON.stringify(p.out)}`)
      ),
    ] : []),
  ].join('\n');
}

/** Quiet chip: a subtle bordered pill that separates the copy and Report bug
 *  actions from the plain "request detail" toggle beside them. */
function chipStyle(t: Theme): CSSProperties {
  return {
    background: t.surface,
    border: `1px solid ${t.line}`,
    borderRadius: space.radiusSm,
    padding: '2px 7px',
    cursor: 'pointer',
    color: t.ink3,
    display: 'inline-flex',
    alignItems: 'center',
  };
}

function AssistantMessage({
  t,
  message,
  onReportBug,
}: {
  t: Theme;
  message: ChatPanelMessage;
  onReportBug?: (message: ChatPanelMessage) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isError = message.text.startsWith('Error:');
  const body = isError ? message.text.replace(/^Error:\s*/, '') : message.text;
  const showReport = message.reportable === true && onReportBug !== undefined;

  const copyDetail = (): void => {
    if (!message.debug) return;
    void navigator.clipboard?.writeText(debugDetailText(message.debug)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        data-cp-message="assistant"
        data-cp-error={isError ? '' : undefined}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: space.px8,
          color: isError ? t.err : t.ink2,
          fontFamily: typography.ui,
          fontSize: typography.size.base,
          lineHeight: 1.5,
        }}
      >
        {isError ? (
          <span style={{ flex: '0 0 auto', marginTop: 2, color: t.err }}>
            <Icon name="err" />
          </span>
        ) : message.undone ? (
          // Hollow circle: the reply's step is undone — the table no longer
          // shows what this message reports.
          <span
            data-cp-undone=""
            style={{
              flex: '0 0 auto',
              marginTop: 5,
              width: 6,
              height: 6,
              borderRadius: 4,
              border: `1.5px solid ${t.ink3}`,
              boxSizing: 'content-box',
            }}
          />
        ) : (
          <span
            style={{
              flex: '0 0 auto',
              marginTop: 6,
              width: 6,
              height: 6,
              borderRadius: 3,
              background: t.ok,
            }}
          />
        )}
        <div style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</div>
      </div>

      {(message.debug || showReport) && (
        <>
          <div
            style={{
              marginTop: space.px4,
              marginLeft: space.px14,
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: space.px8,
            }}
          >
            {message.debug && (
              <>
                <button
                  type="button"
                  data-cp-detail-toggle=""
                  onClick={() => setOpen((o) => !o)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    cursor: 'pointer',
                    color: t.ink3,
                    fontFamily: typography.ui,
                    fontSize: typography.size.xs,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: space.px4,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      transition: 'transform .15s',
                      transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  >
                    <Icon name="chevron" size={12} />
                  </span>
                  request detail
                </button>
                <button
                  type="button"
                  onClick={copyDetail}
                  title={copied ? 'Copied' : 'Copy request detail'}
                  aria-label={copied ? 'Copied' : 'Copy request detail'}
                  data-testid="copy-debug"
                  style={{
                    ...chipStyle(t),
                    color: copied ? t.ok : t.ink3,
                  }}
                >
                  <Icon name="copy" size={12} />
                </button>
              </>
            )}
            {showReport && (
              <button
                type="button"
                data-cp-report=""
                onClick={() => onReportBug?.(message)}
                title="Report bug — opens a prefilled GitHub issue"
                style={{
                  ...chipStyle(t),
                  fontFamily: typography.ui,
                  fontSize: typography.size.xs,
                  gap: space.px4,
                }}
              >
                <Icon name="bug" size={12} />
                Report bug
              </button>
            )}
          </div>
          {message.debug && open && (
            <pre
              data-cp-detail=""
              style={{
                margin: `${space.px6}px 0 0 ${space.px14}px`,
                padding: '8px 10px',
                background: t.surface3,
                color: t.ink3,
                fontFamily: typography.mono,
                fontSize: typography.size.xs,
                lineHeight: 1.55,
                borderRadius: space.radiusSm,
                border: `1px solid ${t.line}`,
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: 320,
              }}
            >
              {debugDetailText(message.debug)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

/** Live progress block under the Running… line: status line, thin bar, and a
 *  collapsed "request detail" toggle expanding the run's live event log.
 *  Unmounts with the run, so the next run starts collapsed. */
function RunProgress({ t, progress }: { t: Theme; progress: ChatRunProgress }): ReactNode {
  const [open, setOpen] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  // Keep the expanded log pinned to its newest line.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [progress.log.length, open]);

  // Whole completed steps, plus the streaming step's row fraction.
  const fraction =
    progress.totalSteps === 0
      ? 0
      : Math.min(
          1,
          (Math.max(0, progress.step - 1) +
            (progress.rowsTotal > 0 ? progress.rowsDone / progress.rowsTotal : 0)) /
            progress.totalSteps,
        );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.px6, marginLeft: space.px14 }}>
      <div
        data-cp-progress=""
        style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2 }}
      >
        {progress.step === 0
          ? 'Starting…'
          : `Step ${progress.step} of ${progress.totalSteps} — ${progress.label}` +
            (progress.rowsTotal > 0 && progress.rowsDone > 0
              ? ` · ${progress.rowsDone} / ${progress.rowsTotal} rows`
              : '')}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        style={{
          height: 4,
          borderRadius: space.radiusSm,
          background: t.surface3,
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
      <button
        type="button"
        data-cp-progress-toggle=""
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          color: t.ink3,
          fontFamily: typography.ui,
          fontSize: typography.size.xs,
          display: 'inline-flex',
          alignItems: 'center',
          gap: space.px4,
          alignSelf: 'flex-start',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            transition: 'transform .15s',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          <Icon name="chevron" size={12} />
        </span>
        request detail
      </button>
      {open && (
        <pre
          ref={logRef}
          data-cp-progress-log=""
          style={{
            margin: 0,
            padding: '8px 10px',
            background: t.surface3,
            color: t.ink3,
            fontFamily: typography.mono,
            fontSize: typography.size.xs,
            lineHeight: 1.55,
            borderRadius: space.radiusSm,
            border: `1px solid ${t.line}`,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            overflowY: 'auto',
            maxHeight: 200,
          }}
        >
          {progress.log.join('\n')}
        </pre>
      )}
    </div>
  );
}

export interface ChatPanelProps {
  messages: ChatPanelMessage[];
  /** True while a request runs — shows Running…, swaps send for stop. */
  streaming: boolean;
  /** Live progress of the streaming run, or null — rendered as a block under
   *  the Running… line (status line, thin bar, live request-detail log). */
  progress?: ChatRunProgress | null;
  /** Committed-transformation count for the header readout. */
  requestCount: number;
  /** Non-null text syncs into the draft (tutorial prefill-chat steps). */
  prefill?: string | null;
  /** Non-null disables the input row: the textarea and send grey out, the
   *  draft clears, this text shows as the placeholder, and the `micButton`
   *  slot is hidden — the host's "input is off, here is why" state. */
  disabledHint?: string | null;
  onSend: (text: string) => void;
  onCancel: () => void;
  /** Fired by the Report bug action on a `reportable` message. When omitted,
   *  the action is never rendered. */
  onReportBug?: (message: ChatPanelMessage) => void;
  /** DOM id for the textarea (e.g. for Driver.js highlights). */
  inputId?: string;
  /** Rendered when there are no messages — app copy. */
  emptyState?: ReactNode;
  /** Lines for the header's `?` popover — app copy. */
  helpLines?: string[];
  /** The host's mic button (or null when voice is unavailable). */
  micButton?: ReactNode;
  /** Fill the parent (width + height 100%) instead of the fixed 360px sidebar
   *  width — used when the panel rises as a mobile bottom sheet. */
  fill?: boolean;
  /** Sidebar width in px (ignored under `fill`). The host owns resizing —
   *  the app's drag handle feeds this. Default 360. */
  width?: number;
}

export function ChatPanel({
  messages,
  streaming,
  progress = null,
  requestCount,
  prefill = null,
  disabledHint = null,
  onSend,
  onCancel,
  onReportBug,
  inputId,
  emptyState,
  helpLines = [],
  micButton,
  fill = false,
  width = 360,
}: ChatPanelProps): ReactNode {
  const t = useTheme();
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // The textarea grows with the draft — three lines minimum, ten lines
  // maximum, then it scrolls internally. Height is measured, not counted:
  // wrapped lines grow it too.
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(INPUT_MIN_H, Math.min(INPUT_MAX_H, el.scrollHeight))}px`;
    el.style.overflowY = el.scrollHeight > INPUT_MAX_H ? 'auto' : 'hidden';
  }, [draft]);

  // When a prefill arrives (a tutorial prefill-chat step is highlighted), type
  // it into the draft at the shared TYPING_MS_PER_CHAR cadence so the learner
  // watches the query appear, the way a person would type it. An empty prefill
  // clears the box at once.
  //
  // Re-entrancy guard: Driver.js re-highlights the step on refresh() (window
  // resize, scroll recalculation), re-firing this effect with the same prefill —
  // without the `typed` guard the animation would restart or double-type.
  const typing = useRef<{ typed: string | null; timer: ReturnType<typeof setInterval> | null }>({
    typed: null,
    timer: null,
  });
  useEffect(() => {
    if (prefill === null) return;
    const guard = typing.current;
    if (prefill === guard.typed) return; // same value re-fired — ignore
    guard.typed = prefill;
    if (guard.timer) { clearInterval(guard.timer); guard.timer = null; }
    if (prefill === '') { setDraft(''); return; }
    let i = 0;
    setDraft('');
    guard.timer = setInterval(() => {
      i += 1;
      setDraft(prefill.slice(0, i));
      if (i >= prefill.length && guard.timer) { clearInterval(guard.timer); guard.timer = null; }
    }, TYPING_MS_PER_CHAR);
    return () => { if (guard.timer) { clearInterval(guard.timer); guard.timer = null; } };
  }, [prefill]);

  // Entering the disabled state drops whatever was typed — the hint placeholder
  // must show, and a stale draft would send the moment the row re-enables.
  const disabled = disabledHint !== null;
  useEffect(() => {
    if (disabled) setDraft('');
  }, [disabled]);

  const send = (): void => {
    const text = draft.trim();
    if (!text || streaming || disabled) return;
    setDraft('');
    onSend(text);
  };

  const hasDraft = draft.trim() !== '' && !disabled;

  const sendBtn: CSSProperties = {
    height: 30,
    width: 30,
    flex: '0 0 auto',
    borderRadius: space.radiusSm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  return (
    <aside
      style={{
        width: fill ? '100%' : width,
        height: fill ? '100%' : undefined,
        flex: fill ? '1 1 auto' : '0 0 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: t.surface2,
        borderRight: fill ? 'none' : `1px solid ${t.line}`,
      }}
    >
      <style>{CP_CSS}</style>
      {/* header */}
      <div
        style={{
          height: space.headerH,
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${space.px12}px`,
          borderBottom: `1px solid ${t.line}`,
          fontFamily: typography.ui,
          fontSize: typography.size.xs,
          fontWeight: 600,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: t.ink3,
        }}
      >
        Requests
        <span style={{ flex: 1 }} />
        {requestCount > 0 && (
          <span
            style={{
              fontFamily: typography.mono,
              fontSize: typography.size.xs,
              fontWeight: 400,
              letterSpacing: 0,
              textTransform: 'none',
              color: t.ink3,
            }}
          >
            {requestCount} transformation{requestCount === 1 ? '' : 's'}
            {streaming && <> · running</>}
          </span>
        )}
        {helpLines.length > 0 && (
          <span style={{ position: 'relative', marginLeft: space.px6 }}>
            <button
              type="button"
              onMouseEnter={() => setHelpOpen(true)}
              onMouseLeave={() => setHelpOpen(false)}
              onClick={() => setHelpOpen((o) => !o)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: t.ink3,
                fontFamily: typography.ui,
                fontSize: typography.size.xs,
                fontWeight: 600,
                padding: '2px 4px',
                lineHeight: 1,
                textTransform: 'none',
                letterSpacing: 0,
                borderRadius: space.radiusSm,
              }}
            >
              ?
            </button>
            {helpOpen && (
              <ul
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  margin: 0,
                  marginTop: 4,
                  listStyle: 'none',
                  background: t.surface,
                  border: `1px solid ${t.line}`,
                  borderRadius: space.radius,
                  padding: '8px 10px',
                  boxShadow: t.shadow,
                  whiteSpace: 'nowrap',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  textTransform: 'none',
                  letterSpacing: 0,
                  fontWeight: 400,
                }}
              >
                {helpLines.map((line) => (
                  <li
                    key={line}
                    style={{
                      fontFamily: typography.ui,
                      fontSize: typography.size.xs,
                      color: t.ink2,
                      lineHeight: 1.5,
                    }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </span>
        )}
      </div>

      {/* messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: space.px14,
          display: 'flex',
          flexDirection: 'column',
          gap: space.px12,
        }}
      >
        {messages.length === 0 && emptyState}
        {messages.map((m) =>
          m.role === 'user' ? (
            <UserBubble key={m.id} t={t}>
              {m.text}
            </UserBubble>
          ) : (
            <AssistantMessage key={m.id} t={t} message={m} onReportBug={onReportBug} />
          ),
        )}
        {streaming && (
          <>
            <div
              data-cp-running=""
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: space.px8,
                color: t.ink2,
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
              }}
            >
              <span
                className="cp-pulse"
                style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }}
              />
              Running…
            </div>
            {progress && <RunProgress t={t} progress={progress} />}
          </>
        )}
      </div>

      {/* input */}
      <div
        style={{
          flex: '0 0 auto',
          borderTop: `1px solid ${t.line}`,
          padding: space.px10,
        }}
      >
        {/* Full-width textarea over an actions row: the draft grows the box
            (three lines min, ten max, then internal scroll — so the
            scrollbar sits at the right edge, never between text and
            buttons), and the mic/voice/send controls keep a fixed row
            underneath, the shape every mainstream chat composer uses. */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${focused ? t.accent : t.line2}`,
            boxShadow: focused ? `0 0 0 3px ${t.ring}` : 'none',
            borderRadius: space.radius,
            padding: '8px 10px 6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: space.px6,
            transition: 'border-color .12s, box-shadow .12s',
          }}
        >
          <textarea
            id={inputId}
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={disabledHint ?? 'Describe a transformation…'}
            disabled={disabled}
            rows={3}
            style={{
              width: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: typography.ui,
              fontSize: typography.size.base,
              lineHeight: 1.5,
              color: disabled ? t.ink3 : t.ink,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: space.px8 }}>
          {disabled ? null : micButton}
          {streaming ? (
            <button
              type="button"
              data-cp-stop=""
              onClick={onCancel}
              title="Stop the running request"
              style={{
                ...sendBtn,
                border: `1px solid ${t.err}`,
                background: 'transparent',
                color: t.err,
              }}
            >
              <Icon name="stop" />
            </button>
          ) : (
            <button
              type="button"
              data-cp-send=""
              onClick={send}
              disabled={!hasDraft}
              title="Send (Enter)"
              style={{
                ...sendBtn,
                border: 'none',
                background: hasDraft ? t.accent : t.surface3,
                color: hasDraft ? t.inkOnAcc : t.ink3,
                cursor: hasDraft ? 'pointer' : 'default',
              }}
            >
              <Icon name="send" />
            </button>
          )}
          </div>
        </div>
        <div
          style={{
            marginTop: space.px6,
            fontFamily: typography.ui,
            fontSize: typography.size.micro,
            color: t.ink4,
            letterSpacing: 0.3,
          }}
        >
          ↵ to send · ⇧↵ for newline
        </div>
      </div>
    </aside>
  );
}
