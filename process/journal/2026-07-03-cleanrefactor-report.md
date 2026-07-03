# Clean-refactor report — 2026-07-03

Branch: `claude/simplify-repo-ai-agents-6rqqrq` (5 commits, all rounds green on
`bun run test` — 163 headless + 116 cli + 181 web scenarios — plus
`bun run typecheck` and `bun run test:smoke`).

## Metrics

Tokens via `process/repo-tracking/count-tokens.sh` (comments excluded).
"Total" sums src + spec + process + marketing + benchmarks + cassettes;
root files (~10.3k) unchanged.

| Metric | Before | After | Δ |
|---|---|---|---|
| Tracked files | 541 | 537 | −4 (−9 deleted, +1 added, +4 renamed/kept) |
| src tokens | 177,630 | 172,748 | −4,882 |
| spec tokens | 95,275 | 78,993 | −16,282 |
| marketing tokens | ~102,393 | 67,558 | −34,835 |
| process tokens | 19,786 | 19,786 | 0 |
| benchmarks+cassettes | 14,199 | 14,199 | 0 |
| **Total** | **~409,283** | **~353,284** | **−55,999 (−13.7%)** |

## Commits

1. `e45337f` — delete shipped design-app prototypes (−5 files, −34.4k tokens).
   `Prototype.html`/`prototype.jsx`, `prototype-mobile.html`/`mobile.jsx`,
   `mobile-html.html` were Claude-design scratch for UI that shipped in #186.
2. `8aa9873` — collapse `spec/test-tree.md` → `spec/test-conventions.md`
   (−15.5k tokens). The per-scenario tables duplicated every `.feature` file
   and all 333 ToDos were resolved (`NA`); kept the unique guidance.
3. `bb5011e` — drop dead `writeCsv` export and `TransformationSchema` alias
   (−350 tokens); `code-contract.md` updated to the real `writeRows` dispatch.
4. `2269105` — drop 5 dead step defs (zero matching scenario lines), share
   `webController`/`webCtx` helpers once in `web-file-port.ts` (−54 lines).
5. `3718578` — merge 8 copies of the Playwright demo harness into
   `src/tests/demo-harness.ts` (−665 net lines). Packages keep only their
   steps plus real variations (voice-input fake-media args, file-io URL
   fixtures).

## Remaining ideas (not done — why)

- **`marketing/claude-design-app/` canvas (~32k tokens)** — the biggest pool
  left: `components.jsx` (14.4k) + `design-canvas.jsx` (9k) + `app.jsx` (8k)
  hand-mirror ui-kit/the app in scratch JSX. Its own README says primitives
  are canonical in code and the published ui-kit demo is the design-review
  surface, so the boards largely duplicate it — but the README also calls the
  dir "the canonical home for the running app's visual design", so deleting it
  is the owner's call, not an agent's.
- **`src/packages/web/e2e/` (~4k tokens)** — not wired into any CI workflow,
  but documented in README.md:162 as a deliberate manual layer. Either wire it
  into CI or delete it; owner's call.
- **CLI undo/redo journal → headless `SpecJournal` (~40 lines)** — same
  concept, but the CLI's `:history` keeps orphaned undone entries after a
  fork while `SpecJournal.record()` drops them; merging changes observable
  REPL output for a ~300-token gain. Skipped as bad risk/reward.
- **`onnxruntime-web` dependency (voice-input)** — never imported; only a CDN
  version string references it. Might satisfy a `@ricky0123/vad-web` peer
  requirement — verify before removing.
- **`marketing/video/` (~11k)** — the mp4s' regeneration pipeline
  (plan, timeline, capture/encode/tts scripts); kept as the source of a
  committed artifact.
- **`process/journal/` (~16.7k)** — historical by policy ("read, don't
  rewrite"); untouched.
- Micro: `ExprSchema`/`CellSample`/`RequestDebugTurn` exports are only used
  internally (unnecessary `export` keywords, not dead code).
