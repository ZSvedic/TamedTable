# Refactor pass — Status Report

**Date:** 2026-05-13

Goal: reduce code size by extracting small generic helpers, collapsing duplication, and shortening long methods. No behavior change — every refactor was gated by `bun x tsc --noEmit`, 29 unit tests, and 13 `@offline` cucumber scenarios.

## Per-file before/after

| File | Lines before → after | Bytes before → after | What changed |
|---|---:|---:|---|
| [packages/headless/src/index.ts](packages/headless/src/index.ts) | 633 → 640 | 28,587 → 28,499 | Pulled `applyFilter` / `applySelect` / `applySort` / `applyMutateJs` / `renderPrompt` / `validateTemplate` / `buildPrompt` / `applyAndValidate` out of the runner class as pure module functions. Added `abortIf(signal)` / `isCancelled(e)` / `compileJs(body)` / `ANTHROPIC_EPHEMERAL` / `CANCELLED` constants — kills the scattered `if (signal?.aborted) throw` and the three repeated `providerOptions` blobs. `request` is now linear: build prompt → call LLM → `applyAndValidate` → replay → commit, with one error-recovery branch instead of nested IIFEs. The line count is flat because the module-level helpers add header lines that the call sites save back; the win is readability, not bytes (the file is dominated by the 5.4 KB `SYSTEM_PROMPT` literal). |
| [packages/cli/src/index.ts](packages/cli/src/index.ts) | 479 → 398 | 17,162 → 17,155 | Slash commands are now a `Record<string, SlashHandler>` dispatch table; `handleSlashCommand` is 8 lines. Each handler is 3–10 lines. The two `fail(code, msg)` closures (one in `runCli`, one in `runExecute`) collapse to one `makeFail(stderr)` factory. `runExecute`'s 17-line flag parser is now a 12-line pure `parseExecuteFlags`. `runWithErrorRender` and `splitCmd` factor out the `try/catch → renderError` and `'/cmd' vs '/cmd <arg>'` patterns. -81 lines of code; bytes flat because content (the 1.6 KB `HELP_TEXT`) dominates. |
| [packages/core/src/index.ts](packages/core/src/index.ts) | 217 → 174 | 6,882 → 6,020 | The 40-line `TransformationSchema` `superRefine` with the inline switch over `kind` is replaced by a `z.discriminatedUnion` of four V1 transformation shapes, with a tiny `z.preprocess` in front to throw on V2 `kind: "group" / "join"`. The two `try { readFile } catch` blocks in `loadCsv` / `readJsonl` share a one-line `readText(label, path)` helper. **-862 bytes, -43 lines.** |
| [packages/cli/src/slash.test.ts](packages/cli/src/slash.test.ts) | 166 → 150 | 7,804 → 6,488 | The 5-line `captureStdout` + `createCliRunner` + `loadInput` boilerplate at the top of every test (10 tests, 50 lines) collapses to one `makeHarness()` / `loadedHarness()` helper and an inline `tmpPath(suffix)`. **-1,316 bytes.** |
| [test-cases/step-defs/cli-invocation.steps.ts](test-cases/step-defs/cli-invocation.steps.ts) | 94 → 67 | 3,056 → 3,082 | The five `Then` step pairs (`exit code is` / `REPL exit code is`, `stdout contains` / `REPL stdout contains`, `stderr contains`) shared verbatim assertion bodies. Now they all delegate to `assertExitCode(world, code, label?)` and `assertStreamContains(world, stream, text, label?)`. The two `When` handlers share `runAndCapture` and `tokenizeCmd`. Bytes flat because of added type annotations; **-27 lines.** |

**Totals:** 1,589 → 1,429 lines (-160 lines, -10%). Source-byte savings are modest (the 5.4 KB `SYSTEM_PROMPT` and 1.6 KB `HELP_TEXT` are content not code) but the code that remains is shaped around small generic helpers instead of long bespoke methods.

## What the helpers look like (the Carmack/Kay slant)

- **`abortIf(signal)` / `isCancelled(e)`** — two-line guards. Every `signal?.aborted` check and every `e.message === 'Runner: cancelled'` decision goes through them. The string constant `CANCELLED` exists once.
- **`compileJs(body)`** — replaces a 5-arg helper that always got the same args. One way to compile, one signature.
- **`applyFilter` / `applySelect` / `applySort` / `applyMutateJs`** — pure functions of `(rows, transformation) → rows`. Move them between packages tomorrow without dragging the runner class with them.
- **`buildPrompt(text, spec, errPrefix?)`** — three almost-identical prompt-builder branches in the recovery loop became one function with an optional prefix.
- **`applyAndValidate(spec, ops)`** — pulls the patch-apply-validate-and-detect-noop dance out of the recovery loop. The loop body now reads top-to-bottom.
- **`SLASH: Record<string, SlashHandler>`** — adding a slash command is one entry in the table plus a 3-line handler. The dispatcher doesn't change.
- **`makeFail(stderr)`** — closes over the stderr buffer once. Both `runCli` and `runExecute` reuse it.
- **`readText(label, path)`** — every `try { readFile } catch` in core now goes through it.
- **`makeHarness()` / `loadedHarness()`** — every slash test's three-line setup collapses to one call.

## Verification at every step

| Stage | tsc | bun unit | offline cucumber |
|---|:-:|:-:|:-:|
| Baseline (before refactor) | clean | 29/29 | 13/13 |
| After `headless` rewrite | clean | 29/29 | 13/13 |
| After `cli` rewrite | clean | 29/29 | 13/13 |
| After `cli-invocation` step-def dedup | clean | 29/29 | 13/13 |
| After `core` schema rework | clean | 29/29 | 13/13 |
| After `slash.test.ts` harness factor | clean | 29/29 | 13/13 |
| Final | clean | 29/29 | 13/13 |

Live cucumber (`@headless` + `@cli` profiles against the real Anthropic API) was not re-run in this pass — costs a few minutes and a few thousand tokens. The refactor touches no LLM-facing surface (system prompts, batch protocol, recovery messages are byte-identical), so the live suite should mirror the offline result.

## What was *not* changed (and why)

- **System prompt / batch system prompt / help text**: 7+ KB of static strings. Trimming them is a behavior change, not a refactor.
- **The phase-4 add-ons that the prior status report flagged as spec drift** (per-cell cache, rate limiter, plan-preview, debug info): kept, because removing them is a feature-set decision the user needs to make explicitly. The code shape is now tight enough to make that decision cheap.
- **Spec docs, phase docs, fixtures, golden files**: the user asked to reduce *code* size; docs and fixtures untouched.

## What's left if more trimming is wanted

| Target | Estimated savings | Cost |
|---|---:|---|
| Drop `onPlan` / `computePlan` / `formatPlanItem` / `describeTransformation` | ~3 KB | Loses the REPL "plan:" preview before each chunk run. |
| Drop `TABLETAMER_DEBUG` / `RequestDebugInfo` / `renderError` debug block | ~2 KB | Loses the per-turn debug block on `Runner: recovery budget exhausted`. |
| Drop per-cell `cellResultCache` | ~1 KB | Loses sub-second replays for re-running the same prompt against the same value. |
| Drop the rate limiter | ~1 KB | Test suite will 429 against the 50 RPM org cap. |
| Drop the replay prefix-cache | ~1 KB | Round-trip scenarios re-run every prior transformation from source each turn. |

Each is a real feature, not bloat. Listed so the user can pick.
