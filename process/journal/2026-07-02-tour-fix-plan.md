# 2026-07-02 — Fix plan for every broken tour

Companion to [2026-07-02-tour-audit.md](2026-07-02-tour-audit.md). That entry says what is
broken; this one says how to fix it — grouped into six PR-sized workstreams, each meant to
become one `claude-implement` issue. Nothing here is implemented yet.

## Repair mechanics — what needs a re-record and what doesn't

A cassette entry is keyed by a fingerprint of the *request* (`SHA-256(method+url+body)`),
and the stored *response* is free to edit. What each request embeds decides the blast
radius of a change:

- The **spec-edit request** embeds the current spec (table basename + columns) and the
  query text — *not* the row data. Fixture *values* can change without touching it.
- A **per-cell batch request** embeds the rendered prompts, i.e. the `{llm}` template
  *and* the cell values. Changing either invalidates those entries.
- `bun run test:record` records only misses (7–9 min full run, live key, 40 RPM),
  so re-records are incremental. Editing `spec/prompt-app-edit.md` invalidates *every*
  spec-edit entry — batch all prompt changes into one record wave.

So there are three repair tiers, cheapest first:

1. **Hand-edit a response** — safe when nothing downstream embeds it: fixing garbled
   per-cell values, fixing a JS pred, reordering ops in a spec-edit patch (the per-cell
   prompts don't change). Verified by replay, no key needed.
2. **Fixture-value change + partial re-record** — invalidates only the per-cell entries
   whose prompts touch the changed values.
3. **Query / `{llm}` template / system-prompt change + record wave** — one live
   `test:record` run after all such changes merge.

## WS1 — Engine: numeric-aware sort compare

*Fixes:* "Sort by revenue, top 10" (98,750 ranked above 420,000) and "Sort the titles by
seniority" (CTO 4th of 5). Both cassettes are fine; the comparator at `#SortRows`
(`src/packages/headless/index.ts` ~1153) does raw `<`/`>` on strings.

1. `spec/code-contract.md` — sort semantics: when both key values coerce to finite
   numbers, compare numerically; otherwise compare as strings; nulls last.
2. `spec/test-cases/sort.feature` — add a headless scenario sorting a column of numeric
   strings (`"9" < "10"`), red first.
3. Implement in `applySortT` (coerce per pair or pre-pass per key column), green.
4. No cassette change — both tours come right immediately. Add goldens (WS2).

Also in this PR: grow `sales.csv` from 5 to ~12 rows so "top 10" visibly trims. Safe —
the recorded sort spec is the plain key `"Revenue"`, no per-cell calls, and the spec-edit
request doesn't embed rows, so **no re-record needed**.

## WS2 — Golden-row assertions for every tour

The root enabler of all 14 fails: `@tour` scenarios assert only `the spec has N
transformation(s)` + `no toast is shown`. The golden mechanism already exists and is used
by the deterministic tours (`filter.feature`: `And the expected output is "X.jsonl"` +
`Then compare with the expected output`) — LLM tours just never adopted it.

1. For each tour that is already correct today, add an `*-expected.jsonl` fixture and the
   two golden steps. Land immediately.
2. For each broken tour, its fix PR (WS1/3/4) adds the golden in the same PR — red
   before the fix, green after.
3. End state: a bad cassette or engine regression turns a tour red in CI instead of
   shipping to the homepage.

## WS3 — Cassette hand-repairs (no re-record, no key)

All response-only edits, each verified by replaying the tour headlessly and locked by a
WS2 golden:

- **City ↔ country** (`validate.json`): in the recorded `apply_spec_patch`, move the
  `mutate` that creates `_city_country_match` *before* the `validate` that reads it. The
  per-cell prompts are unchanged, so their entries still hit. After the swap only
  Paris/Japan is flagged.
- **Garbled phones** (`clean-up.json`, `multilingual.json`, `loadsave.json`): fix the
  per-cell response arrays — letter `l`→`1` and restore dropped digits (audit lists the
  exact rows: 04/08/13/14/17/19/20 per tour variant). Terminal responses; nothing
  downstream fingerprints them.
- **Impossible birth date** (`validate.json`): replace the recorded JS pred's
  `isNaN(Date.parse(...))` guard with a round-trip check (parse, then compare day+month
  back) so `2024-02-30` — which V8 rolls over to Mar 01 — is flagged alongside 1873.
- **Fake emails / wrong prices** (`validate.json`) — *interim* hand-fix while WS4 does
  it properly: extend the email pred with a small famous-name rule so
  `bill.gates@microsoft.com` flags, and replace the price range check with a
  column-median rule (flag `p < median/3`: catches 4.20 and 3.10, keeps 19.99/42.00).

## WS4 — Fixture changes, prompt steering, one record wave

These need a live key; merge the content changes first, then run **one**
`bun run test:record`, then hand-verify + add goldens.

- **Fix the capitalization of names** — two fixes: (a) put miscapitalized names into
  `customers-input.csv` (e.g. `mcdonald`, `van der berg`, `o'neil` — the names the
  illustration and fnote already promise); (b) the recorded edit must mutate each name
  column with its own prompt instead of one full-name prompt over
  `["FirstName","LastName"]`. Add a `SYSTEM_PROMPT` few-shot in
  `spec/prompt-app-edit.md` showing the per-column shape, then re-record. Changed name
  values also invalidate the gender tour's per-cell entries — re-recorded in the same
  wave; keep the CJK/Arabic rows and assert via golden that they survive untouched.
- **Split the address into its parts** — the recorded comma-`split` can never fill
  State/Zip from one-comma addresses. The honest demo ("structures whatever mess they
  typed") is LLM extraction: steer with a few-shot (address → add 4 columns + one `{llm}`
  mutate per part, null when absent), re-record `enrich.json`.
- **Extract the amount and date from the memo** — add years to `memos.csv` texts so the
  ISO dates stop fabricating 2024; while there, decide row 3 ("Invoice 120"): either the
  prompt says invoice numbers are not amounts (keep null, fix the SVG's fake `$120`), or
  the memo gains a real amount. Re-records enrich per-cell entries (same wave).
- **Fake emails, done right** — "flag emails that look fake" is semantic; the pitch is
  AI judgment, not a regex. Steer to a per-cell `{llm}` validate via few-shot, re-record.
  The homepage's `bill.gates@microsoft.com` case then works on model judgment.
- **Wrong prices, done right** — same: few-shot toward `{llm}` plausibility ("does this
  price look mistyped given the item?"), re-record. The desk-lamp missing zero is
  exactly what an LLM cell catches and a range check can't.
- **Flag rows with empty Phone** — give the tour a purpose: new small fixture
  `customers-missing-phone.csv` (copy with 3 phones blanked) and point the scenario's
  load step at it. New table name → new spec-edit fingerprint → recorded in the wave
  (pred is JS, no per-cell cost).
- **Birth dates 03/04 claim** — add one genuinely US/EU-ambiguous date (e.g.
  `03/04/1990` on a US-country row) to `customers-input.csv` so the homepage's flagship
  claim is actually exercised; invalidates the DOB per-cell entries (clean-up + voice),
  re-recorded in the wave.
- **Prompt-order guard** — add a `SYSTEM_PROMPT` rule/few-shot: a `validate` that reads
  a computed column must come *after* the `mutate` that creates it (the durable fix
  behind WS3's city-country hand-repair).

## WS5 — Marketing alignment (captions + SVGs, no code)

Docs-only batch; each item names its file:

- `marketing/web/index.html`: join caption "add each order's customer name" → describe
  the actual country-code join (or see WS6); pivot caption "pivot months into columns" →
  quarters; filter and dedupe captions → the scenarios' verbatim queries; sentiment fnote
  "Positive, neutral, or negative" → numeric score wording; seniority fnote "junior →
  senior" → senior-first.
- `marketing/illustrations/`: `Deterministic-join.svg` — redraw as the customers ⇄
  country-codes join (real fixture rows); `Deterministic-pivot.svg` — Region/Quarter
  data with the Region index column; `Deterministic-sort-top.svg` — use the real
  `sales.csv` ranking; `Classify-sentiment.svg` — numeric scores;
  `Classify-seniority.svg` — depict reordering, not a level column;
  `CleanUp-country-names.svg` — drop the self-contradictory `usa→USA` row;
  `Language-detect-language.svg` — real fixture row 2 + full language names;
  `Language-multilingual.svg` — real fixture rows and bare-E.164 output;
  `Language-voice.svg` — chip text "normalize DOB column";
  `EnrichExtract-amount-date.svg` — row 3 per the WS4 memo decision;
  `EnrichExtract-industry.svg` — "Healthcare"/"Finance" as replayed. The audit's
  standard: where the fixture is small, draw the real rows.
- The five `LoadSaveReuse-*.svg` + captions: redraw around what the tour actually does
  (load + normalize phones on the real fixture; correct step history and row counts).
  The five homepage items keep deep-linking the one combined tour.

## WS6 — Optional follow-ups

- **Join right-column projection** — the join output's redundant `Country_2` comes from
  collision-renaming every right column. Clean fix is an optional `select` list on the
  join transformation (schema + prompt grammar + engine), spec-first. Low priority.
- **Extend the loadsave tour** with real `:save` / `:save-flow` / `:save-py` / `:undo`
  steps — needs new tour actions in the `gherkin-tour` parser + driver + panel spec, so
  it's its own feature, not a repair. Until then WS5's honest SVGs carry those items.
- **Prune stale cassette entries** — `classify.json` carries a dead Male/Female prompt
  variant and fenced-vs-plain duplicates; delete-and-re-record a feature's cassette when
  it is already being re-recorded for other reasons.
- **Keep the audit harness** — the throwaway replay-dump script from the audit is worth
  keeping as a dev tool (`src/tests/` or a small package) so "replay every tour and diff
  the tables" stays a one-command check.

## Sequencing

1. **WS1** (engine sort) — pure code, biggest visible win, no cassette risk.
2. **WS3** (hand-repairs) + **WS2** goldens for every tour fixed or already green.
3. **WS4** content changes merge → one record wave → verify replays → goldens for the rest.
4. **WS5** in parallel any time (docs-only).
5. **WS6** as appetite allows.

Order matters twice: goldens must land *with* fixes (red otherwise), and every
`prompt-app-edit.md` edit must be in before the single WS4 record wave (each edit
invalidates all spec-edit entries).
