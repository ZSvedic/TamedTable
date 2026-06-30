# Chat panel

The `@tamedtable/chat-panel` package owns the chat sidebar's look and feel:
the message list (user bubbles, assistant replies, expandable request
detail), the input row with its send/stop button, and the hold-or-tap
`MicButton`. It owns no conversation state and no engine wiring — the host
holds the messages and hears about every action through callbacks. Turning
engine errors into user-facing copy (`userFacingMessage`) stays in the app:
that mapping knows runner strings, not UI.

## Worked example

The web app's wrapper binds `WebController`:

```
<ChatPanel
  inputId="tutorial-chat-input"
  messages={controller.messages} streaming={controller.streaming}
  requestCount={controller.history().length}
  prefill={controller.tutorialPrefill}
  onSend={(text) => controller.sendChat(text)}
  onCancel={() => controller.cancelRequest()}
  emptyState={<p>Load a table to begin…</p>}
  helpLines={['Double-click a cell to edit it', …]}
  micButton={voiceAvailable && <MicButton status={…} onStart={…} onStop={…} onCancel={…} />}
/>
```

## Message types (main entry, React-free)

`ChatPanelMessage` is `{ id, role: "user" | "assistant", text, debug? }`.
`debug`, when present, is a `ChatRequestDetail` — a structural subset of the
engine's `RequestDebugInfo` (request text, model calls, token counts, elapsed
time, per-turn ops, cell samples), so the app's debug objects fit without a
headless dependency.

## ChatPanel component (`./components` entry, react peer dependency)

- Header: "Requests", the transformation count (`requestCount`, with
  "· running" while streaming), and a `?` popover listing `helpLines`.
- Message list: user messages as accent bubbles; assistant messages with an
  ok dot, or an error icon and error tint when the text starts with
  `Error:` (the prefix is stripped for display). With no messages, the
  host's `emptyState` renders instead. While streaming, a pulsing
  "Running…" line follows the list.
- Request detail: an assistant message with `debug` gets a collapsed
  "request detail" toggle and a copy button; expanded, it shows the request,
  model/token/elapsed summary, per-turn ops, and cell samples — the same
  text the copy button puts on the clipboard.
- Input row: a textarea (Enter sends, Shift+Enter for a newline; send is
  disabled on an empty draft), the host's `micButton` slot, and send — or a
  stop button that fires `onCancel` while streaming. A non-null `prefill`
  syncs into the draft (tutorial prefill-chat steps).

Stable attributes: `data-cp-message="user|assistant"`, `data-cp-error`,
`data-cp-detail-toggle`, `data-cp-detail`, `data-cp-send`, `data-cp-stop`,
plus the app's existing `data-testid="mic-button"` / `"copy-debug"`.

## MicButton component

`MicButton({ status, onStart, onLatch, onStop, onCancel, size? })` supports the
two recording gestures voice chat apps use, so holders and tappers both work:

- **Press and hold** — pointer-down fires `onStart` (red fill + pulsing ring);
  releasing *after* the hold threshold fires `onStop` (push-to-talk send).
- **Quick tap** — a pointer-down/up shorter than the threshold fires `onLatch`
  instead. The button swaps to two explicit controls — cancel (`✕`,
  `data-testid="mic-cancel"`) firing `onCancel`, and send (`✓`,
  `data-testid="mic-send"`) firing `onStop` — beside a pulsing dot, so a quick
  click latches recording hands-free rather than sending an empty clip.

Escape or pointer-cancel fires `onCancel` in either mode. While `status` is
`sending` the button shows a spinner and ignores presses; `latched` shows the
cancel/send controls. Whether the button appears at all is the host's call (the
app hides it when the selected model takes no audio). Ring and spinner
animations ship inside the component.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/chat-panel/`)
mounts ChatPanel over plain React state: sending appends the user message
and an echoed assistant reply, buttons inject an error reply and a reply
with request detail, a streaming toggle drives the Running…/stop state, a
prefill button exercises the draft sync, and the demo MicButton cycles
recording → sending → idle. Every callback appends to the `#out` event log,
non-empty on load — the demo smoke test's ready signal.
