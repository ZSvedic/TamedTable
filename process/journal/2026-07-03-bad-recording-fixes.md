# 2026-07-03 — Bad-recording causes fixed; whole suite re-recorded on Gemini

Status report for PR 2 of the
[tour fix plan](2026-07-02-tour-fix-plan.md#pr-2--fix-the-causes-of-every-bad-recording-re-record-marketing-cleanup)
(PR #203). Every cause the [audit](2026-07-02-tour-audit.md) found is fixed at
its source, and — after the owner's decision to standardize on Google — every
cassette in the repo is a fresh, genuine Gemini recording. The full suite
(163 + 116 + 181 scenarios, 160 unit tests, typecheck) is green offline.

## What landed

1. **App guard.** The runtime rejects a patch that leaves a `validate`
   reading a column no earlier step provides, and feeds the error back
   through the recovery loop — the city-country failure can never reach a
   user again. Spec first, red test, then `checkValidateColumnOrder` in
   `@tamedtable/headless` (unit-tested offline with a mock model).
2. **Prompt.** `spec/prompt-app-edit.md` gained rules and few-shots 19–25:
   mutate-before-validate ordering, one mutate per name column, `{llm}`
   judgment (never a regex/range check) for fake emails and wrong prices, a
   round-trip day check for impossible dates, per-part `{llm}` extraction
   for addresses and memos, digits-only phone output, never inventing a
   year a memo doesn't name, and month-first/day-first 03/04 reading by the
   row's country.
3. **Data.** `customers-input.csv` now carries miscapitalized names
   (mcdonald, van der berg, o'neil) and the 03/04 date on both a US and a
   German row; mirrors regenerated. Memos name their years. New
   `customers-missing-phone.csv` gives the empty-phone tour something to
   flag.
4. **Output checks.** The broken tours now assert the outputs they promise
   (bill.gates flagged, Desk lamp flagged, only Paris/Japan flagged,
   McDonald capitalized, phones match `^\+[0-9]{7,15}$`, memo dates carry
   real years, Bob's address splits into CA / 94043). A bad recording can
   no longer ship green.
5. **One model baseline: Google.** The default provider is now gemini —
   primary `gemini-3.5-flash` (spec patches, voice), secondary
   `gemini-3.1-flash-lite` (per-row cells) — across the engine default,
   `resolveConfig`'s fallback, tutorial replay, the test harness, and the
   docs. This replaced the old three-model mix (Sonnet 4.6 patches, Sonnet
   4.5 cells on headless/CLI, Haiku 4.5 cells on web).
6. **Every cassette re-recorded from scratch** against live Gemini with the
   environment's `GEMINI_API_KEY` — no stale entries, no hand edits — and
   every recorded output verified: all 20 normalized phones digit-perfect,
   capitalization fixes McDonald / van der Berg / O'Neil while preserving
   CJK/Arabic names, the 03/04 date reads March 4 on the US row and April 3
   on the German row, bill.gates@microsoft.com and the 4.20 desk lamp get
   flagged, memo dates carry their real years. The `bench` performance
   cassette was re-recorded too.
7. **Marketing.** Homepage captions quote the tours' real phrases; 20 SVG
   illustrations drawn from real fixture rows and real replay values.

## Where fresh recordings changed shape, tests and marketing follow

Recordings are never edited — where Gemini's genuine answer differs from
Anthropic's old one, the assertions and captions were updated to the real
behavior after row-by-row verification:

- "sort by revenue, top 10" trims to 10 rows with a numeric sort + filter
  (2 transformations; Midwest and Northwest visibly drop from the 12-row
  table).
- "sort the titles by seniority" adds a visible `SeniorityRank` column
  (100 → 1) and sorts on it — CTO first.
- Sentiment scores are 1–5, not −1.0..1.0.
- Voice transcripts come back sentence-cased ("Validate DOB is not
  empty.").
- Six goldens regenerated from verified replay output (tickets, sentiment,
  seniority, gender, summarize, translate); the rest matched byte-for-byte.

## Iteration log (cause-fix, per the plan)

- The first fresh recording read `03/04/1983` on a USA row day-first;
  few-shot 4 gained the country-convention rule and the re-record shows
  `1983-03-04` (US) / `1993-04-03` (DE).
- `clearApiKey` cleared only the Anthropic slot — an Anthropic-era
  assumption; it now clears every provider key, and the "no key" scenarios
  state that premise explicitly.
- The `@scripted` SQL test harness served canned Anthropic-shaped tool
  calls; it now serves the Gemini wire shape, matching the baseline.
