# 2026-07-03 — Spec-driven audit: could src/ be rebuilt from spec/ + marketing/?

Requested audit: does the repo really practice spec-driven development — if `src/` were
deleted, could everything be recreated from `spec/` and `marketing/`? Five parallel review
passes compared every `src/` package against its spec layer: the 8 specced library
packages, the 7 packages without a `spec/packages/` dir, `src/tests/` plus the root
config files, app behavior vs `behavior.md`/`code-contract.md`, and binary assets vs
`marketing/`.

## Verdict

Yes, mostly — roughly 90% of `src/` is regenerable, and the best parts are specified down
to verbatim strings, constants, and element ids. The prompts genuinely live in spec
(`headless/index.ts` reads `spec/prompt-app-edit.md` at init; the web build inlines the
same file), every web icon is a byte-identical copy of `marketing/brand/`, and
`ui-kit/tokens.json` syncs one-way from `marketing/tokens.json` with a CI guard. The gaps
fall into three buckets: data that only exists under `src/` (cassettes, lockfile, icon
artwork), spec passages that contradict the code (a rebuilder couldn't tell which document
to trust), and real behavior the spec never mentions (a rebuild would silently drop it).

## Not recreatable — data that lives only under src/

- `src/tests/__cassettes__/*.json` (24 files, ~944 KB) — recorded LLM responses. The
  *mechanism* is fully specced, but re-recording needs live API keys, costs money, and is
  nondeterministic — and fresh recordings can stop matching the golden
  `spec/test-cases/*-expected.jsonl` files, forcing human-reviewed spec changes. Deleting
  `src/` is therefore not spec-neutral. (Known, accepted boundary per code-contract §Cassettes.)
- `src/bun.lock` — the resolved dependency tree. A fresh install resolves different
  versions; the `@duckdb/node-api` pin `1.5.2-r.1` and all caret ranges in
  `src/package.json` appear nowhere in spec. CLAUDE.md's "src root files are permanent,
  not regenerable" claim is accurate.
- `src/packages/ui-kit/Icon.tsx` — 33 hand-drawn SVG glyphs. The spec neither lists the
  names nor the geometry; the artwork would be redrawn from scratch.
- `src/packages/voice-input/index.ts` — `buildVoicePrompt`'s exact wording and the
  `audioMediaType` extension→MIME map. Both are replay-fingerprint-critical: a paraphrase
  breaks every voice cassette. `spec/prompt-app-edit.md` has no voice section.
- `src/packages/web/public/manifest.webmanifest` — only web asset with no marketing/ or
  spec/ counterpart (trivial, but documented nowhere).
- `RECOVERY_GUIDANCE` and the `buildPrompt` scaffolding (`headless/index.ts`) — prompt
  content outside the four spec-owned sections of `prompt-app-edit.md`.

## Stale spec — passages that contradict the code

- code-contract §Voice: claims text requests route through Anthropic via
  `defaultModel('anthropic')`; `controller-engine.ts` uses the selected provider.
- code-contract §Tutorial replay: claims voice tours pin `gemini`, others `anthropic`;
  `replayProvider()` always returns `gemini` (matching behavior.md).
- `Expr` overpromise: contract types `filter.pred`, `validate.pred`, `join.on` as full
  `Expr`, but the engine throws "LLM predicates not supported" for all three
  (`headless/index.ts:360,392,599`); `group.by` accepts only `string | {js}`.
- Parquet/Arrow: behavior.md §FormatOut says `.parquet` is out of scope, code-contract
  types the codec registry `'csv' | 'jsonl' | null` — yet §WebUI, the format spec pages,
  and the code all support 4 formats end-to-end. Same staleness in
  `spec/packages/file-io/behavior.md:97-118` (`detectFormat`, error string).
- behavior.md contradicts itself on the URL dialog (~708 "no longer lists samples" vs
  ~755 "surfaced inside the URL dialog"); code-contract repeats the stale half.
- behavior.md settings: "no card is expanded" vs "selected provider's card opens by
  default" — the code does the former.
- The `?` popover advertises `:undo`/`:redo` in web chat, but `sendChat` has no
  colon-command handling — a typed `:undo` becomes an LLM patch turn.
- `spec/packages/ui-kit/behavior.md:62` says Icon has "20 names"; the union has 33.
- code-contract §{sql}: describes `conn.register('t', rows)` at module init; the code
  lazily creates DuckDB and materializes `t` via CREATE TABLE + INSERTs.
- CLI column auto-fit: contract specifies a greedy per-column width pack; the code uses a
  fixed-average estimate (`floor((termCols-1)/16)`, min 5).
- MAP.md §Library packages claims every row has a spec under `spec/packages/<name>/`;
  the Table plan and Cassette rows are specced in code-contract instead.

## Unspecced behavior — a rebuild would drop it

- `.env` autoload: `loadEnv()` walks up 5 dirs from cwd, non-overriding
  (`core/index.ts:80-119`); absent from the env-var table.
- CLI bare-filename fallback to `../spec/test-cases/<name>` in `:load`/`execute`;
  behavior.md says the path is "taken literally."
- Unknown colon commands fall through to the LLM as natural language; REPL startup
  banner, `undid:`/`redid:` lines, `:show`/`:find` error strings, startup-load exit 3,
  and the journal-empty undo fallback — all unspecified.
- The Playwright e2e layer (`src/packages/web/e2e/`, `playwright.config.ts`) is referenced
  nowhere in spec/, test-tree.md, or README.
- `WaveButton` (hands-free) is missing from the chat-panel package spec — reconstructible
  only from the app-level spec, visuals guessed.
- models.json membership rule: the catalogue is `benchmarks/models.jsonl` minus
  non-runnable rows, and `voiceInput` mirrors `audioInput` — both links unwritten.
- Smaller items: cassette `DROP_HEADERS` invariant, VAD `DEFAULT_TUNING` values,
  `MicButton` `HOLD_MS = 250`, `TAMEDTABLE_WEB_BASE`, tsconfig compiler options
  (`noUncheckedIndexedAccess` changes what compiles), `@needs-recording` cucumber
  mechanics, the `@cancel` batch/pacing test tuning, `TUTORIAL_FEATURES` bundle list,
  bench `SweepResult` shape and chart layout, gherkin-tour `css.d.ts`, Node-builtin
  browser shims (`web/src/shims/fs|path|url.ts`), `index.css` desktop styling values.

## Resolution — landed the same day, this branch

1. Cassettes moved to root `cassettes/` (recorded data, like `benchmarks/`);
   layout docs updated.
2. Version-pinning rule written down: `bun.lock` is the spec of the dependency
   tree; code-contract records the DuckDB pin's *why*, never the number.
3. Icon artwork moved to `marketing/icons/` (one SVG per glyph);
   `bun run sync:icons` generates ui-kit's `icons.ts`, guard test on drift.
4. Voice prompt canonical in `spec/prompt-app-edit.md § VOICE_PROMPT`;
   `voice-input` keeps a byte-identical copy under a guard test; MIME map
   documented in the package spec.
5. Every stale-spec item below fixed: the four code-contract passages, the two
   behavior.md self-contradictions, the small stale facts, and the missing
   one-liners (`.env` autoload, fixture path fallback, models.json membership
   rule, e2e layer). The web `?` popover code stopped advertising chat
   colon-commands that never existed.

Still open by design: cassettes and `bun.lock` remain unrecreatable-by-spec —
now documented as deliberate boundaries rather than gaps.

## Suggested fixes, in value order

1. Fix the four actively-wrong code-contract passages (voice routing, replay provider,
   codec registry types, `Expr` support matrix) — they mislead more than a missing spec.
2. Move `buildVoicePrompt` text into `spec/prompt-app-edit.md` (it is exact-bytes
   load-bearing, same as the three existing prompts).
3. Resolve the two behavior.md self-contradictions (URL dialog samples, settings card).
4. Add one-liners for `.env` autoload, the test-fixture path fallback, and the
   models.json↔benchmarks membership rule.
5. Accept and document the rest: cassettes, bun.lock, and icon artwork are recorded
   data/art, not spec-derivable — CLAUDE.md already says so for the root files; a
   matching sentence for cassettes and Icon.tsx would make the boundary explicit.
