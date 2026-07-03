# 2026-07-02 — Fix plan for every broken tour

Companion to [2026-07-02-tour-audit.md](2026-07-02-tour-audit.md). The audit found the
problems; this plan fixes them in 3 PRs. Each PR below has a prompt you can paste to
start a session for it.

One background fact drives the split. Tours replay saved LLM answers ("cassettes")
instead of calling the live API. A saved *answer* can be edited by hand for free. But if
we change what gets *asked* — the data, the query, or the prompts — the old answer no
longer matches and we must re-record against the live API (`bun run test:record`, needs
a key, ~8 min). So: PR 1 is pure code, PR 2 edits saved answers by hand, PR 3 batches
everything that needs one re-record run.

## PR 1 — Fix the sort bug and add output checks

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

## PR 2 — Repair the saved answers by hand

No API key. Each fix edits what the model answered, which replay reads as-is.

> **Problem.** Four saved recordings contain bad answers, visible to every visitor
> (details in the audit, `process/journal/2026-07-02-tour-audit.md`):
>
> - "Check the city matches the country": every row is flagged, even correct ones. The
>   saved edit runs the validate step *before* the step that computes the yes/no column
>   it reads.
> - Phone normalization (3 tours: clean-up, Spanish, loadsave): 7 of 20 phones are
>   garbled — dropped digits, and letter `l` where digit `1` should be.
> - "Flag any impossible birth date": Feb 30th isn't flagged because JavaScript rolls
>   `2024-02-30` over to March 1st before the check runs.
> - "Flag emails that look fake" / "Flag prices that seem wrong": the saved checks are
>   too weak to flag the homepage's own examples (bill.gates@microsoft.com; the $4.20
>   desk lamp).
>
> **Fix.** Edit the saved answers in `src/tests/__cassettes__/`: swap the two steps for
> city-country, correct the phone digits, make the date check catch rollover dates, and
> strengthen the email and price checks enough to flag the promised examples. Verify
> each tour by replaying it, and add its expected-output file + compare step in the
> same PR. Careful: only edit answers; if a fix would change a prompt or the input
> data, leave it for PR 3.
>
> **Done when:** the six affected tours produce the output their homepage caption
> promises, each locked by an output check; full suite green.

## PR 3 — Better data and prompts, one re-record, marketing cleanup

Needs an API key for one `bun run test:record` run at the end.

> **Problem.** Some tours can't be fixed by editing answers because the *inputs* are
> wrong (details in the audit):
>
> - "Fix the capitalization of names": the sample data has no miscapitalized names, and
>   the saved edit writes the full name into both name columns and nulls the CJK/Arabic
>   names.
> - "Split the address into its parts": the saved edit splits on commas, but the
>   addresses only have one comma — State and Zip are always empty. Needs AI extraction
>   instead.
> - "Extract the amount and date from the memo": memos have no year, so the dates
>   invent 2024.
> - "Flag rows with empty Phone": no phone in the sample data is empty — the demo flags
>   nothing.
> - Homepage claims never demonstrated: "03/04 is March in the US, April in the EU"
>   (no ambiguous date in the data); emails/prices deserve AI judgment, not the interim
>   PR 2 rules.
>
> **Fix.** Adjust the sample CSVs (add miscapitalized names like "mcdonald", add years
> to memos, blank 3 phones in a copied fixture for the empty-phone tour, add one
> ambiguous 03/04 date on a US row). Steer the recorded edits where needed with
> few-shots in `spec/prompt-app-edit.md` (per-column capitalization, AI-based address
> split, AI-based email/price checks, compute-before-validate ordering). Merge all of
> that, then run `bun run test:record` once, verify every re-recorded tour's output,
> update the expected-output files.
>
> Same PR (or a sibling docs-only commit): align the homepage with reality — the join
> caption/illustration describe an orders join that doesn't exist (the tour joins
> country codes), the pivot caption says "months" but the data is quarters, and ~10
> illustrations show invented data; redraw them from the real fixture rows (the audit
> lists each one).
>
> **Done when:** every tour in the audit's fail list shows the promised output in
> replay; homepage captions and illustrations match what the tours actually do; full
> suite green.

## Left out on purpose

Nice-to-haves, only if asked: drop the duplicate `Country_2` column the join produces;
give the loadsave tour real save/undo steps (a new feature, not a repair); prune stale
duplicate entries from `classify.json`; keep the audit's replay-dump script as a dev
tool.
