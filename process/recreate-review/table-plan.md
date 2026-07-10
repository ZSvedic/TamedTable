# table-plan — keep the original

Compares `src/packages/table-plan` here (6.5 KB) with the recreate's (7.6 KB).
Same types, same transformations — the difference is how plans get validated.

## Analysis

`spec/code-contract.md` mandates a single Zod schema. The recreate hand-rolled
its checks instead, and lost strictness:

- Unknown keys pass (the original's `.strict()` rejects them).
- Array elements go unchecked — `select.columns` accepts non-strings.
- `pivot.agg`, `page`, `summary`, `filter`, and `sort` shapes are not validated
  at all.

It also reimplemented JSON-patch by hand where the contract names
`fast-json-patch`.

Two tiny things the recreate does stricter: it rejects an empty `sort.by` and
an empty `unpivot.measures`; the original accepts both as no-ops.

## Questions for you

- [x] Empty `sort.by` / `unpivot.measures`: reject the plan (recreate) or keep
      accepting them as no-ops (original, current)? Answer: reject the plan (recreate)

## Plan

1. Code: no change beyond the answer above.
2. If rejecting empties: add `.nonempty()` to the two Zod fields, one sentence
   in `spec/code-contract.md`, one scenario each. Behavior change: red first,
   then green.
