# toolbar — keep the original

Compares `src/packages/toolbar` here (32 KB) with the recreate's (42 KB — of
which 17 KB is a committed demo build artifact; the real code is smaller).
Same buttons and menus; the recreate lost the details around them.

## Analysis

What the recreate dropped — all three are written in `spec/behavior.md`, so
these are plain spec violations on its side:

- The nullable file name: the original hides the name for in-memory tables;
  the recreate renders `undefined · 95 rows`.
- The URL dialog's loading state: the original disables inputs, shows
  "Loading…", and blocks Escape while a fetch runs; the recreate lets you
  double-submit and close mid-load.
- `openButtonId`, the id the tutorial uses to spotlight the Open button — the
  tour can no longer point at it.

Smaller recreate losses: menus don't close on an outside click, the URL hint
names two formats instead of four, no dark-mode brand mark, missing
screen-reader labels.

The recreate added no toolbar scenarios — the feature file is byte-identical —
so unlike model-config there is nothing to adopt back.

## Questions for you

None.

## Plan

Nothing to do. The original stays as is.
