// #ChatPanel
// The chat sidebar — pure props in, callbacks out. The host owns the message
// list and the streaming flag; the panel owns only its draft text and which
// detail panels are open. App copy (empty state, help lines) and the mic
// button arrive as props, so the panel knows nothing about engines or files.
import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import type { ChatPanelMessage, ChatRequestDetail } from './index.ts';

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

function AssistantMessage({ t, message }: { t: Theme; message: ChatPanelMessage }): ReactNode {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isError = message.text.startsWith('Error:');
  const body = isError ? message.text.replace(/^Error:\s*/, '') : message.text;

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

      {message.debug && (
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
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                color: copied ? t.ok : t.ink3,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Icon name="copy" size={12} />
            </button>
          </div>
          {open && (
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

export interface ChatPanelProps {
  messages: ChatPanelMessage[];
  /** True while a request runs — shows Running…, swaps send for stop. */
  streaming: boolean;
  /** Committed-transformation count for the header readout. */
  requestCount: number;
  /** Non-null text syncs into the draft (tutorial prefill-chat steps). */
  prefill?: string | null;
  onSend: (text: string) => void;
  onCancel: () => void;
  /** DOM id for the textarea (e.g. for Driver.js highlights). */
  inputId?: string;
  /** Rendered when there are no messages — app copy. */
  emptyState?: ReactNode;
  /** Lines for the header's `?` popover — app copy. */
  helpLines?: string[];
  /** The host's mic button (or null when voice is unavailable). */
  micButton?: ReactNode;
}

export function ChatPanel({
  messages,
  streaming,
  requestCount,
  prefill = null,
  onSend,
  onCancel,
  inputId,
  emptyState,
  helpLines = [],
  micButton,
}: ChatPanelProps): ReactNode {
  const t = useTheme();
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // When a prefill arrives (tutorial prefill-chat step), sync it into the draft.
  useEffect(() => {
    if (prefill !== null) {
      setDraft(prefill);
    }
  }, [prefill]);

  const send = (): void => {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft('');
    onSend(text);
  };

  const hasDraft = draft.trim() !== '';

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
        width: 360,
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        background: t.surface2,
        borderRight: `1px solid ${t.line}`,
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
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: t.surface,
                  border: `1px solid ${t.line}`,
                  borderRadius: space.radius,
                  padding: '8px 10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
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
                  <span
                    key={line}
                    style={{
                      fontFamily: typography.ui,
                      fontSize: typography.size.xs,
                      color: t.ink2,
                      lineHeight: 1.5,
                    }}
                  >
                    {line}
                  </span>
                ))}
              </div>
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
            <AssistantMessage key={m.id} t={t} message={m} />
          ),
        )}
        {streaming && (
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
        <div
          style={{
            background: t.surface,
            border: `1px solid ${focused ? t.accent : t.line2}`,
            boxShadow: focused ? `0 0 0 3px ${t.ring}` : 'none',
            borderRadius: space.radius,
            padding: '8px 8px 6px 10px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: space.px8,
            transition: 'border-color .12s, box-shadow .12s',
          }}
        >
          <textarea
            id={inputId}
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
            placeholder="Describe a transformation…"
            rows={3}
            style={{
              flex: 1,
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: typography.ui,
              fontSize: typography.size.base,
              lineHeight: 1.5,
              color: t.ink,
            }}
          />
          {micButton}
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
