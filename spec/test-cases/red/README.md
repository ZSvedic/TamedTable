# Red bug inventory

This directory (plus `src/tests/red/` and the `*.red.test.*` files inside packages) is the bug inventory from the 2026-07-29 hunt: every test here fails **by design**, each documenting one open defect, with a failure message that leads with the finding ID and the spec line it contradicts. It owns no fixes — when a bug is fixed its red test turns green and moves into the regular suite. Run the Gherkin half with `cd src && bun run test:red` (26 scenarios) and the unit half with `bun run test:red:unit` (61 tests); the green suite excludes both (cucumber profiles skip `@red`, bunfig `pathIgnorePatterns` skips `.red.test`).

Headline: **75 findings across 11 areas — 1 critical, 33 major, 41 minor.** Severity calibration: a feature dead in the deployed app = critical; work or data silently lost or silently wrong = major; a wrong label or message = minor.

## Browser-hunt harness (sibling inventory)

The browser hunt (PR #261) keeps its Playwright-driven findings in
`src/packages/web/e2e/red/<area>.e2e.ts`, run by `bun run test:e2e:red` from
`src/packages/web/`. Its three findings (TT-R01..03, missed re-renders) are
fixed and moved into the green e2e suite (`journeys.e2e.ts`); that half of the
inventory is empty. The table below is the hunt-audit inventory.

## The table

Plain `behavior.md` / `code-contract.md` = files in `spec/`; package specs and code paths are relative to `spec/packages/` and `src/packages/`. Unit tests live in `src/tests/red/` unless prefixed with a package name.

| ID | Severity | Symptom (one line) | Test | Cause | Spec |
|---|---|---|---|---|---|
| RED-DATA-1 | critical | One leading blank line in a CSV loads as columns `[""]`; the grid shows nothing and `:save x.csv` writes only newlines — total silent data loss (a JSONL save keeps the data) | `red-data.red.test.ts` | file-io/codecs/csv.ts:23 | file-io/formats/csv.md:13-17 |
| RED-WEB-3 | major | Where the browser allows reading storage but not writing it, the diagnostics log records nothing — errors vanish exactly where reporting matters | `red-web.feature` | web/src/controller-diagnostics.ts:348-369 | behavior.md:1333-1335 |
| RED-WEB-4 | major | Switching provider while a request commits orphans the old engine: chat claims the executed step, the table never shows it | `red-web.feature` | web/src/controller-engine.ts:409 | behavior.md:1058-1060 |
| RED-MC-2 | major | A stored config with an unknown provider makes `createWebController` throw at boot — white screen until site data is cleared (latent; precedent is pr-preview/production build skew) | `model-config/red-findings.red.test.ts` | model-config/index.ts:175, :79 | model-config/behavior.md:108-110 |
| RED-MC-3 | major | Merely loading the model-config demo rewrites the stored config blob and silently resets the persisted `alwaysRunAll: true` to `false` | `demo-config.red.test.ts` | model-config/demo.tsx:35-48 | model-config/behavior.md:278-281 |
| RED-FIO-1 | major | An extension-less URL served as `text/csv` cannot load — the Content-Type fallback the spec promises never happens | `red-fio.feature` | file-io/index.ts:122 | behavior.md:968-970 |
| RED-FIO-2 | major | Typed Parquet (DATE/TIMESTAMP/DECIMAL) loads as DuckDB wrapper objects; every save then crashes on BigInt (Node engine; the browser shim is fine) | `file-io/red-findings.red.test.ts` | file-io/codecs/values.ts:9-14 | file-io/formats/parquet.md:29-33 |
| RED-FIO-3 | major | A valid CSV with a quoted newline in the header is refused as "has no header row" — including files TamedTable itself saved | `file-io/red-findings.red.test.ts` | file-io/codecs/csv.ts:23 | file-io/formats/csv.md:12-14 |
| RED-FIO-4 | major | A value ending in `\r` silently loses the CR on the app's own save→load round trip (and bare CR is emitted unquoted, against RFC 4180) | `file-io/red-findings.red.test.ts` | file-io/codecs/csv.ts:32 | behavior.md:605-607 |
| RED-DATA-2 | major | A row missing a `toString` key saves as native function source; a select of `constructor` fabricates cell values — the `in` operator walks the prototype chain | `red-data.red.test.ts` | file-io/codecs/csv.ts:29, jsonl.ts:42, headless/engine.ts:81 | file-io/formats/csv.md:31; behavior.md:601-602 |
| RED-DATA-3 | major | A mutate targeting a column named `__proto__` is silently dropped; a `__proto__` pivot on-value becomes the output rows' prototype | `red-data.red.test.ts` | headless/engine.ts:93-95, :282 | unspecified |
| RED-DATA-5 | major | A multi-column mutate with an array-returning `{js}` body silently writes `undefined` into every target cell | `red-data.red.test.ts` | headless/engine.ts:94-95 | behavior.md:678-679 |
| RED-CORE-1 | major | Mixed numeric/text sort uses a non-transitive comparator — arbitrary order, wrong "top N by X" saved to disk | `headless/red-core.red.test.ts` | headless/index.ts:1301-1318 | behavior.md:1882-1885 |
| RED-CORE-2 | major | Join's collision rename can hit a real `<name>_2` right column, and the collision set comes from the first left row only — right or left values silently lost | `headless/red-core.red.test.ts` | headless/engine.ts:323-332 | behavior.md:649-651 |
| RED-CORE-3 | major | Undo of an unrelated later step replays the join and re-reads the right table from disk — throws if the file is gone | `headless/red-core.red.test.ts` | headless/index.ts:1210-1226; engine.ts:315-320 | behavior.md:653-655 |
| RED-CORE-4 | major | `{sql}` `try_strptime` commits DuckDB wrapper objects; every save format then crashes on BigInt (borderline critical — recovery guidance steers the model to these functions) | `headless/red-core.red.test.ts` | headless/sql.ts:20-25 | code-contract.md:675-704 |
| RED-CORE-5 | major | Pivot/unpivot/group outputs named like an index/id/by column overwrite it — row identity silently destroyed (three variants: 5a/5b/5c) | `headless/red-core.red.test.ts` | headless/engine.ts:276-299, :151-166 | behavior.md:733-746, :616-620 |
| RED-HL-1 | major | The no-op guard compares the model's stripped view against the stamped spec: a do-nothing echo commits as success, and a whole-array replace restamps untouched steps with the new request's query | `headless/red-hl.red.test.ts` | headless/index.ts:509, :527-541 | behavior.md:136; code-contract.md:80-82 |
| RED-HL-2 | major | Aborting mid model call (the common Stop timing) escapes as raw `AbortError` instead of `Runner: cancelled` — web offers a bug report to the user who pressed Stop | `headless/red-hl.red.test.ts` | headless/index.ts:1037, :981-991 | code-contract.md:131-134 |
| RED-HL-4 | major | Validate/ghost guards read the first row's keys, not the source columns — a valid request on ordinary sparse JSONL burns the whole recovery budget and dies | `headless/red-hl.red.test.ts` | headless/index.ts:1058-1060 | code-contract.md:184-186 |
| RED-HL-7 | major | `{llm}` sort keys and group aggregates skip the 20-per-batch machinery and send the whole table in one call — context blowup at real sizes (7a/7b) | `headless/red-hl.red.test.ts` | headless/index.ts:1283, :1349-1353 | behavior.md:166-170, :1874-1876 |
| RED-CLI-1 | major | In a real terminal Ctrl-C never cancels the running request — readline eats the keypress, closes, and the REPL session dies (borderline critical) | `cli-sigint.red.test.ts` | cli/index.ts:203-204 | behavior.md:485-486 |
| RED-CLI-2 | major | `:load`/`:save` reject `.parquet`/`.arrow` though the codec registry and #FormatOut support all four formats | `red-cli.feature` | cli/session.ts:570-587 | behavior.md:594-598 |
| RED-CLI-4 | major | `:undo` restores a whole-spec snapshot, silently reverting a later `:reorder` it never mentions | `red-cli.feature` | cli/session.ts:356, :374 | behavior.md:359-362 |
| RED-TUT-1 | major | A tour's staged lookup file survives tour exit — the user's own join naming the same file is silently satisfied with the tour's bundled rows, no lookup dialog | `red-tut.feature` | web/src/controller-engine.ts:74, :174-176 | behavior.md:1740-1742 |
| RED-VOICE-1 | major | Releasing the mic during the permission prompt is lost — the mic goes hot with nobody holding it, and 30 s of room audio auto-sends and mutates the table | `red-voice.feature` | web/src/controller-voice.ts:52-68 | behavior.md:1589 |
| RED-VOICE-2 | major | A provider switch or key removal mid-recording unmounts every control but leaves the mic live; the keyless turn still sends via the placeholder key | `red-voice.feature` | web/src/controller-config.ts (no teardown); controller-voice.ts:229-249 | behavior.md:1576-1583, :1638 |
| RED-VOICE-5 | major | Double-clicking the waveform during the VAD load opens two listening sessions; stop releases only one — the first holds the mic until the tab dies, every utterance sent twice | `red-voice.red.test.ts` | web/src/controller-voice.ts:198-212 | behavior.md:1620-1623, :1638 |
| RED-VOICE-7 | major | The chat Stop button is a no-op for a mic voice turn — the turn runs to completion, costs, and applies anyway | `red-voice.feature` | web/src/controller-engine.ts:413-415 | behavior.md:905-907 |
| RED-UI-1 | major | Enter that confirms an IME conversion sends/commits/applies/submits half-composed text at four sites: chat draft, cell editor, column filter, URL dialog | `chat-panel/ime-enter.red.test.tsx`, `table-view/ime-enter.red.test.tsx`, `toolbar/ime-enter.red.test.tsx` | ChatPanel.tsx:698-703; TableView.tsx:578-585, :793-796; OpenUrlDialog.tsx:57-65 | chat-panel/behavior.md:90; table-view/behavior.md:51 |
| RED-LAZY-1 | major | Page-open after a deterministic sort evaluates the wrong rows — 58 paid cells are not on the opened page, which never fills | `red-lazy.feature` | web/src/controller-lazy.ts:269-275 | behavior.md:1390-1398 |
| RED-LAZY-2 | major | `{llm}` split results are wiped by paging (re-billed on every pass) and lost to redo — the split never touches the cell cache | `red-lazy.feature` | headless/index.ts:1401-1433 | behavior.md:1390-1396, :1408-1410 |
| RED-LAZY-5 | major | A replace patch introducing an AI-reading step bypasses the dependency confirmation and silently deletes pending rows (146 of 246 gone) | `red-lazy.feature` | web/src/controller-lazy.ts:646-650 | behavior.md:1477-1481 |
| RED-LAZY-6 | major | An `{llm}` sort runs all 246 cell prompts eagerly with no gate or estimate (Simple mode gates the same request), and group `{*}` prompts serialize the `__ttPending` sentinel as data | `red-lazy.feature` | headless/index.ts:1283, :1343-1353; controller-lazy.ts:635 | behavior.md:1361-1363, :1452-1456 |
| RED-WEB-1 | minor | A flow replay's reply prints 12 numbered lines — no 7-line cap, no "… and N more" overflow | `red-web.feature` | web/src/controller-files.ts:140 | behavior.md:1126-1131 |
| RED-WEB-2 | minor | An unclassified mid-run flow failure is an app error but its reply never carries the Report bug action | `red-web.feature` | web/src/controller-files.ts:138-154 | behavior.md:1091-1097 |
| RED-WEB-5 | minor | Safari ("Load failed") and Firefox network failures are shown raw and marked reportable instead of "Network error. Could not reach the … API." | `red-web.feature` | web/src/controller-messages.ts:90 | behavior.md:1080-1081 |
| RED-WEB-6 | minor | The column-sort indicator stays active after a committed cell edit but the edited row is never folded back into order | `red-web.feature` | web/src/controller-view.ts:149-152 | behavior.md:1549-1552 |
| RED-MC-1 | minor | `TAMEDTABLE_MODEL=''` (empty env var) is kept as the resolved model instead of meaning unset, unlike the key vars in the same function | `model-config/red-findings.red.test.ts` | model-config/index.ts:179 | code-contract.md:332; model-config/behavior.md:111 |
| RED-MC-4 | minor | A model id belonging to no provider is kept under anthropic instead of coerced to its default (spec gap — the code's fallback is documented intent; a fix may be a spec sentence) | `model-config/red-findings.red.test.ts` | model-config/index.ts:96 | model-config/behavior.md:113, :134-144 |
| RED-FIO-5 | minor | A JSONL `null` line throws a raw TypeError naming neither file nor line; `[1,2]` silently loads as a garbage row | `file-io/red-findings.red.test.ts` | file-io/codecs/jsonl.ts:19 | file-io/formats/jsonl.md:10-14 |
| RED-FIO-6 | minor | A `__proto__` column vanishes from JSONL serialize, and CSV parse swallows a `__proto__` cell | `file-io/red-findings.red.test.ts` | file-io/codecs/jsonl.ts:42; csv.ts:22 | file-io/formats/jsonl.md:22-28 |
| RED-FIO-7 | minor | CSV export writes column ids in the header, ignoring `label` | `red-fio.feature` | headless/index.ts:953; web/src/controller-files.ts:467 | behavior.md:601-602 |
| RED-FIO-8 | minor | Saving a zero-column table as Parquet surfaces a raw DuckDB parser error | `file-io/red-findings.red.test.ts` | file-io/codecs/parquet-engine.ts:75-76 | unspecified |
| RED-DATA-4 | minor | One NUL byte in any cell makes every `{sql}` step throw a parser error blamed on the fragment — the recovery loop rewrites the wrong thing | `red-data.red.test.ts` | headless/sql.ts:89-93 | code-contract.md:686-700 |
| RED-DATA-6 | minor | A mutate writing `undefined` saves as a missing JSONL key but an empty CSV cell — the two formats describe different schemas for one table | `red-data.red.test.ts` | file-io/codecs/jsonl.ts:42 | file-io/formats/jsonl.md:24-26 |
| RED-CORE-6 | minor | The validate threshold error prints the false inequality "20% > 20%" — both sides rounded before comparison | `headless/red-core.red.test.ts` | headless/engine.ts:116-118 | behavior.md:695-697 |
| RED-CORE-7 | minor | The OpenRouter cell-model fallback is an un-catalogued model instead of the contract's `cohere/north-mini-code:free` (locked in by a green unit test) | `headless/red-core.red.test.ts` | headless/index.ts:274 | code-contract.md:333 |
| RED-HL-3 | minor | `onDebug` never fires when the patch-turn model call itself fails (HTTP error, text-only reply) | `headless/red-hl.red.test.ts` | headless/index.ts:1037 (fires only at :1125, :1138) | code-contract.md:305-307 |
| RED-HL-5 | minor | JS group aggregates bind only `rows` — the contracted `(rows, key, allGroups)` signature throws `key is not defined` on both compile paths | `headless/red-hl.red.test.ts` | headless/engine.ts:157; index.ts:1368 | code-contract.md:614-616 |
| RED-HL-6 | minor | Legitimate cell replies `"NULL"`/`"Null"` are destroyed to JSON null — the parser lowercases before comparing | `headless/red-hl.red.test.ts` | headless/index.ts:1591, :1686 | behavior.md:173-174 |
| RED-HL-8 | minor | `TAMEDTABLE_RPM=0` (or garbage) makes every request hang forever in a 1 ms busy-spin instead of falling back or erroring | `headless/red-hl.red.test.ts` | headless/index.ts:287, :433-454 | code-contract.md:334 |
| RED-HL-9 | minor | A turn appending a duplicate of an existing identical step commits with zero provenance — the Set-based diff is blind to multiplicity | `headless/red-hl.red.test.ts` | headless/index.ts:527-541 | code-contract.md:73-80 |
| RED-CLI-3 | minor | A mistyped colon command (`:frobnicate`) is forwarded to the model as a natural-language request instead of failing locally | `red-cli.feature` | cli/session.ts:677-688; index.ts:211-216 | behavior.md:353-355 |
| RED-CLI-5 | minor | `:reorder` resets the viewport cursor to (0,0) though it is not one of the four spec'd reset events | `red-cli.feature` | cli/session.ts:485 | behavior.md:341-344 |
| RED-CLI-6 | minor | A bare `:show` reprint drops the `:find` highlight — the highlight lives one reprint, not until the next viewport/state change | `red-cli.feature` | cli/session.ts:306, :389 | behavior.md:398-399 |
| RED-CLI-7 | minor | The "...N more rows" truncation marker row breaks column alignment — widths are computed before the marker is injected | `cli-render-marker.red.test.ts` | cli/render.ts:66-96 | code-contract.md:509-512 |
| RED-CLI-8 | minor | The 20-line debug-block cap discards the tail — the mandatory model/token/time summary line is the tail | `cli-debug-block.red.test.ts` | cli/session.ts:146-149 | behavior.md:272-274 |
| RED-TUT-2 | minor | A tour whose final query goes off-script still earns the permanent green checkmark — `markCompleted` runs before the unawaited last request settles | `red-tut.feature` | web/src/controller-tutorial.ts:489-500, :223-235 | behavior.md:1670-1672 |
| RED-TUT-3 | minor | Esc cancels the tour but not the executing step — the cancelled load finishes and puts the sample onto a live engine after the cancel | `red-tut.feature` | web/src/controller-tutorial.ts:198-235, :458-538 | behavior.md:1698-1699; code-contract.md:1525 |
| RED-TUT-4 | minor | `parseTours` mishandles feature-level tags, stacked tag lines, and `"""json` docstrings — valid tours silently vanish from the manifest while CI stays green (4a/4b/4c) | `gherkin-tour/parse-edges.red.test.ts` | gherkin-tour/index.ts:118-147 | code-contract.md:1416-1417; gherkin-tour/behavior.md:91-92 |
| RED-TUT-5 | minor | The terminal popover copy drifted from the sentence three canonical docs pin (`Voilà, "<name>" is done.`) | `web/tutorial-copy.red.test.ts` | web TutorialPanel.tsx:53 | behavior.md:1721; code-contract.md:1546 |
| RED-TUT-6 | minor | A zero-step manifest entry reports a played tour that never ran — `openTutorialFromLink` returns true, so the URL watcher installs for nothing | `red-tut.feature` | web/src/controller-tutorial.ts:133-147 | code-contract.md:1536 |
| RED-VOICE-3 | minor | A continuous clip landing while a mic turn applies produces an error toast, an Error bubble, and a stranded placeholder bubble instead of being dropped | `red-voice.red.test.ts` | web/src/controller-voice.ts:230 | code-contract.md:1350-1351 |
| RED-VOICE-4 | minor | A microphone failure at release is toast-only — the chat keeps no trace of the failure the spec promises there | `red-voice.red.test.ts` | web/src/controller-voice.ts:97-103 | behavior.md:1606-1609 |
| RED-VOICE-6 | minor | The transcript of a declined patch relabels the previous, unrelated undo entry (and posts a success-style "Done." bubble for the dropped patch) | `red-voice.feature` | web/src/controller-voice.ts:140 | code-contract.md:1368-1369 |
| RED-UI-2 | minor | The prefill typing animation keeps typing after the user sends — the cleared draft silently refills, priming a duplicate request | `chat-panel/prefill-send.red.test.tsx` | ChatPanel.tsx:449-487 | chat-panel/behavior.md:94 |
| RED-UI-3 | minor | The "· running" header marker is missing while the first request streams (`requestCount` is still 0) | `chat-panel/running-marker.red.test.tsx` | ChatPanel.tsx:535-549 | chat-panel/behavior.md:53-54 |
| RED-UI-4 | minor | Ctrl/Cmd+C cell copy is dead with CapsLock on — the key comparison is case-sensitive | `table-view/copy-capslock.red.test.tsx` | TableView.tsx:153 | table-view/behavior.md:114-116 |
| RED-UI-5 | minor | The deployed table-view demo keys changed-cell marks by view slot — after edit + sort an untouched cell shows the mark and a false "was:" tooltip | `table-view/demo-changed-marks.red.test.tsx` | table-view/demo.tsx:113 | table-view/behavior.md:78-81 |
| RED-UI-6 | minor | `urlHref` rejects valid uppercase-scheme URLs (`HTTPS://…`) — the pre-filter regex lacks the `/i` flag | `table-view/url-href.red.test.ts` | table-view/index.ts:62 | table-view/behavior.md:118 |
| RED-LAZY-3 | minor | The run estimate prices `gpt-5.4-mini` (the OpenAI default cell model) at `gpt-5.4` rates — 3.3x too high, via prefix match | `red-lazy.red.test.ts` | web/src/controller-lazy.ts:237 | code-contract.md:1050-1053 |
| RED-LAZY-4 | minor | With the same model in both roles the estimate reads 0 tokens / $0 / 0 s after a real paid preview — cell usage is discarded by a model-id equality filter | `red-lazy.red.test.ts` | web/src/controller-lazy.ts:218-222 | behavior.md:1455-1459 |
| RED-LAZY-7 | minor | A Save whose gated (and paid) run finishes with failed rows is silently abandoned — no dialog, no toast, no chat message | `red-lazy.feature` | web/src/controller-files.ts:413 | behavior.md:1469-1471 |
| RED-LAZY-8 | minor | The estimate for a second AI column is ~3.5x inflated — token totals accumulate since load while the divisor counts only rows caught up with the current spec | `red-lazy.red.test.ts` | web/src/controller-lazy.ts:229-247 | code-contract.md:1049 |

## Critical and major findings

### Data edges

**RED-DATA-1 (critical).** A single blank line before the header — common in hand-edited files — loads without any error, but the header parse lacks `skip_empty_lines` while the row parse has it, so the spec's column list becomes `[""]` while rows key off the real header. The grid and REPL view (both keyed off `spec.columns`) show nothing, and a CSV save writes literally `\n\n\n`. A fix must align the two parses; note the JSONL codec appends off-spec keys, which is why a JSONL save survives — any fix should keep the formats consistent.

**RED-DATA-2.** Cell reads use `col in row ? row[col] : null` at three sites, and `in` walks the prototype chain: a row missing a `toString` key serializes `Object.prototype.toString`'s source, and selecting a `constructor` column fabricates values. Fix with `Object.hasOwn` at all three sites (csv, jsonl, applySelect) in one pass — fixing one leaves the others lying.

**RED-DATA-3.** Row accumulators are plain objects assigned by data-derived keys, so writing a column literally named `__proto__` hits the prototype setter: mutate output is silently dropped, and a pivot on-value of `__proto__` with an object cell becomes the prototype of every output row — `{js}` predicates then answer for keys no column carries. Fix wants `Object.create(null)` rows or `Object.defineProperty` at every data-keyed assignment (mutate, split, group, pivot, join), same family as RED-DATA-2.

**RED-DATA-5.** The spec sells multi-column mutate with an array-returning body as the idiom, but the multi-column branch indexes the result by column *name*; arrays have none, so every target cell is `undefined` and the request still reports success. A fix must map array results positionally onto `columns` while keeping the object-body path working.

### Core runner

**RED-CORE-1.** `applySortT` coerces each side with `asNumber`; when only one side coerces, both `<` and `>` are false via NaN, the comparator answers "equal", and a non-transitive comparator makes `Array.sort` output arbitrary order — including numbers sorted wrongly among themselves. All-string CSV data hides the bug; typed sources (JSONL, Parquet, `{sql}` outputs) hit it. A fix needs a total order over the number/string/null classes matching behavior.md:1882-1885.

**RED-CORE-2.** The join collision rename checks the target only against left columns, so right `code` → `code_2` silently collides with a genuine right `code_2`; and `leftCols` comes from the first left row's keys, so a sparse left column gets overwritten by the right table. Fix must probe both sides for the rename target and derive left columns from the spec, not row 0.

**RED-CORE-3.** Undo shrinks the step list, so the derived-prefix cache is unusable and the whole spec replays from source; `applyJoin` reads its right table from disk on every replay. If the file moved since, an undo of an *unrelated* step throws. Redo reuses the prefix cache and does not re-read — a fix should cache the right table (or its rows) with the committed step.

**RED-CORE-4.** `normalizeSqlValue` unwraps only top-level bigints; `DuckDBTimestampValue`/`DateValue`/`DecimalValue` wrappers pass through into committed rows, then every save format crashes on the BigInt inside — and the engine's own recovery guidance steers the model toward `try_cast`/`try_strptime`, the functions that produce them. Borderline critical: after such a commit every save path is dead. Same wrapper-leak pattern as RED-FIO-2 at a different site; both need fixing.

**RED-CORE-5.** `applyPivot` writes `out[onVal]` over `out[indexCol]`, `applyUnpivot` writes `r[namesTo]` over `r[idCol]`, and group aggregates write `out[aggCol]` over the by-column — in each case a data- or default-derived output name silently destroys the key that identifies the row. The schema already guards the static case (`pivot.on` not in `pivot.index`); a fix must extend that guard to data-driven and default-driven names, or rename on collision.

### Headless engine

**RED-HL-1.** The model edits a provenance-stripped view, but the no-op guard compares the model's patch against the *stamped* spec, so an echo of the current spec always differs and commits as a successful turn; `stampQueries` then diffs by JSON identity and restamps untouched steps with the new request's text. Fix: compare stripped-to-stripped, and stamp by multiset diff (also RED-HL-9's fix).

**RED-HL-2.** The only abort→`Runner: cancelled` translation sits in `request()`'s replay catch; the patch-turn `callLlm` await and the whole `setSpec` path are outside it, so aborting during the model call — most of a request's wall-clock — leaks the SDK's `AbortError`. Web's `describeError` then classifies it reportable: the user who pressed Stop is offered a bug report. Fix: translate at both call sites (the contract names both).

**RED-HL-4.** `checkValidateColumnOrder` and the ghost-column guard take `Object.keys(sourceRows[0])` as the source columns; JSONL columns are the union of all rows' keys, so a valid validate referencing a column absent from row 0 is rejected three times and the request dies with "recovery budget exhausted" — paid calls burnt on a correct patch. Fix: feed the guards the loaded spec's column list (also fixes the 0-row skip).

**RED-HL-7.** Only `applyMutateLlm` has the 20-per-batch loop; `evalSortKey` hands the entire table to one `evalLlmBatch` call and group aggregates push one prompt per group into a single call, so a real-sized table blows the context window or fails arity, then storms the fallback. Fix: route sort keys and group prompts through the same batching machinery the spec says they share.

### Web controller

**RED-WEB-3.** The diagnostics log appends events to a localStorage-backed buffer; when the browser allows reads but throws on writes (private modes, full quotas), the write throws away the appended event and nothing is kept in memory, so the log stays empty exactly in the environments most likely to need a bug report. Fix: keep the in-memory buffer authoritative and treat persistence as best-effort.

**RED-WEB-4.** A provider switch mid-run rebuilds the engine while the old engine finishes committing: chat reports the executed step but the rebuilt engine's table never had it — thread and table permanently disagree. Fix must either block the switch while a run commits, or transfer/discard the in-flight commit atomically with the rebuild.

### Model-config

**RED-MC-2.** `resolveConfig` accepts `stored.provider` unvalidated and `defaultModel` non-null-asserts a catalogue hit, so an unknown stored provider throws; `main.tsx` builds the controller at module scope, so the throw is a white screen recoverable only by clearing site data. Latent — nothing writes an unknown provider today; the real precedent is same-origin build skew (pr-preview vs production, the PR #239 openrouter window). Fix: fall back to gemini per rule 5 instead of throwing.

**RED-MC-3.** The demo's mount effect resolves and *writes back* the stored config on load with no user interaction; fields the demo doesn't thread (`alwaysRunAll`) get resolveConfig's defaults, so a persisted `true` is reset to `false` and the blob is rewritten. Fix: write only on change, and merge rather than replace the stored blob. The fresh-visit `anthropic` default is pinned by a green smoke test and deliberately not contested here.

### File-io

**RED-FIO-1.** Format detection only looks at the path extension; the spec's Content-Type fallback was never wired (`sampleNameFromUrl` keeps a bare segment name and the consumer drops the detected format). An extension-less API URL served as `text/csv` fails with "unknown file type". Fix needs a way to hand `parseTable` a pre-detected format.

**RED-FIO-2.** On the Node engine, `getRowObjects()` returns DuckDB wrapper objects for DATE/TIMESTAMP/DECIMAL columns and `normalizeCell` unwraps only plain bigints — the loaded table holds objects with BigInts inside, and every save crashes in `JSON.stringify`. Browser loads use the hyparquet shim and are unaffected. Same family as RED-CORE-4; fix `normalizeCell` to unwrap the wrapper types.

**RED-FIO-3.** The header is recovered by re-parsing with `to_line: 1`, which counts physical lines: a quoted newline in a header field truncates the record, columns come back empty, and the "has no header row" guard fires on a valid RFC 4180 file — including files TamedTable itself wrote. Fix: take the first *record* from the main parse instead of re-parsing one line.

**RED-FIO-4.** `csv-stringify` quotes only on delimiter/quote/`\n`, so a lone `\r` is emitted unquoted (RFC-non-conformant), and on re-parse the record-delimiter auto-detection eats a trailing `\r` as part of a CRLF — the app's own save→load silently drops it. Narrow trigger (values ending in CR), but it is silent data mutation; fix by forcing quotes on CR.

### CLI / REPL

**RED-CLI-1.** Cancellation is wired only as `process.on('SIGINT')`, but interactive readline runs stdin in raw mode: Ctrl-C never becomes a SIGINT, readline sees the keypress, closes the interface, and the `for await` line loop — the whole session — ends. The advertised cancel is 100 % dead in a real terminal and takes the session with it (borderline critical); batch mode is fine. Fix: register a `SIGINT` listener on the readline interface itself and route it to the abort controller.

**RED-CLI-2.** `:load` and `:save` gate on hardcoded `.csv`/`.jsonl` extension checks that predate the codec registry, so the four-format promise (#FormatOut) is dead in the REPL. Fix: delegate to the registry the way `loadInput`/`exportAs` already do. Note the spec self-contradicts on the `:save` half (see doc-only list) — the red test pins the unambiguous `:load` half.

**RED-CLI-4.** The undo journal stores whole-spec snapshots per NL turn and restores them wholesale, clobbering any non-journaled spec change (`:reorder`) made since the snapshot — the undo message names only the NL turn it reversed. Fix: either journal `:reorder` too, or make undo re-apply non-journaled changes on top of the restored snapshot.

### Tutorial / tours

**RED-TUT-1.** Tours stage their lookup tables in `stagedLookups`, which deliberately survives engine rebuilds and `reset()` — and `cancelTutorial`/`finishTutorial` never clear it. After the join tour, the user's own request naming `join-country-codes.csv` is silently satisfied by the tour's bundled fixture instead of raising the #LookupJoin dialog. Fix: clear tour-staged lookups on tour end, without breaking mid-tour rebuilds.

### Voice

**RED-VOICE-1.** `startVoice` awaits `getUserMedia` before flipping the state machine to `recording`, so a release during the permission prompt hits the `idle` guard and is lost; when the grant lands, the mic lights with nobody holding the button and the 30 s auto-stop sends ambient audio as a turn that mutates the table — on the first-use path. Fix: represent the pending-start state so release/latch during the await tears the session down.

**RED-VOICE-2.** Nothing ties the voice gate to the state machine: switching provider or deleting the key unmounts the MicButton (and its Escape listener) while the recording or VAD session stays live, and the queued turn still sends via the engine's placeholder-key fallback. Fix: `setConfig`/`clickProviderCard` must call `cancelVoice()`/`stopContinuous()` whenever the gate closes.

**RED-VOICE-5.** `startContinuous` only sets `listening` after the seconds-long VAD download resolves, so a second click during the load passes the `idle` check and starts a second session; `browser-vad` keeps a single handle, so stop destroys only the newer one — the first holds the microphone until the tab dies and every utterance sends twice. Fix: a `starting` state plus destroying any existing handle before overwriting it.

**RED-VOICE-7.** The mic path always passes its own abort signal, and `cancelRequest` only aborts the engine-owned controller — so the rendered Stop button silently does nothing for a mic voice turn, which completes, costs, and applies. The identical continuous-voice turn passes no signal and *is* cancellable. Fix: register the voice signal (or chain it) so `cancelActive()` reaches it.

### UI packages

**RED-UI-1.** Four Enter handlers (chat send, cell-edit commit, column filter, URL dialog) never check `isComposing`, so the Enter that confirms an IME conversion fires the action with half-composed text — sent requests, committed cells, applied filters, submitted URLs for every CJK user. Fix: guard all four handlers on `e.nativeEvent.isComposing` (one shared helper beats four copies).

### Lazy AI execution

**RED-LAZY-1.** The page-open pass hands *derived-row* indices to the engine's `cellFilter`, whose contract wants *step-input* indices; after any deterministic step that reorders or filters (a sort), the pass evaluates and bills the wrong rows and the opened page never fills. Fix requires an index-mapping layer between view rows and step-input rows — none exists.

**RED-LAZY-2.** `applySplitLlm` neither reads nor writes the cell cache, so paging away and back re-bills every evaluated split cell, and redo-after-undo replays with an empty cache — paid results destroyed. Fix: wire split through the same cache keying mutate uses.

**RED-LAZY-5.** The dependency gate diffs only steps appended beyond the previous spec's length, and the patch prompt explicitly licenses replace/remove patches — a replace introducing an AI-reading `{js}` filter commits ungated and deletes the rows whose AI cells are still pending. Fix: diff by content, not by length.

**RED-LAZY-6.** In lazy mode an `{llm}` sort or group runs table-wide immediately with no gate or estimate (Simple mode gates the identical request via `specHasLlmCell`, proving the omission), and group `{*}` prompts serialize the `{"__ttPending":true}` sentinel to the model as if it were data. Fix: gate sort/group like mutate, and either catch up pending cells first or exclude them from prompts.

## Duplicates and cross-references

- RED-CORE-1 was found independently twice (core-runner F1, data-edges F6); landed once. RED-CORE-2 absorbs data-edges F5's sparse-left-column half; RED-CORE-5 absorbs data-edges F7 (pivot) and F14 (unpivot); RED-CORE-6 = data-edges F8.
- RED-CORE-4 is related-to RED-FIO-2: the same DuckDB wrapper-leak pattern at two sites (`headless/sql.ts` `normalizeSqlValue` vs `file-io/codecs/values.ts` `normalizeCell`). Fixing one does not fix the other.
- RED-HL-4 and RED-HL-5 were also found by the core-runner finder (dups, landed once each). RED-HL-7 was found three times (headless, core-runner, lazy-exec); RED-LAZY-6 keeps only the lazy-specific angle (missing gate/estimate + sentinel leak), the engine half lives in RED-HL-7.
- RED-WEB-6 = lazy-exec's F9 (stale sort after commit); landed once, as RED-WEB-6.
- RED-FIO-3 also covers data-edges F1, which adds the own-output round-trip angle. RED-FIO-7 = data-edges F9. RED-DATA-2's parse halves partially overlap RED-FIO-6; the `in`-operator leak is RED-DATA-2's own.
- RED-MC-2 was also found by the reachability finder; RED-CLI-2 likewise (its two variants collapsed into the one scenario).
- Not landed on purpose: file-io F5 (whitespace round-trip — refuter-graded a spec design flaw, not a code bug), file-io F10 (killed: unreachable), headless F7 and F10 (weakened: spec-tension / unused option), data-edges F13 (weakened: spec-documented mechanism), web-controller S1 (near-unreachable).

## Doc-only discrepancies (no red test)

- code-contract.md:1234-1245 — `ModelChooserProps` declares `onSelectModel` (no such prop exists; behavior.md:220 forbids model selection) and the contract's `ResolvedConfig` omits `alwaysRunAll`.
- packages/model-config/behavior.md:36-47 shows `anthropicKey: null` after a provider switch (code and rule 7 keep keys), and :17 spreads `{...opts.config, ...readStoredConfig()}` — the code does the reverse, pinned by a green unit test. Fix the spec side.
- README.md:105 says the REPL debug block prints "after a failed request"; behavior.md:258-262 and the code print it after every request.
- behavior.md:415-418 and :451 still say `:save` takes ".jsonl or .csv", contradicting #FormatOut (behavior.md:594-598); RED-CLI-2 pins the `:load` half, the `:save` text needs the spec fix.
- code-contract.md:1524 (and :1543, :1546) document a `prevStep()` removed by the forward-only tour refactor.
- behavior.md:491 and :530 say `execute --output` must be `.jsonl`; the code follows #FormatOut (verified: `.csv` and `.parquet` outputs work).
- code-contract.md:475 says readline gets `terminal: stdin.isTTY === true`; the code requires stdin *and* stdout TTYs, pinned by a green unit test. Spec call needed on which side is right.

## Unreachable but real

Five mechanisms verified in code (some by out-of-band repro) that no test can make fail against a shipped artifact today.

- **Recovery-prompt error-text drift across JS engines.** A failing `{js}`/`{sql}` step puts the engine-worded error into the retry prompt, which is part of the cassette fingerprint; bun/JSC and node/V8 word the same error differently (proven: same expression, two fingerprints). Can't fail today because every committed tape replays on the engine family that recorded it and no shipped tour tape carries an engine-worded turn — it arms the first time a re-record ships one.
- **Fallback `pickOpen` never settles on cancel.** browser-fs.ts:42-58 listens only for `change`; cancelling the dialog fires `cancel` (or nothing), the promise never settles, and the dialog-reset `finally` never runs. Non-FSA browsers (Firefox/Safari) only — needs a real browser to observe.
- **`{sql}` per-row alignment trusts DuckDB insertion order.** sql.ts:146-160 zips `SELECT (expr) FROM t` results positionally onto rows with `threads=4` and no ORDER BY; it holds only because `preserve_insertion_order` defaults to true. A version or setting drift would silently misalign every `{sql}` mutate/filter.
- **`blobToWavBytes` assumes `decodeAudioData` resamples to 16 kHz.** audio-wav.ts:26-27 relies on the OfflineAudioContext rate; Safari has historically returned the source's native rate, breaking the 16 kHz contract (payload ~3x larger, header stays self-consistent). Browser-only.
- **Deep-link tutorial rejection is unhandled.** main.tsx:73 calls `openTutorialFromLink(...)` with `.then` but no `.catch`; a failing feature fetch is an unhandled rejection at boot. Console-only today (boot continues), browser-only.
