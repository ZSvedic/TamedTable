# TableTamer Phase 4 — Status Report

**Date:** 2026-05-12 / 13
**Session goal:** turn the V1 cucumber suite from red to green by implementing `packages/core`, `packages/headless`, `packages/cli`, wiring `cancelation.feature`, and running the suite against the real Anthropic API.

## What I did

**Implementation (all V1 spec requirements).**
- `packages/core` — `Spec` / `Row` / `Transformation` / `Expr` types, a single Zod schema with the V2-rejection rule, plus `loadCsv` / `readJsonl` / `writeJsonl`.
- `packages/headless` — `createHeadlessRunner` with the conversation driver over Vercel AI SDK, the single `apply_spec_patch` tool, JS evaluator via `new Function`, parallel chunk dispatcher for LLM mutates, the 3-turn error feedback loop, prompt caching via Anthropic `cache_control: ephemeral`, and AbortSignal plumbed end-to-end for cancellation.
- `packages/cli` — `createCliRunner` (REPL with hand-rolled `padEnd` ASCII renderer and per-chunk progress lines) and `runCli` (the `execute <flow>` batch path with exit codes 0–4).
- Authored `datanorm.flow`, `dedupe.flow`, `filter.flow` so the saved-flow scenarios resolve.
- Wired `cancelation.feature` into `cucumber.js` and added `cancelation.steps.ts` with the five new step defs (request via LLM, wait-for-chunk, cancel, plus the then-assertions).
- `bun x tsc --noEmit` is silent. No `any` stubs remain in any `packages/*/src/index.ts`.

**Plumbing fixes so the real LLM actually runs.**
- The shell injects an empty `ANTHROPIC_API_KEY`, blocking bun's auto-loading of `.env`. Switched the test scripts to `bunx --bun cucumber-js` (forces the bun runtime so `.env` loads), and the runner now defaults the SDK base URL to `https://api.anthropic.com/v1` because `ANTHROPIC_BASE_URL` in the shell is missing the `/v1`.
- Added a per-process 40 RPM token-bucket throttle (the account's hard cap is 50 RPM), bumped SDK `maxRetries` to 6, set the cucumber step timeout to 600 s, and pinned `temperature: 0` on every call so we don't get gratuitous output drift between runs.
- Split models: sonnet-4-5 for the patch turn (instruction-following), haiku-4-5 for per-cell mutate calls (cost + speed). Overridable via `TABLETAMER_MODEL` / `TABLETAMER_CELL_MODEL` env vars.
- Reject no-op LLM responses: if `apply_spec_patch` is called with empty ops, or if the resulting `transformations` array is unchanged, the recovery loop sends an explicit error back and the model re-emits a real patch. Without this, every dedupe scenario was silently failing because the model emitted `[]`.
- Added a prefix-cache to `replay`: when the new spec's transformations extend the prior committed list, replay reuses the cached `derivedRows` and only runs the new transformation. This took the round-trip scenario from "21 + 41 + 61 LLM calls" to "21 + 21 + 21" and unblocked the 180 s timeout.
- Cancellation: replay now throws `Runner: cancelled` if `signal.aborted` is true after replay completes (not just if it throws mid-flight), so a fast-completing chunk dispatcher still rolls back. Without this, replay sometimes finished before cucumber's poll could call `abort()`, committing the transformation the test expects rolled back.

**Test runs (with the real LLM, key live via `.env`).**
- CLI subset (dedupe + filter + cancellation): **9 / 9 passing.**
- Headless subset (dedupe + filter + cancellation): **7 / 7 passing.**
- Full CLI suite (incl. datanorm): **11 / 14 passing.** The 3 remaining failures are all the LLM Phone-normalization scenarios (`Normalize Phone`, `Full round-trip`, `Execute saved flow`) — same root cause, described below.
- Full headless suite incl. datanorm was running at the time of writing; expected to mirror the CLI result.

## Problems encountered and how I addressed them

| Problem | Resolution |
|---|---|
| `.env` not loading: the harness shell had an empty `ANTHROPIC_API_KEY`. | Use `bunx --bun cucumber-js` (forces bun runtime) and `unset ANTHROPIC_API_KEY` before running. `package.json` `test` script already updated. |
| 404 on every LLM call. | The shell sets `ANTHROPIC_BASE_URL=https://api.anthropic.com` (no `/v1`). Runner now appends `/v1` automatically. |
| 50 RPM rate limit chewed up retries and timed out cancellation steps. | Added a 40 RPM token-bucket throttle shared across the run; raised SDK retries to 6. |
| Cucumber default 5 s step timeout vs. ~10 s LLM round-trips. | Set `setDefaultTimeout(600_000)` in the step defs. |
| Round-trip scenario timed out at 180 s because each request re-ran every prior LLM transformation from source. | Prefix-cache in `replay`: reuse the previously committed `derivedRows` when the new spec's transformations are a prefix-extension of the prior list. |
| LLM occasionally returned an empty patch (haiku, on dedupe). | Recovery loop now treats empty ops / no-op patches as errors and asks the model to re-emit. |
| LLM occasionally emitted the wrong target column (e.g. Country for "Normalize phone numbers"). | Tighter system-prompt rules ("preserve existing transformations", per-column few-shots for Phone / Country / DOB, `temperature: 0`), and switched the patch turn to sonnet for stronger instruction-following. |
| Cancellation step sometimes saw `this.spec` committed because replay finished before `abort()` could land. | Added a post-replay `if (signal?.aborted) throw` so any cancel during the request rolls back even if replay technically returned. |

## Remaining issues

- **Phone-normalization in the datanorm feature is the only red.** Across runs the LLM keeps producing E.164 strings that disagree with `datanorm-expected.jsonl` by ±1–3 digits — sometimes "smart-inferring" a London area code (`+44 20 555 8765`), sometimes truncating a trailing digit. The output is plausible, just not the exact string the golden file encodes. The golden file appears to have been generated by a different model or temperature; even with `temperature: 0` and tightened prompts, sonnet/haiku produce a different "canonical" answer than the golden's. I confirmed this is not a haiku weakness by re-running with sonnet on the cell calls too (`TABLETAMER_CELL_MODEL=claude-sonnet-4-5`) — same 3 failures, different specific row each run.
- **Per-org rate limit is the dominant constraint.** A full CLI run takes 7–9 minutes; the bulk of that is rate-limit pacing, not LLM latency. Two runs back-to-back risks hitting the 50 RPM cap on retries.
- The cucumber path-merge warning is cosmetic (their deprecation notice about merging configured `paths` with CLI args). No action needed today.

## Ideas for improvement

- **Pin Phone normalization to a known good output.** Either (a) regenerate `datanorm-expected.jsonl` from the current prompt + model combo and commit a freshly canonical golden, or (b) loosen the assertion to "starts with `+<country code>` and contains the input digits" — the latter matches V1 spirit better but is a spec change.
- **Cache LLM cell results by `(prompt + cell-value)` hash.** The spec already mentions this is V2, but it would cut datanorm's runtime by 5× because Phone, Country, DOB re-runs against the same inputs.
- **Surface a `--model` flag on `runCli execute`** so users can pick between sonnet (accuracy) and haiku (cost) without env vars.
- **Tighter `apply_spec_patch` JSON schema with `oneOf` per transformation kind** instead of the current permissive schema + Zod validation post-apply. This would let the SDK reject bad patches at tool-call time, saving recovery turns.
- **Request a rate-limit increase for the org** — even doubling to 100 RPM would halve test runtime and remove most of the cancellation timing fragility.

## How to run the suite locally

```bash
# in a shell with no preset ANTHROPIC_API_KEY (or unset it inline)
unset ANTHROPIC_API_KEY
bun run test
```

Override the model / RPM via env if needed:
```bash
TABLETAMER_MODEL=claude-sonnet-4-5 TABLETAMER_CELL_MODEL=claude-haiku-4-5 TABLETAMER_RPM=40 bun run test
```

Filter to a subset of features (handy during iteration):
```bash
TABLETAMER_FEATURES="dedupe,filter,cancelation" bun run test
```
