# gherkin-tour — keep the original

Compares `src/packages/gherkin-tour` here (42 KB) with the recreate's (26 KB).
The parsers are near-equivalent; the differences are in what sits on top.

## Analysis

What the recreate lost:

- The whole Tutorial panel layer: the 7 categories, their controller, and the
  test that keeps them in sync with the marketing homepage. All gone.
- The retry that waits for a spotlight target that mounts late.
- A working demo: its demo page only logs calls, it never mounts the real tour
  overlay, so nothing exercises its spotlight in a browser.

What the recreate changed on purpose:

- It added a Back button and ←-key support. The original is deliberately
  forward-only — but that rule lives only in code, not in the spec, which is
  how the recreate walked past it.
- It hand-rolled the spotlight overlay instead of using driver.js. Fewer
  dependencies, less polish.

## Questions for you

- [ ] Tours are forward-only today (no Back). Keep that rule and write it into
      `spec/behavior.md`? If you actually want a Back button, say so and it
      becomes a feature task instead. Answer: Keep that rule and write it into
      `spec/behavior.md`
- [ ] Replacing driver.js with a hand-rolled overlay (the recreate's idea):
      try it later, or keep driver.js? Answer: keep driver.js

## Plan

1. Code: no change.
2. Spec: one sentence in `spec/behavior.md` recording the forward-only answer.
3. If the driver.js answer is "try it": file it as a separate issue, not part
   of this task.
