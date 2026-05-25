import { useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from '../theme.ts';
import type { ChatMessage, WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { useTheme } from '../useTheme.tsx';
import type { Theme } from '../theme.ts';
import { Icon } from './Icons.tsx';

function UserBubble({ t, children }: { t: Theme; children: ReactNode }): ReactNode {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
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

function AssistantMessage({ t, message }: { t: Theme; message: ChatMessage }): ReactNode {
  const [open, setOpen] = useState(false);
  const isError = message.text.startsWith('Error:');
  const body = isError ? message.text.replace(/^Error:\s*/, '') : message.text;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
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
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              marginTop: space.px4,
              marginLeft: space.px14,
              alignSelf: 'flex-start',
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
          {open && (
            <pre
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
                overflow: 'hidden',
              }}
            >
              {message.debug.turns.map((turn, i) => `turn ${i + 1}: ${turn.outcome}`).join('\n')}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

export function ChatSidebar({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  const send = (): void => {
    const text = draft.trim();
    if (!text || controller.streaming) return;
    setDraft('');
    void controller.sendChat(text);
  };

  const count = controller.history().length;
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
        {count > 0 && (
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
            {count} transformation{count === 1 ? '' : 's'}
            {controller.streaming && <> · running</>}
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
        {controller.messages.length === 0 && (
          <p
            style={{
              margin: 0,
              color: t.ink3,
              fontFamily: typography.ui,
              fontSize: typography.size.sm,
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: t.ink2, fontWeight: 500, fontSize: typography.size.base }}>
              Load a table to begin.
            </span>
            <br />
            Open a local file, paste a URL, or pick a sample with{' '}
            <em style={{ color: t.ink2, fontStyle: 'normal' }}>Open URL or sample…</em> — then
            describe a change in plain English, e.g. “normalize phone numbers” or “drop duplicate
            emails”. Requests are additive; use Undo to revert.
          </p>
        )}
        {controller.messages.map((m) =>
          m.role === 'user' ? (
            <UserBubble key={m.id} t={t}>
              {m.text}
            </UserBubble>
          ) : (
            <AssistantMessage key={m.id} t={t} message={m} />
          ),
        )}
        {controller.streaming && (
          <div
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
              className="tt-pulse"
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
          {controller.streaming ? (
            <button
              type="button"
              onClick={() => controller.cancelRequest()}
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
