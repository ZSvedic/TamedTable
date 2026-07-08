# file-io — keep the original, write its edge rules into the spec

Compares `src/packages/file-io` here (36 KB) with the recreate's (25 KB). On
clean input both produce byte-identical CSV. Off the happy path the recreate
loses, every time.

## Analysis

Where the recreate breaks and the original does not:

- A UTF-8 BOM at the start of a CSV corrupts the first column name.
- Whole numbers too big for JavaScript (over 2^53) get silently rounded; the
  original keeps them as strings.
- No warning for files over 2 GB.
- A broken JSONL line raises a bare syntax error; the original says which file
  and line.
- Every file-picker error is swallowed as "user cancelled"; the original only
  treats a real cancel that way and rethrows the rest.

One real judgment call: a CSV row with too few or too many columns. The
original rejects the file; the recreate pads and accepts it.

None of the five behaviors above appear in `spec/behavior.md` or the feature
file — which is exactly why the recreate passed its suite while losing them.

## Questions for you

- [ ] A CSV row with the wrong column count: reject the file (original, current
      behavior) or accept and pad (recreate)? Answer: Reject the file (keep the
      original, current behavior).

## Plan

1. Spec: add the five behaviors above to `spec/behavior.md` /
   `spec/code-contract.md` and `spec/packages/file-io/file-io.feature`, one
   scenario each (BOM, big number, huge-file warning, JSONL error location,
   picker error). They document what the code already does, so they pass right
   away.
2. Write the ragged-row answer into the spec the same way. If the answer is
   "accept and pad", that is a behavior change: scenario first, red, then
   implement.
