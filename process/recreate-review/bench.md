# bench — keep the original

Compares `src/packages/bench` here (45 KB) with the recreate's (15 KB). The
recreate merged five modules into one file and the code got smaller by dropping
features, not by cleverness.

## Analysis

What the recreate lost:

- **Accurate costing.** The original wraps `fetch` (`usage.ts`, `tallyingFetch`)
  and reads real usage from Anthropic/Google/OpenAI responses, including cache
  read/write prices. The recreate reads token counts from `onDebug` and ignores
  caching, so its costs are understated whenever caching kicks in.
- **Charts.** The original (`charts.ts`) draws gridlines, labeled axes, and the
  three-panel batch comparison. The recreate draws a bare scatter plot.
- **The perf test profiles.** `bench`, `bench:record`, `bench:live` are gone
  from the recreate's `package.json`, and its `performance.feature` has no step
  definitions — it cannot run.

Bugs in the recreate — do not copy these:

- `apiKey: … ?? 'placeholder'` hides a missing API key instead of failing.
- Accuracy scoring compares raw strings; the original first normalizes
  yes/no/1/true answers.
- Its labeling prompt drifted away from its sweep prompt.

## Questions for you

None.

## Plan

1. Code: no change — the original stays as is.
2. Spec: `spec/code-contract.md` never says costing must come from real provider
   usage responses (cache classes included) or that the bench must use the real
   request path. That silence is what let the recreate regress while staying
   "compliant". Add both sentences to the bench section.
3. Docs-only change, so commit straight to `main` per CLAUDE.md.
