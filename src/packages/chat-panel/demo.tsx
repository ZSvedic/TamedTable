// #ChatPanel demo logic — mounts the real ChatPanel over plain React state.
// Sending echoes an assistant reply; buttons inject canned replies, toggle
// streaming, and prefill the draft; the demo MicButton cycles
// recording → sending → idle. Every callback appends to the #out event log;
// #out is non-empty on load (the demo smoke test's ready signal).
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { typography } from '@tamedtable/ui-kit';
import { Button, ThemeProvider, useTheme } from '@tamedtable/ui-kit/components';
import type { ChatPanelMessage, ChatRequestDetail, ChatRunProgress, VoiceButtonStatus } from './index.ts';
import { ChatPanel, MicButton } from './components.tsx';

const SAMPLE_PROGRESS: ChatRunProgress = {
  step: 2,
  totalSteps: 5,
  label: 'mutate Country (AI)',
  rowsDone: 300,
  rowsTotal: 424,
  log: [
    'step 1/5 — filter (js) · 424 rows',
    "  pred: row.FED === 'CRO'",
    'step 2/5 — mutate Country (AI) · 424 rows',
    '  value: Normalize this country name to its English short form…',
    'Country · row 299: "USA" → "United States"',
    'Country · row 300: "UK" → "United Kingdom"',
  ],
};

const SAMPLE_DETAIL: ChatRequestDetail = {
  userRequest: 'normalize the phone column',
  modelCalls: [{ model: 'claude-sonnet-4-6', calls: 2 }],
  inputTokens: 1843,
  outputTokens: 412,
  elapsedMs: 5300,
  turns: [
    { outcome: 'committed', ops: [{ op: 'add', path: '/transformations/-', value: { kind: 'mutate' } }] },
  ],
  cellSamples: [
    { column: 'phone', samples: [{ in: '555 0199', out: '+1-555-0199' }] },
  ],
};

const HELP_LINES = [
  'Double-click a cell to edit it',
  'Type :undo or :redo in the chat',
];

function Demo(): ReactNode {
  const t = useTheme();
  const [messages, setMessages] = useState<ChatPanelMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [disabledHint, setDisabledHint] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceButtonStatus>('idle');
  const [seq, setSeq] = useState(0);
  const [log, setLog] = useState<string[]>(['ready']);

  const report = (event: string): void => setLog((l) => [...l, event]);

  const append = (...items: Array<Omit<ChatPanelMessage, 'id'>>): void => {
    setMessages((list) => [...list, ...items.map((m, i) => ({ ...m, id: seq + i }))]);
    setSeq((n) => n + items.length);
  };

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <ChatPanel
        inputId="demo-chat-input"
        messages={messages}
        streaming={streaming}
        progress={streaming ? SAMPLE_PROGRESS : null}
        requestCount={messages.filter((m) => m.role === 'user').length}
        prefill={prefill}
        disabledHint={disabledHint}
        onSend={(text) => {
          report(`send ${text}`);
          append(
            { role: 'user', text },
            { role: 'assistant', text: `Did: ${text}` },
          );
        }}
        onCancel={() => {
          report('cancel');
          setStreaming(false);
        }}
        onReportBug={(m) => report(`report bug #${m.id}`)}
        emptyState={
          <p style={{ margin: 0, color: t.ink3, fontFamily: typography.ui, fontSize: 13 }}>
            No messages yet — send one below, or use the buttons on the right.
          </p>
        }
        helpLines={HELP_LINES}
        micButton={
          <MicButton
            status={voiceStatus}
            onStart={() => {
              report('voice start');
              setVoiceStatus('recording');
            }}
            onLatch={() => {
              report('voice latch');
              setVoiceStatus('latched');
            }}
            onStop={() => {
              report('voice stop');
              setVoiceStatus('sending');
              setTimeout(() => setVoiceStatus('idle'), 800);
            }}
            onCancel={() => {
              report('voice cancel');
              setVoiceStatus('idle');
            }}
          />
        }
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12 }}>
          <Button variant="chrome" onClick={() => append({ role: 'assistant', text: 'Error: Something broke while applying the change.' })}>
            Add error reply
          </Button>
          <Button variant="chrome" onClick={() => append({ role: 'assistant', text: 'Error: Something unexpected broke — this looks like a bug.', reportable: true })}>
            Add app-error reply
          </Button>
          <Button variant="chrome" onClick={() => append({ role: 'assistant', text: 'Normalized 12 phone numbers.', debug: SAMPLE_DETAIL, reportable: true })}>
            Add reply with detail
          </Button>
          <Button variant="chrome" onClick={() => append({ role: 'assistant', text: 'Undone steps:\n1. filter (js)', undone: true })}>
            Add undone reply
          </Button>
          <Button variant="chrome" onClick={() => setStreaming((v) => !v)}>
            Toggle streaming
          </Button>
          <Button variant="chrome" onClick={() => setPrefill('Keep rows where age >= 18')}>
            Prefill draft
          </Button>
          <Button variant="chrome" onClick={() => setDisabledHint((v) => (v ? null : 'Replay mode: undo/redo only'))}>
            Toggle replay lock
          </Button>
        </div>
        <pre
          id="out"
          style={{
            flex: 1,
            overflow: 'auto',
            margin: 12,
            marginTop: 0,
            padding: '.5rem .75rem',
            font: `11px/1.5 ${typography.mono}`,
            background: t.surface2,
            color: t.ink2,
            border: `1px solid ${t.line}`,
            borderRadius: 6,
          }}
        >
          {log.join('\n')}
        </pre>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Demo />
  </ThemeProvider>,
);
