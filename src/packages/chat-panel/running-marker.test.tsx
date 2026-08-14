// RED-UI-3: regression test (red inventory): the chat header never shows the
// "· running" marker while the FIRST request streams. The whole counter span:
// including `{streaming && <> · running</>}`: is nested inside
// `requestCount > 0 && (…)` (ChatPanel.tsx:535-549), so with requestCount 0
// (history is empty until the first request commits) the running marker
// cannot render. Spec: "Header: 'Requests', the transformation count
// (`requestCount`, with '· running' while streaming)":
// spec/packages/chat-panel/behavior.md:53-54, nothing scopes the marker to
// a non-zero count. Pure renderToString, no DOM needed.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from '@tamedtable/ui-kit/components';
import { ChatPanel } from './ChatPanel.tsx';

function render(requestCount: number): string {
  return renderToString(
    h(ThemeProvider, null, h(ChatPanel, {
      messages: [],
      streaming: true,
      requestCount,
      onSend: () => {},
      onCancel: () => {},
    })),
  );
}

test("RED-UI-3: '· running' marker absent while the first request streams (requestCount 0)", () => {
  // Harness sanity first: from the second request on the marker does render.
  // If this throws, the failure is a broken harness, not RED-UI-3.
  if (!render(2).includes('· running')) {
    throw new Error("harness broken (not RED-UI-3): streaming with requestCount=2 should render '· running'");
  }

  assert.ok(
    render(0).includes('· running'),
    "RED-UI-3 (spec/packages/chat-panel/behavior.md:53-54): the header shows '· running' while streaming, with no scoping to a non-zero count, but during the first request (streaming=true, requestCount=0) the marker is missing, because ChatPanel.tsx:535-549 nests it inside `requestCount > 0 && (…)`",
  );
});
