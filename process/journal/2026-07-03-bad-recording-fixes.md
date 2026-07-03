# 2026-07-03 — Bad-recording causes fixed; one record run left

Status report for PR 2 of the
[tour fix plan](2026-07-02-tour-fix-plan.md#pr-2--fix-the-causes-of-every-bad-recording-re-record-marketing-cleanup).
Every cause the [audit](2026-07-02-tour-audit.md) found is fixed at its source
— app guard, prompt, data, marketing — and the Gemini-recorded cassettes are
already genuinely re-recorded. What remains is one `test:record` run with an
Anthropic key, which the session that produced this PR did not have.

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
   flag. Pass-through cells in the affected goldens are synced.
4. **Output checks.** The broken tours now assert the outputs they promise
   (bill.gates flagged, Desk lamp flagged, only Paris/Japan flagged,
   McDonald capitalized, phones match `^\+[0-9]{7,15}$`, memo dates carry
   real years, Bob's address splits into CA / 94043). A bad recording can
   no longer ship green.
5. **Marketing.** Homepage captions now quote the tours' real phrases and
   promises; 18 SVG illustrations redrawn from real fixture rows (join,
   pivot, sort, sentiment, seniority, emails, memos, languages, the five
   load/save tiles, and more).
6. **Gemini cassettes re-recorded for real.** `voice.json` fully, and the
   five voice scenarios in `multilingual.json`, against live Gemini with
   this environment's key — recorded from scratch, so no stale entries.
   Iteration per the plan: the first fresh recording read `03/04/1983` on a
   US row day-first; the few-shot 4 locale rule above fixed it and the
   committed recording shows `1983-03-04` (US) / `1993-04-03` (DE). The
   phone batch in `multilingual.json` is clean E.164 — no dropped digits,
   no letter `l`.

## Why the suite is red, and the finishing procedure

Changing the spec-editor prompt changes every request fingerprint, so every
Anthropic-replaying scenario now fails loudly with `no recording for this
request` — the documented cassette workflow. With an Anthropic key, from
`src/`:

1. Optional but recommended (drops dead-weight stale entries): delete every
   `src/tests/__cassettes__/*.json` **except** `voice.json` and
   `multilingual.json` before recording.
2. `bun run test:record` — headless + cli, ~8 min at 40 RPM.
3. `TAMEDTABLE_CASSETTE=record bun run test:web` — records the @web-only
   tours. The Gemini voice entries are fresh cassette hits, so no Gemini
   key is needed.
4. `bun run test` — the new output assertions now judge the recordings.
   If one fails, the recording missed its promise: improve the prompt or
   data and record that feature again (`TAMEDTABLE_FEATURES=<name>`).
   Never edit an answer by hand.
5. Goldens: `validate-phone-expected.jsonl` was pre-built assuming the
   few-shot's `'Phone is empty'` message — adjust from real replay output
   if the recording words it differently. Re-add an expected-output golden
   to the fake-emails tour (its old golden was removed — the edit shape
   changed to mutate + validate), and add ones for prices / memos /
   capitalization / address if wanted, per plan step 4.

## Decisions

- **Phone letter-guard is prompt-side, not engine-side.** The engine can't
  recognize "this mutate normalizes phones" generically, so the few-shot
  demands digits-only output and the tours pin `^\+[0-9]{7,15}$` in
  Gherkin. If garbling still shows up in fresh recordings, treat it as a
  product bug per the plan — not something to hide.
- **The voice transcript assertion follows the model.** Current Gemini
  consistently transcribes with sentence casing and punctuation
  ("Validate DOB is not empty."), five runs in a row — the scenario now
  expects that verbatim transcript.
