# table-view — keep the original

Compares `src/packages/table-view` here (27 KB) with the recreate's (36 KB).
The recreate is larger without doing more: imperative DOM code is just wordier
than the React it replaced.

## Analysis

The recreate rebuilt the React components as plain DOM and broke pagination on
the way:

- `clampPage(4, 0)` returns 0 and `clampPage(NaN, 5)` returns NaN; the spec
  says page is always at least 1 and non-finite input becomes 1. The original
  gets both right — its `pagination.test.ts` is why.
- Near the edge of the page list it hides single steps the spec says must stay
  reachable (`[1,…,3,4,5,…,20]` instead of `[1,2,3,4,5,…,20]`).
- A negative row total throws.

Two recreate ideas are genuinely good, and the original already has both at the
web level: a phone mode where the page itself scrolls the table, and updating a
selection in place instead of re-rendering (which would kill a double-click).
Nothing to port.

Column reorder differs (HTML5 drag here, raw mouse events there) — cosmetic.

## Questions for you

None.

## Plan

Nothing to do. The original stays; the recreate's bugs are its own. The phone
scenarios that cover the scroll mode land via [web.md](web.md).
