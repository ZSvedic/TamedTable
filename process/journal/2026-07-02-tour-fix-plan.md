# 2026-07-02 — Fix plan for every broken tour

Companion to [2026-07-02-tour-audit.md](2026-07-02-tour-audit.md). The audit found the
problems; this plan fixes them in 2 PRs. Each PR below has a prompt you can paste to
start a session for it.

Two facts drive the split. First: tours replay saved LLM answers ("cassettes") instead
of calling the live API, and **a cassette must only contain what the model actually
said** — no hand-edited answers. A doctored demo shows accuracy the product doesn't
have: a customer typing the same query with their own key talks to the live model and
gets the real answer. So every bad recording is fixed at its cause (data, prompt, or an
app guard) and then re-recorded (`bun run test:record`, needs a key, ~8 min). Picking
the best of a few real recording runs is fine; typing in a better answer is not.
Second: the engine sort bug needs no recording changes at all, so it goes first as a
small pure-code PR.

## PR 1 — Fix the sort bug and add output checks

Affected Gherkin: [sort.feature](../../spec/test-cases/sort.feature),
[classify.feature](../../spec/test-cases/classify.feature), plus an output check added
to every already-correct tour across
[spec/test-cases/](../../spec/test-cases/).

Pure code, no API key. Do this first: it fixes two tours by itself.

> **Problem.** The engine sorts numbers as text, so "10" comes before "2". Two tours
> show this to visitors: "Sort by revenue, top 10" ranks 98,750 above 420,000, and
> "Sort the titles by seniority" puts the CTO 4th of 5. See the `#SortRows` comparator
> in `src/packages/headless/index.ts`. A second, related problem: tour tests only check
> "1 transformation + no toast", never the output rows — that's why all the broken
> tours stayed green. `filter.feature` already shows the fix: an expected-output file
> plus `Then compare with the expected output`.
>
> **Fix.** (1) Make the sort comparator numeric-aware: if both values are numbers (or
> numeric strings), compare as numbers; otherwise as text. Follow the workflow rule:
> spec first, red Gherkin test, then code. (2) Grow `sales.csv` from 5 to ~12 rows so
> "top 10" visibly trims (safe — the saved sort answer doesn't depend on row values).
> (3) Add expected-output files and the compare step to every tour that already
> produces correct output per the audit.
>
> **Done when:** both sort tours show the right order in replay; every currently-correct
> tour has an output check; `cd src && bun run test` is green.

## PR 2 — Fix the causes of every bad recording, re-record, marketing cleanup

Affected Gherkin: [validate.feature](../../spec/test-cases/validate.feature),
[clean-up.feature](../../spec/test-cases/clean-up.feature),
[enrich.feature](../../spec/test-cases/enrich.feature),
[multilingual.feature](../../spec/test-cases/multilingual.feature),
[loadsave.feature](../../spec/test-cases/loadsave.feature).

Needs an API key for `bun run test:record`. Every bad answer in a cassette is a
symptom; fix the cause, then record again. Expect iteration: if a fresh recording is
still bad, improve the prompt or guard and record once more — never edit the answer.

> **Problem.** Nine tours replay bad recordings (full evidence in
> `process/journal/2026-07-02-tour-audit.md`). Grouped by cause:
>
> *The app accepted a broken edit.* "Check the city matches the country" flags every
> row, even correct ones — the model put the validate step *before* the step that
> computes the yes/no column it reads, and the app applied it without complaint.
>
> *The model's answers are wrong and nothing checks them.* Phone normalization (3
> tours: clean-up, Spanish, loadsave) has 7 of 20 phones garbled — dropped digits,
> letter `l` for digit `1`. "Flag any impossible birth date" misses Feb 30th: the
> model wrote JS that lets JavaScript roll `2024-02-30` over to March 1st.
>
> *The recorded checks are too weak for the promise.* "Flag emails that look fake"
> leaves bill.gates@microsoft.com valid; "Flag prices that seem wrong" flags nothing —
> both are the homepage's own examples. These are semantic judgments; the recordings
> use simple rule checks.
>
> *The input data can't demonstrate the task.* "Fix the capitalization of names" has
> zero miscapitalized names to fix (and its edit writes the full name into both name
> columns, nulling CJK/Arabic names). "Split the address into its parts" splits on
> commas but the addresses have one comma — State/Zip always empty. Memo dates invent
> the year 2024 because memos have no year. "Flag rows with empty Phone" has no empty
> phones. The "03/04 is March in the US, April in the EU" homepage claim has no
> ambiguous date to prove it.
>
> **Fix.** Work cause-first, then one record run at the end:
>
> 1. App guard: reject a spec edit whose validate reads a column no earlier step
>    creates, and feed the error back through the existing patch-recovery loop, so no
>    user — live or replay — ever gets the city-country failure. Spec first, red test,
>    then code.
> 2. Prompt guidance in `spec/prompt-app-edit.md` (few-shots): compute-before-validate
>    ordering; per-column capitalization edits; AI extraction for address parts;
>    AI-judgment checks for fake emails and wrong prices; a round-trip day check for
>    dates. Consider an app-side guard for phone normalization (the answer to
>    "normalize this phone" should never contain letters); if garbling persists across
>    recordings, that's a product bug to fix, not to hide.
> 3. Data: add miscapitalized names ("mcdonald", "van der berg") to
>    `customers-input.csv`; add years to `memos.csv`; add one ambiguous 03/04 date on a
>    US row; new `customers-missing-phone.csv` (3 phones blanked) for the empty-phone
>    tour.
> 4. Run `bun run test:record` once, replay every affected tour, check outputs
>    row-by-row, add/update expected-output files. Iterate on 1–3 if a recording is
>    still bad.
>
> Same PR (or a sibling docs-only commit): align the homepage with reality — the join
> caption/illustration describe an orders join that doesn't exist (the tour joins
> country codes), the pivot caption says "months" but the data is quarters, and ~10
> illustrations show invented data; redraw them from the real fixture rows (the audit
> lists each one).
>
> **Done when:** every tour in the audit's fail list shows the promised output in
> replay from a genuine recording; homepage captions and illustrations match what the
> tours actually do; full suite green.

## Left out on purpose

Nice-to-haves, only if asked: drop the duplicate `Country_2` column the join produces;
give the loadsave tour real save/undo steps (a new feature, not a repair); prune stale
duplicate entries from `classify.json`; keep the audit's replay-dump script as a dev
tool.
