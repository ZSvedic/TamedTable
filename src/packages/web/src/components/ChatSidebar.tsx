import { useState, type CSSProperties, type ReactNode } from 'react';
import { theme } from '../theme.ts';
import type { ChatMessage, WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { Button } from './Button.tsx';

function MessageBubble({ message }: { message: ChatMessage }): ReactNode {
  const isUser = message.role === 'user';
  const bubble: CSSProperties = {
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    padding: `${theme.space.sm} ${theme.space.md}`,
    borderRadius: theme.radius.md,
    background: isUser ? theme.color.accent : theme.color.surfaceAlt,
    color: isUser ? theme.color.accentText : theme.color.text,
    fontSize: theme.font.size.md,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
  return (
    <div style={bubble}>
      {message.text}
      {message.debug && (
        <details style={{ marginTop: theme.space.xs }}>
          <summary style={{ cursor: 'pointer', color: theme.color.textDim, fontSize: theme.font.size.xs }}>
            request detail
          </summary>
          <pre
            style={{
              margin: `${theme.space.xs} 0 0`,
              fontFamily: theme.font.mono,
              fontSize: theme.font.size.xs,
              color: theme.color.textDim,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.debug.turns
              .map((t, i) => `turn ${i + 1}: ${t.outcome}`)
              .join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
}

export function ChatSidebar({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const [draft, setDraft] = useState('');

  const send = (): void => {
    const text = draft.trim();
    if (!text || controller.streaming) return;
    setDraft('');
    void controller.sendChat(text);
  };

  return (
    <aside
      style={{
        width: theme.layout.sidebarWidth,
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        background: theme.color.surface,
        borderRight: `1px solid ${theme.color.border}`,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.space.md,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.space.sm,
        }}
      >
        {controller.messages.length === 0 && (
          <p style={{ color: theme.color.textDim, fontSize: theme.font.size.md, margin: 0 }}>
            Open a file, then describe a change — e.g. "normalize phone numbers" or
            "drop duplicate emails". Requests are additive; use Undo to revert.
          </p>
        )}
        {controller.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {controller.streaming && (
          <div style={{ color: theme.color.textDim, fontSize: theme.font.size.sm }}>Running…</div>
        )}
      </div>
      <div
        style={{
          flex: '0 0 auto',
          borderTop: `1px solid ${theme.color.border}`,
          padding: theme.space.md,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.space.sm,
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Describe a transformation…"
          rows={3}
          style={{
            resize: 'none',
            fontFamily: theme.font.sans,
            fontSize: theme.font.size.md,
            padding: theme.space.sm,
            borderRadius: theme.radius.sm,
            border: `1px solid ${theme.color.border}`,
            background: theme.color.bg,
            color: theme.color.text,
          }}
        />
        <div style={{ display: 'flex', gap: theme.space.sm }}>
          {controller.streaming ? (
            <Button variant="danger" onClick={() => controller.cancelRequest()}>
              Cancel
            </Button>
          ) : (
            <Button variant="primary" onClick={send} disabled={draft.trim() === ''}>
              Send
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
