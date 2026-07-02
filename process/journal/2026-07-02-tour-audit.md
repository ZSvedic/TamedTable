# 2026-07-02 — Tour audit: every tour against a 4-point checklist

Requested audit of all 28 `@tour` scenarios. Each tour got the same 4 checks:
**1** tour steps match the Gherkin steps (incl. the homepage caption and deep link),
**2** illustration matches the Gherkin steps and the raw fixture data,
**3** input data and the cassette's recorded edit (spec + per-cell prompt) fit the task,
**4** the cassette replay's output table matches the result the tour promises.

## Method

A throwaway script replayed every tour exactly like the deployed app does for a key-free
visitor — `createWebController` + `openTutorialFromLink` + play-to-end over the real
fixtures and `src/tests/__cassettes__/*.json` — and dumped each tour's parsed steps,
applied spec (with per-cell prompt), and final table. Seven parallel review passes then
compared those dumps row-by-row against the fixtures, the feature files, the homepage
entries in `marketing/web/index.html`, and the SVG sources in `marketing/illustrations/`.
All 28 tours replay with zero cassette misses and zero toasts — the *plumbing* is fine;
every finding below is about content.

## Score

112 checks: **71 pass, 27 warn, 14 fail**. 10 of the 14 fails are check 4 — the replayed
output is wrong for the tour's promise, and the Gherkin `Then` steps (`the spec has 1
transformation` + `no toast is shown`) can't catch any of it.

## Top findings, ranked

1. **Sorts on numeric-looking strings are lexicographic** — two tours misorder visibly.
   "Sort by revenue, top 10" shows East 98,750 ranked above West 420,000
   (`'9'>'4'` string compare); "Sort the titles by seniority" puts the CTO 4th of 5
   because rating "10" sorts below "2". Engine-level: `sort` compares CSV strings and
   LLM ratings as strings. Likely the "tour that makes no sense" that triggered this audit.
2. **"Check the city matches the country" flags all 4 rows** — the recorded spec edit
   ordered `validate` *before* the `mutate` that creates `_city_country_match`, so the
   predicate reads a missing column and every row (incl. Osaka/Japan) shows
   "City does not match Country". The per-cell LLM answers are all correct.
3. **"Fix the capitalization of names" corrupts every row** — the mutate targets both
   name columns but the prompt returns the full name, so FirstName = LastName =
   "John D. Doe"; the four CJK/Arabic names are wiped to null. And the fixture has zero
   miscapitalized names, so there was nothing to demonstrate in the first place.
4. **The shared phone-normalization cassette is garbled** — 7 of 20 outputs drop digits
   or contain letter `l` for digit `1` (`+61559432l2`). Hits three tours: "Normalize
   the phone numbers", "Normalize phone numbers in Spanish", and the loadsave tour.
5. **Two Validate tours flag nothing they promise** — "Flag prices that seem wrong"
   flags no row (recorded pred is a generic `0 < p < 1e7` range check; the missing-zero
   desk lamp passes), and "Flag emails that look fake" leaves
   `bill.gates@microsoft.com` valid — the exact example both the homepage and the
   illustration are built around. "Flag any impossible birth date" catches 1873 but not
   2024-02-30 (JS date rollover), delivering half its promise.
6. **The join tour's caption and illustration describe a different task** — homepage
   says "add each order's customer name" and the SVG draws an orders⇄customers join;
   the tour actually joins customers to country codes for ISO/Region. Output also
   carries a redundant `Country_2` column.

## Per-tour checklists

Columns: **1** steps match Gherkin, **2** illustration matches steps + data,
**3** input + cassette edit prompt fit the task, **4** replay output matches the
expected result. Notes below each table cover every non-pass cell.

### Clean up

| Tour | 1 Steps match | 2 Illustration | 3 Input + prompt | 4 Output |
|---|---|---|---|---|
| Normalize the phone numbers | ✅ | ✅ | ✅ | ❌ |
| Make the country names consistent | ✅ | ⚠️ | ✅ | ✅ |
| Fix the capitalization of names | ✅ | ⚠️ | ❌ | ❌ |
| Clean up the birth dates | ✅ | ✅ | ⚠️ | ✅ |

- ❌ **Normalize the phone numbers — output**: 7 of 20 rows garbled despite the prompt's 'never drop, pad, or invent digits': row 04 '+61559432l2' contains letter 'l' in place of digit 1; rows 08 '+61555986' (input +61 555 9876), 13 '+49555678' (input +49 555 6789), 14 '+34551234' (input +34 555 1234), 17 '+86551234' (input +86 555 1234), 19 '+81551234' (input +81 555 1234), 20 '+96655512' (input +966 555 1234) each drop 1-2 digits. Correct rows: 01,03,05,09,10,11,12,15,16,18; 06 correctly null; 02 '+15555678' keeps a 7-digit US number (defensible per prompt, invalid E.164).
- ℹ️ **Normalize the phone numbers**: Gherkin Then-steps assert only '1 transformation' and 'no toast', so these visitor-visible garbled phones pass CI. Homepage fnote 'Dialing prefix inferred from regions' is genuinely demonstrated (rows 01,05,09,15,18).
- ⚠️ **Make the country names consistent — illustration**: Task depicted is right, but the two rows contradict each other and the tour: 'U.S.→United States' yet 'usa→USA' — two different canonical forms for the same country, and the actual tour maps USA→'United States', never →'USA'. Neither 'U.S.' nor 'usa' appears in the fixture.
- ℹ️ **Make the country names consistent**: Homepage fnote says 'Folds USA / U.S. / United States into one' but the fixture has no 'U.S.' or 'United States' variant for the US; the fold is instead demonstrated by UK/England/United Kingdom.
- ⚠️ **Fix the capitalization of names — illustration**: Depicts the promised task (mcdonald→McDonald, van der berg→van der Berg, o'neil→O'Neil, matching the fnote), but none of these exist in customers-input.csv — the fixture contains zero miscapitalized names, so the tour can never show what the illustration promises.
- ❌ **Fix the capitalization of names — input+prompt**: Two problems: (1) input unfit — every FirstName/LastName in the fixture is already correctly capitalized (John, D. Doe, Jane, Smith, ...), so there is nothing to fix; (2) spec/prompt mismatch — the mutate targets BOTH columns ['FirstName','LastName'] while the prompt says 'Reply with ONLY the corrected full name' on input '{FirstName} {LastName}', guaranteeing the full name is written into both columns.
- ❌ **Fix the capitalization of names — output**: Every row corrupted: FirstName and LastName both hold the concatenated full name (row 01: FirstName='John D. Doe', LastName='John D. Doe'; same pattern rows 01-16). Rows 17-20 destroyed: 张/三, 李/四, 山田/太郎, فلا/الفلاني all replaced with null — the cassette judged CJK/Arabic names 'unrecognizable' and wiped them.
- ℹ️ **Fix the capitalization of names**: This tour is broken end-to-end: nothing to demonstrate in the data, and the replay visibly mangles the table (duplicated names, nulled non-Latin names). The weak Then-assertions (1 transformation, no toast) let it stay green.
- ⚠️ **Clean up the birth dates — input+prompt**: Fixture DOBs are suitably messy (01-01-1990, 1992_12_10, '25th of March 1980', 11.11.1993., NA, -, empty) and the prompt targets DOB, asks ISO 8601 with same-row context for locale disambiguation — but the homepage fnote promises 'Knows 03/04 is March in the US, April in the EU' and no fixture date is actually US/EU-ambiguous (01-01 and 11.11 read the same either way), so the flagship claim is never exercised.
- ℹ️ **Clean up the birth dates**: To back the 03/04 homepage claim the fixture would need a date like 03/04/1990 on a US row and an EU row; today it has none.

### Enrich & extract

| Tour | 1 Steps match | 2 Illustration | 3 Input + prompt | 4 Output |
|---|---|---|---|---|
| Split the address into its parts | ✅ | ✅ | ⚠️ | ❌ |
| Fill the country from the city column | ✅ | ✅ | ✅ | ✅ |
| Add the industry for each company | ✅ | ⚠️ | ✅ | ✅ |
| Extract the amount and date from the memo | ✅ | ⚠️ | ✅ | ⚠️ |

- ⚠️ **Split the address into its parts — input+prompt**: Input fits (messy multi-part addresses) and the split targets Address, but the spec is `split` on /,\s*/ into [Street, City, State, Zip] — every fixture address has only one comma, so a 2-part split can never populate State/Zip. The edit is structurally unable to do the promised task.
- ❌ **Split the address into its parts — output**: All 3 rows have State=null and Zip=null; City holds "London NW1 6XE" and "Mountain View CA 94043" (row Bob plainly contains state CA and zip 94043). The address is not split into its parts — City is city+state+zip lumped together, contradicting both the promise and the illustration's "London" / "NW1 6XE" chips.
- ℹ️ **Split the address into its parts**: The illustration promises a finer split (city and zip separated) than the replay delivers, so the visitor sees a worse result after clicking Show me. Then-assertion only checks '1 transformation', so this wrong output passes CI.
- ⚠️ **Add the industry for each company — illustration**: Companies are the real fixture values (Pfizer, Stripe, Boeing), but the depicted industries "Pharma" and "Fintech" differ from what the tour actually outputs ("Healthcare", "Finance") — stylized-but-different result values.
- ⚠️ **Extract the amount and date from the memo — illustration**: Rows 1–2 are faithful abbreviations of memos.csv, but row 3 rewrites the fixture "Invoice 120 due Jun 1" as "$120 due Jun 1" and shows amount "$120" extracted — the real fixture has no dollar sign and the real replay yields Amount=null for that row.
- ⚠️ **Extract the amount and date from the memo — output**: Amounts correct: 42.00, 9.50, and null for "Invoice 120" (120 is an invoice number — defensible). Dates get day/month right but invent year 2024 ("3 May"→"2024-05-03") — no memo contains a year, so 2024 is fabricated (and stale: current year is 2026).
- ℹ️ **Extract the amount and date from the memo**: Illustration and replay agree on the 2024 dates, so the fabricated year is at least consistent; the row-3 amount mismatch (illustration $120 vs replay null) is the visitor-visible discrepancy.

### Classify

| Tour | 1 Steps match | 2 Illustration | 3 Input + prompt | 4 Output |
|---|---|---|---|---|
| Label each ticket as billing, bug, or feature | ✅ | ✅ | ✅ | ✅ |
| Score the sentiment of every review | ✅ | ⚠️ | ✅ | ✅ |
| Sort the titles by seniority | ✅ | ⚠️ | ✅ | ❌ |
| Split customers into men, women, and unknown | ✅ | ✅ | ✅ | ✅ |

- ℹ️ **Label each ticket as billing, bug, or feature**: Cassette has a duplicate older recording pair (e0fbc83b fenced-code vs aa964461 plain, June-24 vs July-02) for the same task; replay output matches either — harmless but stale.
- ⚠️ **Score the sentiment of every review — illustration**: Illustration and fnote ('Positive, neutral, or negative') show a categorical sentiment column, but the actual tour writes numeric scores -1.0..1.0 (e.g. '0.3', '-0.85'). Task idea matches; depicted output type does not.
- ℹ️ **Score the sentiment of every review**: Duplicate per-cell recordings: f515929c (fenced, [0.3,-0.8,0.9,0.1,-0.9], June-24) and 5af4d80f (plain, [0.3,-0.85,0.9,0.05,-0.9], July-02); dump rows show -0.85/0.05, so replay uses the newer one — the fenced one is stale.
- ⚠️ **Sort the titles by seniority — illustration**: SVG depicts adding a 'level' column (Intern L1, Engineer L3, VP L6), not reordering rows — the real spec is a sort with no new column. Also fnote says 'Ranks junior → senior' while spec sorts dir:desc (senior first). Titles themselves fit the fixture.
- ❌ **Sort the titles by seniority — output**: Final order is Cara (VP), Bob (Senior Eng), Dan (Junior Analyst), Eve (CTO), Ana (Intern) — the CTO lands 4th, below a Junior Analyst. Cassette ratings are Ana=1, Bob=6, Cara=9, Dan=2, Eve=10; the shown order is exactly lexicographic string-desc of those keys ("9">"6">"2">"10">"1"), so the sort compares the numeric ratings as strings. Correct desc order would be Eve, Cara, Bob, Dan, Ana.
- ℹ️ **Sort the titles by seniority**: Duplicate per-cell recordings 6e798183 (fenced strings ["1","6","9","2","10"], June-24) and ce1e4627 (plain ints [1,7,9,2,10], July-02); either yields the same wrong order under string compare. The scenario's Then steps only assert '1 transformation' + 'no toast', so this visitor-visible misordering is never caught by the suite.
- ℹ️ **Split customers into men, women, and unknown**: Cassette contains a stale duplicate prompt variant: spec-edit ffb86a7b + per-cell 3674dafb (June-24) use 'Male, Female, or Unknown', while spec-edit a56deb90 + per-cell 3ebb4ef5/68d9b761 use 'man, woman, or unknown'. The dump's spec prompt and lowercase row values (man/woman/unknown) prove the replay uses the man/woman/unknown variant; the Male/Female pair is dead weight in src/tests/__cassettes__/classify.json.

### Validate

| Tour | 1 Steps match | 2 Illustration | 3 Input + prompt | 4 Output |
|---|---|---|---|---|
| Flag rows with empty Phone | ✅ | ✅ | ⚠️ | ✅ |
| Flag emails that look fake | ✅ | ⚠️ | ⚠️ | ❌ |
| Flag any impossible birth date | ✅ | ✅ | ✅ | ❌ |
| Check the city matches the country | ✅ | ✅ | ⚠️ | ❌ |
| Flag prices that seem wrong | ✅ | ✅ | ⚠️ | ❌ |

- ⚠️ **Flag rows with empty Phone — input+prompt**: Spec pred `row.Phone && String(row.Phone).length > 0` correctly targets Phone, but all 20 rows of customers-input.csv have a non-empty Phone (even row 16 Ahmed Khan only has an empty DOB), so the demo can never flag anything; the Gherkin 'rows with empty Phone have _valid equal to false' is vacuously true. Sibling headless scenarios inject empty phones via a rewrite step ('the source has 20 rows and 3 have empty Phone', src/tests/v2.steps.ts configureSource); the tour uses the raw file.
- ℹ️ **Flag rows with empty Phone**: Tour runs correctly but demonstrates a no-op: a 'flag empty Phone' demo on a fixture with zero empty phones shows 20 green rows.
- ⚠️ **Flag emails that look fake — illustration**: Columns name/email/flag and the operation match; bill.gates@microsoft.com is a real fixture value. But the SVG's centerpiece row shows bill.gates@microsoft.com -> 'fake', which the live tour contradicts (_valid=true), and the other rows (Mia Khan/mia.k@gmail.com, Tom Reed/t.reed@outlook.com) are invented rather than fixture rows (Ana/ana@acme.io, Cara/cara@startup.dev).
- ⚠️ **Flag emails that look fake — input+prompt**: emails.csv fits the task (asdf@asdf.com is an obvious fake; bill.gates@microsoft.com is the celebrity-signup fake). The recorded spec is a pure regex/blocklist heuristic (asdf/qwer/test locals, disposable domains) with no rule that could ever flag bill.gates@microsoft.com — the exact example the homepage and illustration are built around.
- ❌ **Flag emails that look fake — output**: Row-by-row: ana@acme.io valid (ok), cara@startup.dev valid (ok), asdf@asdf.com flagged 'Suspicious local part: asdf' (ok), but bill.gates@microsoft.com has _valid=true/_validation=null. Homepage fnote promises 'bill.gates@microsoft.com probably didn't sign up' and the illustration marks it 'fake' — the live tour leaves it valid.
- ℹ️ **Flag emails that look fake**: Then-assertions ('spec has 1 transformation', 'no toast') are too weak to catch the missed bill.gates flag.
- ❌ **Flag any impossible birth date — output**: Homepage fnote promises 'Flags both 1873 and Feb 30th'. Bob 1873-01-01 is flagged ('DOB is implausibly old (before 1900)') but Cara 2024-02-30 has _valid=true/_validation=null: verified that in bun/V8 `new Date('2024-02-30')` rolls over to Mar 01 2024, so the pred's isNaN guard never fires. Ana and Dan correctly valid. Half the promise is undelivered.
- ℹ️ **Flag any impossible birth date**: The cassette pred can never catch day-overflow dates in engines that roll them over; it needs an explicit round-trip day check.
- ⚠️ **Check the city matches the country — input+prompt**: Fixture fits (Paris,Japan is the mismatch) and the per-cell prompt correctly asks yes/no city-in-country per {City}/{Country}. But the cassette spec orders `validate` (pred `row._city_country_match === 'yes'`) BEFORE the `mutate` that creates _city_country_match — the predicate reads a column that doesn't exist yet.
- ❌ **Check the city matches the country — output**: All 4 rows have _valid=false with 'City does not match Country', including Osaka/Japan, Lyon/France and Berlin/Germany whose _city_country_match is 'yes' (the LLM answers are correct; Paris/Japan is 'no'). The validate ran before the mutate populated its input, so every row is flagged. Homepage promises only 'Paris, Japan gets a second look'; visitors see everything flagged as mismatched.
- ℹ️ **Check the city matches the country**: The Gherkin Then ('spec has 2 transformations', 'no toast') passes despite the fully wrong flags — assertions don't check any row values.
- ⚠️ **Flag prices that seem wrong — input+prompt**: prices.csv fits the task (Desk lamp 4.20 vs Keyboard 42.00 reads as a missing zero; Monitor 3.10 is implausibly cheap). But the recorded spec is only `!isNaN(p) && p > 0 && p < 1e7` — a generic range check with no plausibility logic, incapable of catching a missing-zero price.
- ❌ **Flag prices that seem wrong — output**: All 4 rows _valid=true/_validation=null — nothing is flagged. Homepage fnote promises 'Catches the missing zero before Reddit does' and the illustration flags Desk lamp $4.20, yet the live tour flags no row (3.10 and 4.20 both pass the 0<p<1e7 pred).
- ℹ️ **Flag prices that seem wrong**: Weak Then-assertions again; the tour's whole point (a flagged suspicious price) is unverified and undelivered.

### Language

| Tour | 1 Steps match | 2 Illustration | 3 Input + prompt | 4 Output |
|---|---|---|---|---|
| Summarize each review in one line | ✅ | ✅ | ✅ | ✅ |
| Translate the comments to English | ✅ | ✅ | ✅ | ✅ |
| Tag the language of every comment | ✅ | ⚠️ | ✅ | ✅ |
| Normalize phone numbers in Spanish | ✅ | ⚠️ | ✅ | ❌ |
| Normalize DOB by voice | ✅ | ⚠️ | ✅ | ✅ |

- ℹ️ **Summarize each review in one line**: Gherkin Then only asserts '1 transformation' + 'no toast'; output quality is unasserted (fine here since the cassette output is good).
- ℹ️ **Translate the comments to English**: Illustration shows a separate 'english' column (before/after side by side) while the tour replaces Comment in place — defensible stylization, noted for consistency.
- ⚠️ **Tag the language of every comment — illustration**: Row 2 shows "Sehr gut" — not the fixture's "Sehr schnell geliefert" (rows 1/3 are real truncations); and tags read FR/DE/JA codes while the tour writes full names ("French", "German").
- ⚠️ **Normalize phone numbers in Spanish — illustration**: Operation (Spanish prompt + language chips + normalized phone column) is right, but the mini-table is invented — "Mara K. +1 415-555-0101" / "Dev P. +1 312-555-0148" appear nowhere in customers-input.csv, and the dashed/spaced format contradicts the tour's actual bare-E.164 output (+12005551234).
- ❌ **Normalize phone numbers in Spanish — output**: 7 of 20 rows garbled: row 04 output "+61559432l2" contains letter 'l'; digits dropped in row 08 (+61 555 9876 -> "+61555986"), row 13 (+49 555 6789 -> "+49555678"), row 14 (+34 555 1234 -> "+34551234"), row 17 (+86 555 1234 -> "+86551234"), row 19 (+81 555 1234 -> "+81551234"), row 20 (+966 555 1234 -> "+96655512") — despite the prompt's 'never drop, pad, or invent digits'. Row 06 -> null is defensible per the short-local-number rule.
- ℹ️ **Normalize phone numbers in Spanish**: The scenario's only Then is 'a phone-normalization transformation is added' — no output assertion, so this garbled cassette replay ships to visitors unchecked. Cassette should be re-recorded.
- ⚠️ **Normalize DOB by voice — illustration**: Mic + waveform + "tap the mic — say it out loud" depict the voice mechanism well, but the transcribed chip reads "normalize the phone numbers" while the tour's clip says "normalize DOB column" and the replay mutates DOB, not Phone.
- ℹ️ **Normalize DOB by voice**: Parsed steps omit the scenario's 'provider gemini has API key' Given (expected — parser keeps action steps only; tour replays key-free).

### Be exact (deterministic)

| Tour | 1 Steps match | 2 Illustration | 3 Input + prompt | 4 Output |
|---|---|---|---|---|
| Filter by Country | ⚠️ | ✅ | ✅ | ✅ |
| Sort by revenue, top 10 | ✅ | ⚠️ | ⚠️ | ❌ |
| Drop duplicates by Email | ⚠️ | ✅ | ✅ | ✅ |
| One column per distinct on-value, default agg first | ⚠️ | ⚠️ | ✅ | ⚠️ |
| Left join enriches each customer with ISO and Region | ❌ | ❌ | ✅ | ⚠️ |

- ⚠️ **Filter by Country — steps**: Dump steps match the scenario (load "filter-input.csv", query "Show only customers in the USA") and the deep-link scenario name exists verbatim, but homepage fcmd is "keep only customers in the USA" while the scenario query is "Show only customers in the USA" — paraphrase, not verbatim.
- ⚠️ **Sort by revenue, top 10 — illustration**: Columns region/revenue match the fixture and the desc-sort+top-N operation is depicted, but it reuses real region names with invented values in a ranking that contradicts the fixture: illustration shows West $48,200 > North $31,940 > South $22,510, while sales.csv has South 225100 > North 31560.
- ⚠️ **Sort by revenue, top 10 — input+prompt**: Query promises "top 10" but sales.csv has only 5 rows, so the limit (spec page.size=10) visibly does nothing — the top-N half of the promise can't be demonstrated with this fixture.
- ❌ **Sort by revenue, top 10 — output**: Rows are sorted lexicographically as strings, not numerically: output order is East 98750, West 420000, North 31560, South 225100, Central 154300 ('9'>'4'>'3'>'2'>'1'). Correct numeric desc would be West 420000, South 225100, Central 154300, East 98750, North 31560 — the visitor sees 98,750 ranked above 420,000.
- ℹ️ **Sort by revenue, top 10**: The scenario's Then assertions are only 'the spec has 1 transformation' and 'no toast is shown' — no golden/output check (golden: null in dump), which is exactly why the string-vs-numeric sort bug goes undetected.
- ⚠️ **Drop duplicates by Email — steps**: Dump steps match the scenario (load "dedupe-input.csv", query "Remove duplicate rows by Email") and the scenario name exists verbatim, but homepage fcmd is "remove duplicate emails" vs scenario query "Remove duplicate rows by Email" — same meaning, not verbatim.
- ⚠️ **One column per distinct on-value, default agg first — steps**: Dump steps match the scenario (load "pivot-long-input.csv", query "Pivot Quarter into columns, with Revenue as the value") and the scenario name exists verbatim, but homepage fcmd says "pivot months into columns" — the data and query are quarters (Q1-Q4), not months; the visitor is promised months and sees quarters.
- ⚠️ **One column per distinct on-value, default agg first — illustration**: Depicts the tall-to-wide pivot operation correctly, but on a different dataset: month/sales (Jan/Feb/Mar, 120/98/143) instead of the fixture's Region/Quarter/Revenue, and it omits the Region index column entirely (single-row wide output vs the tour's 3 region rows). It matches the wrong caption, not the fixture.
- ⚠️ **One column per distinct on-value, default agg first — output**: 11 of 12 cells verified correct against the CSV (NA 100/150/200/250; EU Q2-Q4 130/140/160; APAC 90/100/180; APAC Q3 correctly null). But EU has two Q1 rows (80 and 120) and the tour shows Q1=80, silently dropping 120 — correct for the documented default agg=first, yet a visitor asking for 'Revenue as the value' could reasonably expect 200; questionable-but-defensible.
- ℹ️ **One column per distinct on-value, default agg first**: The duplicate EU/Q1 rows exist in the fixture to serve the separate agg=sum scenario; reusing that fixture for the default-agg tour is what makes the silent drop visible to visitors.
- ❌ **Left join enriches each customer with ISO and Region — steps**: Dump steps match the scenario and the scenario name exists verbatim, but homepage fcmd "add each order's customer name" describes a different task entirely — the tour joins customers with join-country-codes.csv on Country to add ISO and Region; there are no orders and no customer-name lookup anywhere in the demo.
- ❌ **Left join enriches each customer with ISO and Region — illustration**: Shows an orders table (#1041/#1042, cust_id c-7/c-3) joined to customers to add a 'customer' name column, matched on cust_id — a different dataset and different join than the actual customers-to-country-codes ISO/Region enrichment the visitor sees.
- ⚠️ **Left join enriches each customer with ISO and Region — output**: All 20 rows verified: ISO/Region correct per lookup for every row, including variants (England->GB/Europe, Deutschland->DE/Europe, The Bahamas->BS/Americas); originals preserved. But the output carries a redundant Country_2 column duplicating Country on every row (right-side collision auto-rename) — values correct, visible clutter for a demo promising just 'add ISO and Region'.
- ℹ️ **Left join enriches each customer with ISO and Region**: Both the homepage caption and the illustration were evidently made for a hypothetical orders/customer-name join; the actual tour, fixture, and cassette all implement a country-code enrichment. Fixing caption+SVG (or the scenario) would resolve both fails.

### Load, save & reuse

| Tour | 1 Steps match | 2 Illustration | 3 Input + prompt | 4 Output |
|---|---|---|---|---|
| Load a file, transform it, then save and reuse | ⚠️ | ⚠️ | ✅ | ❌ |

- ⚠️ **Load a file, transform it, then save and reuse — steps**: Scenario name exists verbatim and dump steps (load customers-input.csv + query 'normalize the phone numbers') match the gherkin exactly. But 4 of the 5 homepage fcmd phrases name commands the tour never executes: ':save clean.csv', ':save-flow tidy.flow', ':save-py tidy.py', ':undo / :redo' — the scenario contains no save/save-flow/save-py/undo step at all, only load + one transform. The feature-file comment documents this as intentional ('runs one transform so there is something to save, reuse, or undo'), so the tour is a launchpad, but a visitor clicking e.g. ':undo / :redo' Show-me sees no undo demonstrated.
- ⚠️ **Load a file, transform it, then save and reuse — illustration**: All five are stylized around a fictional 4-step pipeline of which the tour performs only step 1. Per SVG: -load.svg depicts web-vs-CLI 'same engine underneath' (not file/URL loading as its caption says) and claims '3 rows changed' vs the actual 19; -save-csv.svg shows a made-up email/phone table (fixture has no email column; phones like '+1 415-555-0101' not in fixture); -save-flow.svg lists 4 steps ('remove duplicate emails', 'keep customers in the USA', 'sort by revenue, top 10' — no email/revenue columns exist) and tags '.flow 4 steps' where the real flow would have 1; -save-py.svg's normalize_phone(df,"phone") matches the theme but drop_duplicates("email") does not; -undo-redo.svg's history 'open→normalize→dedupe→filter' — only open+normalize are real. Only the recurring 'normalize the phone numbers' step is faithful to the tour and fixture.
- ❌ **Load a file, transform it, then save and reuse — output**: 7 of 20 output phones are wrong, directly violating the prompt's own 'never drop, pad, or invent digits' rule. Lowercase letter 'l' replaces digit '1' in rows 04 '+61559432l2', 12 '+385555432l', 14 '+34555l234', 17 '+86555l234', 20 '+966555l234' (all inputs verified digit-only). A digit is silently dropped in row 08 (+61 555 9876 -> '+61555986', missing 7) and row 13 (+49 555 6789 -> '+49555678', missing 9). The 13 remaining rows are correct (e.g. 0044->+44, 030 72344321->+493072344321, local 555-4321->null), but a 'normalize the phone numbers' showcase displaying letters inside phone numbers is visitor-visible wrongness.
- ℹ️ **Load a file, transform it, then save and reuse**: Then-assertions are weak ('spec has 1 transformation' + 'no toast') — they can never catch the garbled cassette values, which is how l-for-1 outputs shipped. Cassette (loadsave.json) should be re-recorded or hand-fixed for rows 04/08/12/13/14/17/20. Five homepage items sharing one 2-step tour means the save/flow/py/undo promises rest entirely on illustrations, not demonstrated behavior; consider extending the scenario with :save/:save-flow/:save-py/:undo steps or splitting tours.

## Cross-cutting

- **Weak `Then` steps are why all of this ships green.** Every `@tour` scenario asserts
  only transformation-count + no-toast. A golden-rows assertion (even on 3 rows) would
  have caught 10 of the 14 fails.
- **Cassette hygiene**: `classify.json` carries stale duplicate recordings (an older
  Male/Female/Unknown gender variant and fenced-vs-plain response pairs). Harmless at
  replay time (fingerprint lookup) but dead weight worth pruning when re-recording.
- **Illustrations drift toward the pitch, not the product**: several SVGs depict data or
  results the tour never shows (orders join, categorical sentiment, $120 memo amount,
  4-step flow history). Where the fixture is small the best illustrations (city-country,
  prices, ticket-label) simply draw the real rows — that pattern is worth standardizing.
- **Fixtures should contain the flagship case the homepage brags about**: no US/EU-
  ambiguous date for "03/04", no empty phone for "Flag rows with empty Phone", no
  miscapitalized name for the capitalization tour, only 5 rows for "top 10".

## Suggested next steps (not done in this PR)

1. Fix the engine's string-vs-numeric sort compare (hits two tours; probably user data too).
2. Re-record the garbled/broken cassettes: phone normalization (3 tours), capitalization,
   city-country (order the mutate before the validate), prices, emails, address split.
3. Align fixtures with the homepage promises (add the ambiguous date, a miscapitalized
   name, an empty phone, more sales rows) and re-record.
4. Fix the join and pivot homepage captions + SVGs, or repoint the tours at fixtures
   that match the captions.
5. Add golden-row `Then` assertions to `@tour` scenarios so CI sees output, not just
   transformation counts.

Audit artifacts (per-tour replay dumps and raw checklists) were produced in a scratch
session; the replay method is reproducible from the Method section above.
