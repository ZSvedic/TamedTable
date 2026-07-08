# chat-panel — keep the original

Compares `src/packages/chat-panel` here (37 KB) with the recreate's (49 KB).
The recreate is the rare package that grew, and it still lost features.

## Analysis

The recreate rebuilt the panel as plain DOM functions (`mountChatPanel`) while
the spec's worked example is a React component. Its `package.json` does not
even export the new functions, so the web app could not import them; its tests
pass only because they check its own demo page, never the component the app
uses.

Also lost in the recreate:

- Theme tokens from ui-kit — dark mode is gone, colors are hardcoded.
- The typing effect for prefilled text (original types character by character).
- The `fill` prop (mobile bottom sheet) and the element ids the tutorial
  anchors to.
- Screen-reader labels on the mic controls and the Copy button.
- `ChatRequestDetail` detail: `modelCalls[]` flattened to a single model,
  cell samples flattened to strings.

One small thing done better: its help popover is a semantic `<ul>` list; the
original renders plain divs.

## Questions for you

None.

## Plan

1. Code: no change — the original stays.
2. Optional cleanup: switch the help popover markup to a `<ul>`. Pure refactor,
   suite must stay green, no spec change.
