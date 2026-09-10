# Chat panel

The `@tamedtable/chat-panel` package owns the chat sidebar's look and feel:
the message list (user bubbles, assistant replies, expandable request
detail), the input row with its send/stop button, and the hold-or-tap
`MicButton`. It owns no conversation state and no engine wiring, the host
holds the messages and hears about every action through callbacks. Turning
engine errors into user-facing copy (`userFacingMessage`) stays in the app:
that mapping knows runner strings, not UI.

## Worked example

The web app's wrapper binds `WebController`:

```
<ChatPanel
  inputId="tutorial-chat-input"
  messages={controller.messages} streaming={controller.streaming}
  progress={controller.runProgress}
  requestCount={controller.history().length}
  prefill={controller.tutorialPrefill}
  suggestions={controller.suggestions} suggestionsLoading={controller.suggestionsLoading}
  onPickSuggestion={(text) => controller.pickSuggestion(text)}
  onSend={(text) => controller.sendChat(text)}
  onCancel={() => controller.cancelRequest()}
  emptyState={<p>Load a table to begin…</p>}
  helpLines={['Double-click a cell to edit it', …]}
  micButton={voiceAvailable && <MicButton status={…} onStart={…} onStop={…} onCancel={…} />}
/>
```

## Message types (main entry, React-free)

`ChatPanelMessage` is `{ id, role: "user" | "assistant", text, debug?,
reportable?, undone? }`. `debug`, when present, is a `ChatRequestDetail`: a
structural subset of the engine's `RequestDebugInfo` (request text, model
calls, token counts, elapsed time, per-turn ops, cell samples), so the app's
debug objects fit without a headless dependency. `reportable: true` marks a
message the user can flag as a bug: the classification (app error vs
guidance error) is the host's job; the panel only renders the action.
`undone: true` marks an assistant reply whose step the host has undone:
the panel renders it with a hollow circle instead of the solid ok dot (the
heading swap to `Undone steps:` is the host's job; the panel renders text
as given).

`ChatRunProgress` is the live progress the host feeds while a run
streams: `{ step, totalSteps, label, rowsDone, rowsTotal, log }`,
1-based `step` (0 until the first starts), the running step's human
label, the streamed-row counts for an AI-cell step, and the newest-last
event log lines. The host owns the state and mutates it in place; the
panel just renders whatever it is passed.

## ChatPanel component (`./components` entry, react peer dependency)

- Header: "Requests", the transformation count (`requestCount`, with
  "· running" while streaming), and a `?` popover listing `helpLines`.
- Message list: user messages as accent bubbles; assistant messages with a
  `StatusDot`: a solid ok dot, or a hollow circle when the message is
  `undone`, or an error icon and error tint when the text starts with
  `Error:` (the prefix is stripped for display). `StatusDot` is exported
  from the components entry so a host shows the same applied/undone visual
  language wherever step state appears (the app's mobile History sheet uses
  it), instead of inventing a second icon logic. With no messages, the
  host's `emptyState` renders instead. While streaming, a pulsing
  "Running…" line follows the list.
- Follows the newest message: the list scrolls to the bottom whenever a
  message arrives or a run starts, and sending always scrolls, so the
  user sees the bubble they just posted and the reply forming under it.
  Scrolling up (more than ~40px off the bottom) stops the following
  until the list is scrolled back down or the next send. The panel
  owns this: a host that pushes messages, and a tour that types into
  the draft and sends, both get it for free.
- Live run progress: while streaming, a non-null `progress` prop renders
  a block under the Running… line: a status line
  (`Step i of N: <label>`, `· rows done / total` while `rowsTotal > 0`
  and `rowsDone > 0`; `Starting…` until the first step), a thin progress
  bar advancing step by step (fractionally within a streaming step), and
  a collapsed "request detail" toggle that expands a read-only log box
  streaming `progress.log`, pinned to its newest line. The block
  unmounts when streaming ends, so the next run starts collapsed.
- Request detail: an assistant message with `debug` gets a collapsed
  "request detail" toggle and a copy button; expanded, it shows the request,
  model/token/elapsed summary, per-turn ops, and cell samples, the same
  text the copy button puts on the clipboard.
- Report bug: a message with `reportable: true` gets a "Report bug" action
  (bug icon + label) when the host passes `onReportBug`, which fires with
  the message. It sits on the request-detail row when `debug` is present,
  or stands alone under the message text otherwise (an app error without a
  detail). Messages without `reportable` never show it.
- Suggestion chips: a non-empty `suggestions` prop renders a wrap row of
  rounded-rectangle buttons between the message list and the input row,
  one per string, each a sentence. The corners are modest and the padding
  generous on purpose: a sentence that wraps to two lines must not run
  into its own rounding. A truthy `suggestionsLoading` renders, in the
  same slot and only while `suggestions` is empty, a quiet grey
  `Loading AI suggestions…` line (`data-cp-suggestions-loading`). Clicking a chip appends its sentence to the
  draft (`appendSentence`, exported: the trimmed draft, a space when
  that is non-empty, the sentence, a trailing space), focuses the
  textarea, and fires `onPickSuggestion(text)`; so several clicks build
  one request. Dropping the chip from the list is the host's job (the
  app's after-load suggestions, behavior.md § Suggested requests after a
  load). Chips are disabled while streaming and hidden in the disabled
  state. The panel never drops a chip on its own: a host that clears the
  list after the first committed request (the app does) simply passes an
  empty array.
- Input row: a full-width textarea over an actions row (the host's
  `micButton` slot and send, or a stop button that fires `onCancel` while
  streaming). Enter sends, Shift+Enter for a newline; send is disabled on an
  empty draft. The textarea starts three lines tall and grows with the
  draft up to ten lines; past that it scrolls internally, so the scrollbar
  sits at the box's right edge and never between the text and the buttons.
  A non-null `prefill` syncs into the draft (tutorial prefill-chat steps).
- Disabled state: a non-null `disabledHint` disables the textarea and send
  button, clears the draft, shows the hint as the greyed placeholder, and
  hides the `micButton` slot: the host's "input is off, here is why" state
  (the app uses it while staying in a finished tour).

Stable attributes: `data-cp-messages` (the scrolling message list),
`data-cp-message="user|assistant"`, `data-cp-error`,
`data-status-dot="ok|undone"` (the StatusDot marker),
`data-cp-detail-toggle`, `data-cp-detail`, `data-cp-report`, `data-cp-send`,
`data-cp-stop`, `data-cp-running`, `data-cp-progress`,
`data-cp-progress-toggle`, `data-cp-progress-log`, `data-cp-suggestion`
(one per chip), `data-cp-suggestions-loading`, plus the app's existing
`data-testid="mic-button"` / `"copy-debug"`.

## MicButton component

`MicButton({ status, onStart, onLatch, onStop, onCancel, size? })` supports the
two recording gestures voice chat apps use, so holders and tappers both work:

- **Press and hold**: pointer-down fires `onStart` (red fill + pulsing ring);
  releasing *after* the hold threshold fires `onStop` (push-to-talk send).
- **Quick tap**: a pointer-down/up shorter than the threshold fires `onLatch`
  instead. The button swaps to two explicit controls: cancel (`✕`,
  `data-testid="mic-cancel"`) firing `onCancel`, and send (`✓`,
  `data-testid="mic-send"`) firing `onStop`, beside a pulsing dot, so a quick
  click latches recording hands-free rather than sending an empty clip.

Escape or pointer-cancel fires `onCancel` in either mode. While `status` is
`sending` the button shows a spinner and ignores presses; `latched` shows the
cancel/send controls. Whether the button appears at all is the host's call (the
app hides it when the selected model takes no audio). Ring and spinner
animations ship inside the component.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/chat-panel/`)
mounts ChatPanel over plain React state: sending appends the user message
and an echoed assistant reply, buttons inject an error reply (guidance: no
Report bug), an app-error reply (`reportable`, no detail), and a reportable
reply with request detail, a fill-thread button pads the list past the
panel's height (so the scroll rules have something to scroll), a
streaming toggle drives the Running…/stop state
together with a sample run progress (step line, bar, live request-detail
log), a prefill button exercises the draft sync, a suggestions button
adds three chips (each click appends its sentence to the draft and drops
the chip) and toggles the loading line, and
the demo MicButton cycles recording → sending → idle. Every callback appends to the `#out` event log,
non-empty on load: the demo smoke test's ready signal.
