# Test tree

A hand-reviewed map of every Gherkin feature and scenario in the repo, file by
file. For each scenario: **what it tests** and a **ToDo** — a short cleanup /
DRY idea, or `NA` when there's nothing worth changing. Scenario tags show which
surfaces run it (`@headless`, `@cli`, `@web`), whether it is a marketing tour
(`@tour`) and its panel category (`@cat-…`), and `@offline` / `@scripted` /
`@cancel` runner modes.

App behavior lives in [`test-cases/`](test-cases/); library-package behavior in
[`packages/`](packages/). This file is maintained by hand — the point is the
review, not a regenerated listing.

## Cross-file observations (DRY)

- **Tour scenarios are intentionally one-each, not collapsible.** The ~28
  `@tour` scenarios (clean-up, enrich, classify, language-ai, validate, sort,
  voice, multilingual, filter, dedupe, join, pivot, loadsave) all share the same
  shape — load a sample → run a phrase → assert `spec has N transformation` +
  `no toast`. They look like Scenario-Outline bait, but they **must** stay
  separate: the tour parser skips `Scenario Outline` (see
  `packages/gherkin-tour/gherkin-tour.feature`), and the homepage "Show me →"
  deep links key on each scenario's exact name. The repetition is required.
- **URL validation is covered twice.** `packages/file-io/file-io.feature` tests
  the library (blank / garbage / non-http / network / HTTP-status); `web.feature`
  re-tests non-http / invalid / empty through the dialog. The web ones are thin
  integration checks over the same logic — could shrink to one "an invalid URL
  surfaces the error" case.
- **`Export … data` + `Execute saved flow from command line`** repeat across
  `filter`, `dedupe` (and `datanorm` / `convert` have sibling execute-flow
  scenarios). Same subset→export→replay pattern per op — fine as per-op proof,
  but a candidate to fold into one shared "a saved flow round-trips" scenario if
  it grows.
- **`exit` vs `:exit`** in `repl-commands.feature` are two scenarios for one
  behavior reached two ways — trivially mergeable.
- **`multilingual.feature`** has 5 text + 5 voice scenarios, one per language.
  The four non-Spanish **text** ones (not tours) could be a Scenario Outline; the
  voice ones each need their own clip and the Chinese one documents a real
  synthetic-audio gap — keep those.

# spec/test-cases/ — application behavior

### `aggregate.feature` — Group and aggregate
Group-collapse with count/sum/avg; output shape, row-order, LLM aggregation, empty input. Fixtures: `datanorm-input.csv`, `aggregate-by-country-expected.jsonl`, `filter-input.csv`, `aggregate-empty-input.jsonl`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Count customers per country `@headless @cli @web` | By-Country group yields a customer_count column; matches expected output | NA |
| Aggregate produces one row per distinct by-tuple `@headless @cli @web` | Row count equals distinct Country count | NA |
| by-keys and agg columns replace the prior column list `@headless @cli @web` | FirstName and Phone absent post-group | NA |
| Output row order matches first appearance of each group `@headless @cli` | Rows ordered by first Country occurrence | NA |
| Summarize each group with an LLM aggregate `@headless @cli` | LLM produces one non-null summary per Country | NA |
| Group on an empty table produces zero rows `@headless @cli` | Empty input yields zero output rows | NA |

### `cancelation.feature` — Cancel long-running LLM transformation
Cancellation behaviour: partial-result visibility, in-flight revert, prior-work persistence.

| Scenario | What it tests | ToDo |
|---|---|---|
| Partial results visible while the LLM transformation runs `@headless @cli @web` | Transformed rows show as chunks complete | NA |
| Cancellation reverts the in-flight transformation `@headless @cli @web` | Cancel stops within 2s, removes spec entry, reverts table | NA |
| Cancellation does not affect previously-applied transformations `@headless @cli @web` | Earlier columns remain after cancel | NA |

### `cassettes.feature` — Record and replay model API calls
Headless fetch-wrapper contract: faithful replay, loud fail on misses, record-once reuse — the thing that makes the suite offline.

| Scenario | What it tests | ToDo |
|---|---|---|
| A request is sent through the caller-supplied fetch `@headless @offline` | Model call routed via the supplied fetch | NA |
| A recorded request replays verbatim without a network call `@headless @offline` | Cassette replay matches recording, no network | NA |
| An unrecorded request fails loudly `@headless @offline` | Missing entry → loud error, no network fallback | NA |
| A changed request body is a miss, not a stale hit `@headless @offline` | Mutated body → miss, not stale replay | NA |
| Record mode saves a fresh response, then serves repeats from disk `@headless @offline` | Records upstream once, then serves from cassette | NA |

### `classify.feature` — Classify tours
Marketing tours; each loads a sample, runs a phrase, replays `classify.json`; asserts 1 transformation + no toast.

| Scenario | What it tests | ToDo |
|---|---|---|
| Label each ticket as billing, bug, or feature `@web @tour @cat-classify` | Ticket classification via phrase replay (tickets.csv) | NA |
| Score the sentiment of every review `@web @tour @cat-classify` | Sentiment scoring via phrase replay (reviews.csv) | NA |
| Sort the titles by seniority `@web @tour @cat-classify` | Title ordering by seniority (titles.csv) | NA |
| Split customers into men, women, and unknown `@web @tour @cat-classify` | Gender classification (datanorm-input.csv) | NA |

### `clean-up.feature` — Clean up tours
Marketing tours; each loads `datanorm-input.csv`, runs a phrase, replays `clean-up.json`; asserts 1 transformation + no toast.

| Scenario | What it tests | ToDo |
|---|---|---|
| Normalize the phone numbers `@web @tour @cat-cleanup` | Phone normalization via phrase replay | NA |
| Make the country names consistent `@web @tour @cat-cleanup` | Country consistency via phrase replay | NA |
| Fix the capitalization of names `@web @tour @cat-cleanup` | Name capitalization via phrase replay | NA |
| Clean up the birth dates `@web @tour @cat-cleanup` | Birth-date cleanup via phrase replay | NA |

### `cli-flags.feature` — CLI invocation flags
Flag parsing at startup (help, version, unknown), all offline.

| Scenario | What it tests | ToDo |
|---|---|---|
| --help prints the CLI usage screen and exits 0 `@cli @offline` | --help lists execute / --input / --output / ANTHROPIC_API_KEY | NA |
| --help does not list REPL slash commands `@cli @offline` | --help excludes :undo / :redo / :show / :find / :schema | NA |
| -h is an alias for --help `@cli @offline` | -h produces the same usage screen | NA |
| --version prints the version and exits 0 `@cli @offline` | --version prints version string, exit 0 | NA |
| -v is an alias for --version `@cli @offline` | -v matches --version | NA |
| --version does not start the REPL or list slash commands `@cli @offline` | --version output excludes :help / :undo / Usage: | NA |
| bare "help" subcommand also prints CLI usage `@cli @offline` | `help` (no dashes) prints the usage screen | NA |
| No arguments hints at --help `@cli @offline` | Bare invocation exits 1, suggests --help on stderr | NA |
| Unknown option points to --help `@cli @offline` | Unknown flag exits 1, mentions --help | NA |

### `colsplit.feature` — Column split
Declarative 1→N split by literal or regex separator; padding, truncation, nulls, LLM extraction. Fixtures: `colsplit-fullname-input.csv`, `colsplit-addresses-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Split FullName into FirstName and LastName on space `@headless @cli @web` | Space-separator split; source retained | NA |
| Source column stays unless drop is set `@headless @cli` | Default preserves FullName | NA |
| Source column is removed when drop is set `@headless @cli` | drop removes source after split | NA |
| Split Address into Street, City, Zip on comma-space `@headless @cli` | Regex separator splits into three columns | NA |
| Too few parts pad the tail with null `@headless @cli` | "Cher" → FirstName="Cher", LastName=null | NA |
| Too many parts concatenate the extras onto the last column `@headless @cli` | "Mary Jane Watson" → LastName="Jane Watson" | NA |
| An empty input cell produces nulls in every output column `@headless @cli` | Empty string → all-null outputs | NA |
| Split with an LLM expression returning an array of parts `@headless @cli` | LLM split handles messy international names | NA |

### `convert.feature` — Tabular format output
CSV/JSONL via `:save` and batch execute, RFC-4180 quoting, nulls, nested objects, `:reorder`, round-trips. Fixtures: `datanorm-input.{csv,jsonl}`, `datanorm.flow`, `filter-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| :save writes CSV when the extension is .csv `@cli @offline` | CSV dispatch on extension | NA |
| :save still writes JSONL when the extension is .jsonl `@cli @offline` | JSONL dispatch on extension | NA |
| :save rejects an unknown output extension `@cli @offline` | Unknown extension error | NA |
| Fields with commas, quotes, or newlines are quoted `@headless @cli` | RFC-4180 quoting | NA |
| Null and undefined render as empty cells `@headless @cli` | null/undefined → empty string | NA |
| Nested objects serialize as compact JSON inside the cell `@headless @cli` | Nested object JSON in a CSV cell | NA |
| Execute saved flow with CSV output `@cli` | Batch execute → CSV, validated | NA |
| Execute fails clearly when --output extension is unknown `@cli` | Unknown output extension error (batch) | NA |
| :reorder changes the CSV header order `@cli @offline` | Reorder affects output header | NA |
| Load JSONL, save CSV `@cli` | JSONL→CSV conversion round-trip | NA |

### `datanorm.feature` — Data normalization of customer records
Normalize Phone/Country/DOB with round-trip validation; Outline mutation, composite replace-column, web dialogs, CLI execute. Fixtures: `datanorm-input.csv`, `datanorm-expected.jsonl`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Normalize &lt;column&gt; `@headless @cli @web` | Outline (Phone, Country, DOB) each match expected | NA |
| Full normalization round-trip `@headless @cli @web` | All three normalized → export matches expected (ignoring Notes) | NA |
| Replace Country with normalized CountryName and CountryISO `@headless @cli` | Country dropped; CountryName + CountryISO added, non-null | NA |
| Load CSV via Open File dialog `@web` | Dialog → select file → 5+ rows render | overlaps web.feature "Load CSV via the Open File dialog" |
| Save flow via Save File dialog `@web` | Save dialog → datanorm.flow has steps | overlaps web.feature "Save flow via the Save File dialog" |
| Execute saved flow from command line `@cli` | `tamedtable execute datanorm.flow` matches expected | NA |

### `debug.feature` — Debug output
`[debug]` block after NL requests (expression + token usage); suppressed for `:` commands and batch execute.

| Scenario | What it tests | ToDo |
|---|---|---|
| Debug block shows the executed expression and a usage summary `@cli` | [debug] holds expression + token count on NL query | NA |
| REPL ":" commands print no debug block `@cli @offline` | :schema / :undo suppress debug | NA |
| "tamedtable execute" prints no debug block `@cli @offline` | Batch execute suppresses debug | NA |

### `dedupe.feature` — Deduplicate customer records
Dedupe by column key, export, execute saved flow — parallel to filter.feature.

| Scenario | What it tests | ToDo |
|---|---|---|
| Drop duplicates by Email `@headless @cli @web @tour @cat-deterministic` | Email-keyed dedupe via phrase (3 surfaces) | NA |
| Export deduplicated data `@headless @cli @web` | Export to JSONL after dedupe | see DRY note (export+execute pattern) |
| Execute saved flow from command line `@cli` | CLI runs dedupe.flow | see DRY note |

### `enrich.feature` — Enrich and extract tours
Marketing tours; each loads a distinct CSV, runs a phrase, replays `enrich.json`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Split the address into its parts `@web @tour @cat-enrich` | Address splitting (address.csv) | NA |
| Fill the country from the city column `@web @tour @cat-enrich` | Country-from-city (cities.csv) | NA |
| Add the industry for each company `@web @tour @cat-enrich` | Industry enrichment (companies.csv) | NA |
| Extract the amount and date from the memo `@web @tour @cat-enrich` | Memo → 2 columns (memos.csv); asserts 2 transformations | NA |

### `filter.feature` — Filter customer records
Filter by predicate, export, execute saved flow.

| Scenario | What it tests | ToDo |
|---|---|---|
| Filter by Country `@headless @cli @web @tour @cat-deterministic` | USA filter via phrase (3 surfaces) | NA |
| Export filtered data `@headless @cli @web` | Export to JSONL after filtering | see DRY note (export+execute pattern) |
| Execute saved flow from command line `@cli` | CLI runs filter.flow | see DRY note |

### `join.feature` — Lookup join
Left/inner join enrich; nulls, rename collisions, multi-format inputs, undo. Fixtures: `datanorm-input.csv`, `join-country-codes.{csv,jsonl}`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Left join enriches each customer with ISO and Region `@headless @cli @web @tour @cat-deterministic` | Left join adds ISO + Region; FirstName preserved | NA |
| Unmatched left rows get null right-side columns `@headless @cli` | "Atlantis" → ISO/Region null | NA |
| Inner join removes left rows without a match `@headless @cli` | Inner join drops Atlantis | NA |
| Right column with the same name as a left column is renamed `@headless @cli` | Country collision → Country + Country_2 | NA |
| join.with with .jsonl loads as JSONL `@headless @cli` | Extension dispatch for .jsonl | NA |
| join.with with an unknown extension rejects at validation `@headless @cli @offline` | .parquet rejected, exit 2 | NA |
| :undo removes the joined columns `@headless @cli` | Undo reverses join | NA |

### `language-ai.feature` — Language tours
Marketing tours; load comments.csv / reviews.csv, run a phrase, replay `language-ai.json`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Summarize each review in one line `@web @tour @cat-language` | Review summarization | NA |
| Translate the comments to English `@web @tour @cat-language` | Comment translation | NA |
| Tag the language of every comment `@web @tour @cat-language` | Per-row language detection | NA |

### `loadsave.feature` — Load, save and reuse tour
Single combined tour; the homepage save / undo / save-flow / save-py items all deep-link here.

| Scenario | What it tests | ToDo |
|---|---|---|
| Load a file, transform it, then save and reuse `@web @tour @cat-loadsave` | Load → query → (save/reuse) workflow via replay | NA |

### `multilingual.feature` — Multilingual requests
Phone-normalization asked in 5 languages, as text and voice; `datanorm-input.csv` + espeak-ng TTS clips.

| Scenario | What it tests | ToDo |
|---|---|---|
| Normalize phone numbers in Spanish `@headless @web @tour @cat-language` | Spanish text normalizes Phone | NA |
| German text request `@headless @web` | German text normalizes Phone | 4 non-Spanish text rows → Scenario Outline |
| French text request `@headless @web` | French text normalizes Phone | see above |
| Croatian text request `@headless @web` | Croatian text normalizes Phone | see above |
| Chinese text request `@headless @web` | Chinese text normalizes Phone | see above |
| Spanish voice request `@web` | Spanish voice triggers normalization | NA |
| German voice request `@web` | German voice triggers normalization | NA |
| French voice request `@web` | French voice triggers normalization | NA |
| Croatian voice request `@web` | Croatian voice triggers normalization | NA |
| Chinese voice request — pipeline runs, synthetic audio mis-heard `@web` | Pipeline completes; asserts only completion (documents TTS gap) | NA |

### `pivot.feature` — Pivot and unpivot
Wide↔long reshape; pivot agg, null-fill, unpivot multiplier, custom names. Fixtures: `pivot-long-input.csv`, `pivot-wide-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| One column per distinct on-value, default agg first `@headless @cli @web @tour @cat-deterministic` | Pivot Quarter → Q1–Q4; Quarter/Revenue dropped | NA |
| agg=sum collapses multiple values per index/on cell `@headless @cli` | Duplicate EU/Q1 rows sum | NA |
| Missing combinations render as null `@headless @cli` | APAC/Q3 absent → null | NA |
| One row per distinct index tuple `@headless @cli` | Output rows = distinct Region count | NA |
| One row per measure per input row `@headless @cli @web` | Unpivot Q1–Q4 → 4× rows; name + value columns | NA |
| Custom names_to and values_to `@headless @cli` | Unpivot with custom output names | NA |

### `placeholders.feature` — LLM cell placeholders
Runtime `{Column}` / `{*}` substitution in per-row LLM prompts; expansion, errors, cache dedup, scope.

| Scenario | What it tests | ToDo |
|---|---|---|
| {Column} substitutes the row's value verbatim `@headless @offline` | {A} in "Greet {A}" → "Greet hello" | NA |
| {Column} referencing an unknown column is an evaluation-time error `@headless @offline` | {NotAColumn} → placeholder error via recovery loop | NA |
| {*} inside mutate.value expands to other columns and excludes the target `@headless @offline` | {*} excludes the target column | NA |
| {*} inside filter.pred expands to all columns `@headless @offline` | {*} includes all columns in a predicate | NA |
| Cache reuse — without {*} two rows with identical primary input dedupe `@headless @offline` | Identical primary input → 1 model call | NA |
| Cache miss — with {*} two rows with identical primary input call twice `@headless @offline` | {*} with differing other cols → 2 calls | NA |

### `repl-commands.feature` — REPL commands
The interactive `:`-commands (undo/redo/history/load/save/save-flow/show/find/schema/help/exit/viewport), offline and with one LLM round-trip. Fixtures: `dedupe-input.csv`, `datanorm-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| :help echoes the pinned REPL usage screen in-session `@cli @offline` | Help lists key commands + ANTHROPIC_API_KEY | NA |
| :help does not mention CLI batch invocations `@cli @offline` | Help excludes execute / --input / --output | NA |
| exit closes the REPL with code 0 `@cli @offline` | Bare `exit` returns success | merge with `:exit` (one behavior, two spellings) |
| :exit closes the REPL with code 0 `@cli @offline` | `:exit` returns success | merge with `exit` |
| :undo on a freshly loaded CSV says nothing to undo `@cli @offline` | Undo on empty stack message | NA |
| :redo on an empty redo stack says nothing to redo `@cli @offline` | Redo on empty stack message | NA |
| :undo then :redo restores the committed state `@cli` | Undo+redo returns to normalized form | NA |
| a new NL request clears the redo stack `@cli` | New request after undo empties redo | NA |
| :history lists turns with their commit status `@cli` | History shows turn #, name, [undone] | NA |
| :schema prints one line per column `@cli @offline` | Schema lists all columns | NA |
| bare :show reprints the current viewport `@cli @offline` | :show shows the default page | NA |
| :show rows next advances by one page and shows the top marker `@cli @offline` | Forward paging + "…more rows" marker | NA |
| :show rows end jumps to the last page `@cli @offline` | Jump to final rows | NA |
| :show rows N snaps to the page containing row N `@cli @offline` | :show rows 15 → that page | NA |
| :show rows N clamps when N is out of range `@cli @offline` | :show rows 9999 clamps to last page | NA |
| :show cols next advances the column window and shows the left marker `@cli @offline` | Column paging + left marker | NA |
| :find substring matches case-insensitively and wraps the match `@cli @offline` | :find canada wraps match in *…* | NA |
| :find /regex/ matches by pattern `@cli @offline` | :find /\+44/ by regex | NA |
| :find with no match prints no match and does not reprint `@cli @offline` | Failed search: "no match", no reprint | NA |
| :find with no argument prints usage `@cli @offline` | :find → "missing pattern" | NA |
| viewport resets to (0,0) after a committed NL request `@cli` | View jumps to top-left after commit | NA |
| viewport resets to (0,0) after :load `@cli @offline` | View resets after :load | NA |
| :load without a path prints usage `@cli @offline` | :load → "missing path" | NA |
| :load with an unknown extension prints unknown file type `@cli @offline` | :load notes.txt rejected | NA |
| :load success prints row/col counts `@cli @offline` | :load confirms "20 rows, 6 cols" | NA |
| :show and :find do not enter the patch journal `@cli @offline` | View commands don't record turns | NA |
| :save without a path prints usage `@cli @offline` | :save → "missing path" | NA |
| :save writes current rows to a JSONL file `@cli @offline` | :save creates file, confirms saved | NA |
| :save-flow without a path prints usage `@cli @offline` | :save-flow → "missing path" | NA |
| :save-flow writes a replayable flow file `@cli @offline` | :save-flow creates a .flow | NA |
| bare :viewport prints current page size and source `@cli @offline` | :viewport shows size + auto/manual | NA |
| :viewport with explicit rows and cols shrinks the page `@cli @offline` | :viewport 5 3 limits display + markers | NA |
| :viewport pins only rows when cols is auto `@cli @offline` | :viewport 5 auto pins rows | NA |
| :viewport pins only cols when rows is auto `@cli @offline` | :viewport auto 3 pins cols | NA |
| :viewport auto clears prior pins on both axes `@cli @offline` | :viewport auto resets both | NA |
| :viewport pins survive :load and viewport-cursor resets `@cli @offline` | Manual size persists across :load | NA |
| :viewport with a non-positive integer prints invalid size `@cli @offline` | :viewport 0 3 → "invalid size" | NA |
| :viewport with malformed args prints usage `@cli @offline` | :viewport foo → usage | NA |
| :viewport does not enter the patch journal `@cli @offline` | :viewport doesn't record turns | NA |

### `save-py.feature` — Export a flow as a Python script
`:save-py` exports a deterministic flow; rejects LLM cells; arg validation.

| Scenario | What it tests | ToDo |
|---|---|---|
| :save-py exports a deterministic flow as a Python script `@cli` | Filter flow → runnable Python (uv header) | NA |
| :save-py refuses a flow that contains an LLM cell `@cli` | Rejects when LLM cells present | NA |
| :save-py rejects a non-.py output path `@cli @offline` | Validates .py extension | NA |
| :save-py with no path prints usage `@cli @offline` | Usage when path missing | NA |

### `sort.feature` — Sort rows by a key
Sort on {js}/{sql}/{llm} keys with optional top-N limit; one marketing tour. Fixtures: `sort-input.csv`, `sales.csv`, `sort-*.flow`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Sort by a {js} key, descending, limited to the top 2 `@cli @offline` | JS sort + limit | NA |
| Sort by revenue, top 10 `@web @tour @cat-deterministic` | Revenue top-N via phrase replay (sales.csv) | NA |
| Sort by a {js} key, descending `@cli @offline` | JS sort, no limit | NA |
| Sort by a {sql} key, descending `@cli @offline` | SQL sort, no limit | NA |

### `sql.feature` — SQL expressions
`{sql}` as scalar/predicate/aggregate via DuckDB, plus state and cancellation. Fixtures: `datanorm-input.csv`, `performance-liked-videos.csv`, `filter-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| SQL scalar fills a new column `@headless @cli` | SQL scalar in mutate creates a column | NA |
| SQL parse error flows through the recovery loop `@headless @cli @scripted` | Invalid SQL routes to recovery | NA |
| SQL predicate filters rows `@headless @cli` | SQL WHERE-style filter | NA |
| SQL aggregate inside group `@headless @cli` | SQL aggregate in group context | NA |
| SQL sees the latest committed rows after :undo `@headless @cli` | DuckDB reflects undo | NA |
| Reloading input resets the DuckDB relation `@headless @cli` | :load clears prior SQL columns | NA |
| Ctrl-C interrupts a long-running SQL aggregate `@headless @cli @cancel @scripted` | Cancel stops in-flight SQL, no spec change | NA |
| Cancellation leaves the DuckDB relation intact for the next request `@headless @cli @cancel @scripted` | State survives cancel | NA |
| Cancellation does not affect previously-applied SQL transformations `@headless @cli @cancel @scripted` | Prior SQL columns survive cancel | NA |
| A SQL query that ignores interrupt drains within the next request `@headless @cli @cancel @scripted` | Lingering query drained by next request | NA |

### `tutorial.feature` — Tutorial (Tours) panel
The Tours panel: lists `@tour` scenarios grouped by category, replays them key-free via WebController (no browser).

| Scenario | What it tests | ToDo |
|---|---|---|
| Tutorial button opens the panel `@web` | Button shows the panel | NA |
| The clickable list shows only @tour scenario names `@web` | Lists named @tour tours only | NA |
| The tutorial list is grouped by feature category `@web` | Tours grouped under Clean up / Validate / Deterministic / Language | NA |
| The Dev dropdown lists @web non-@tour scenarios `@web` | Dev shows @web non-@tour; hides tours | NA |
| Play starts the tutorial at step 1 `@web` | Select + play → step 1 | NA |
| Play closes the tutorial panel `@web` | Playing hides the panel | NA |
| Next executes the current step and advances `@web` | Next runs step, moves to step 2 | NA |
| Cancel exits the tutorial `@web` | Cancel deactivates | NA |
| Play again after cancel restarts at step 1 `@web` | Re-play resets to step 1 | NA |
| Finish after last step returns to the tutorial chooser `@web` | Finish reopens panel, deactivates | NA |
| Finishing a deep-link tour opens the Tutorial chooser panel `@web` | Deep-link finish reopens panel | overlaps "Finish after last step" (panel vs deep-link entry) |
| A query step prefills the chat input when highlighted `@web` | prefill-chat fills the input | NA |
| Running a query step clears the prefilled chat input `@web` | Advancing past a query clears the input | NA |
| A load-file step loads the fixture on Next `@web` | load-file auto-loads the table | NA |
| A show-golden step makes the golden rows available after execution `@web` | Golden rows appear after the last step | NA |
| A prefill-chat step replays from the tour's cassette, key-free `@web` | Query replays cassette → 1 transformation, no toast | NA |
| A play-audio step replays the voice cassette against Gemini, key-free `@web` | Voice step replays → 1 transformation, no toast | NA |
| The join tour skips the lookup-table step `@web` | load-lookup is silent; step 2 is the query | NA |
| Playing a tour to the end marks it complete `@web` | Finishing sets completion (persisted) | NA |
| A valid feature and scenario autoplays from step 1 `@web` | Deep link autoplays, panel hidden | NA |
| An unknown scenario leaves the panel closed `@web` | Unknown deep link: panel closed, inactive | NA |
| A missing scenario param leaves the panel closed `@web` | Empty scenario param: panel closed, inactive | NA |

### `validate.feature` — Row and dataset validation
`validate` adds `_valid`/`_validation`; thresholds, additivity, overwrite; 4 marketing tours. Fixtures: `datanorm-input.csv`, `emails.csv`, `birthdates.csv`, `citycountry.csv`, `prices.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| Flag rows with empty Phone `@headless @cli @web @tour @cat-validate` | Adds _valid/_validation; marks empty Phone | NA |
| validate is additive — no rows are dropped `@headless @cli` | Row count preserved | NA |
| filter on _valid keeps only passing rows `@headless @cli` | validate+filter chain keeps passing rows | NA |
| Failing more than the threshold aborts the request `@headless @cli` | >20% fail → reject + rollback | NA |
| Failing within the threshold commits the transformation `@headless @cli` | Within bounds → commit | NA |
| Flag emails that look fake `@web @tour @cat-validate` | Tour: emails.csv → 1 transformation, no toast | NA |
| Flag any impossible birth date `@web @tour @cat-validate` | Tour: birthdates.csv → 1 transformation | NA |
| Check the city matches the country `@web @tour @cat-validate` | Tour: citycountry.csv → 2 transformations | NA |
| Flag prices that seem wrong `@web @tour @cat-validate` | Tour: prices.csv → 1 transformation | NA |
| A second validate replaces the prior _valid and _validation `@headless @cli` | Second validate overwrites reserved columns | NA |

### `voice.feature` — Voice input
Mic button (Gemini-only) gating, press-hold-release round-trip, cancel, errors, one tour. Fixtures: `datanorm-input.csv`, `voice-*.m4a`, cassettes.

| Scenario | What it tests | ToDo |
|---|---|---|
| The mic is hidden when the selected model has no voice support `@web` | gemini→anthropic hides the mic | NA |
| The mic is hidden when Google has no Gemini key `@web` | gemini selected, no key → hidden | NA |
| The mic is shown when Google is selected with a Gemini key `@web` | gemini + key → shown | NA |
| The mic is hidden for an OpenAI model even with a key `@web` | OpenAI → hidden regardless of key | NA |
| Holding then releasing the mic produces a user bubble and an assistant reply `@web` | Full record→send→reply, 1 transformation | NA |
| A spoken "normalize DOB column" request applies a transformation `@web` | Voice normalization; transcript bubble + spec update | NA |
| Escape cancels a recording without sending anything `@web` | Escape aborts; no chat/spec change | NA |
| Normalize DOB by voice `@web @tour @cat-language` | Tour: key-free voice via cassette | overlaps the press-hold-release scenario (tour vs gesture) |
| A model error surfaces a toast and changes nothing `@web` | Bad key → toast + assistant msg, spec untouched | NA |

### `web.feature` — Web front-end
Browser-only flows (dialogs, settings, cell edit, reorder, paging, footer) with no real API calls. Fixtures: `datanorm-input.csv`, `paginate-input.csv`, mock LLM responses.

| Scenario | What it tests | ToDo |
|---|---|---|
| A request without an API key surfaces a toast and changes nothing `@web` | Missing key → toast, spec empty | NA |
| A text request needs an Anthropic key even when Google is selected `@web` | Text still needs Anthropic key | NA |
| Saving an API key in the settings panel configures the engine `@web` | Settings persists key to engine | NA |
| Load CSV via the Open File dialog `@web` | Dialog → CSV renders 5+ rows | overlaps datanorm.feature dialog scenario |
| Opening an empty file yields an empty table without an error `@web` | Empty file: 0 rows, no toast | NA |
| Save flow via the Save File dialog `@web` | Cell edit → save dialog persists flow | overlaps datanorm.feature save scenario |
| Without File System Access support, saving falls back to a download `@web` | Download fallback when FSA absent | NA |
| Opening the URL dialog shows it `@web` | URL dialog opens | NA |
| Closing the URL dialog hides it `@web` | URL dialog closes | NA |
| Loading a CSV from a URL renders the table `@web` | CSV from URL renders | NA |
| Loading a JSONL from a URL renders the table `@web` | JSONL from URL renders | NA |
| A non-http URL is rejected with a clear error `@web` | ftp:// rejected with "http" | see DRY note (URL validation dup vs file-io) |
| An invalid URL string is rejected with a clear error `@web` | Malformed URL rejected | see DRY note |
| An empty URL is rejected `@web` | Empty URL → "Enter a URL" | see DRY note |
| Editing a cell appends a mutate transformation `@web` | Cell edit → 1 transformation, value persists | NA |
| Undo reverts a cell edit `@web` | Undo reverts the edit | NA |
| Reordering columns by drag updates the column order `@web` | Drag → column becomes first | NA |
| Undo reverts a column reorder `@web` | Undo reverts the reorder | NA |
| A freshly loaded table opens on the first page `@web` | Large table opens on page 1 (20 rows) | NA |
| Moving to the next page shows the following rows `@web` | Page 2 shows next 20 | NA |
| The last page shows only the remaining rows `@web` | Final page shows remainder | NA |
| Paging past the last page clamps to the last page `@web` | Page 99 clamps to last | NA |
| A freshly loaded table is idle with no cell selected `@web` | Footer "idle", no selection | NA |
| Selecting a cell reports its location in the footer `@web` | Footer shows cell coords | NA |
| Saving data marks the footer as saved `@web` | Footer reports "saved" after save | NA |
| Editing a cell returns the footer to idle after a save `@web` | Edit resets footer from saved→idle | NA |
| The web app defaults to the Sonnet model `@web` | Default model claude-sonnet-4-6 | NA |
| Choosing a model keeps the loaded table intact `@web` | Model switch preserves data | NA |
| Settings panel opens with three provider cards `@web` | Three collapsed provider cards | NA |
| Clicking the Google card expands it and selects Google `@web` | Gemini card expands + selects | NA |
| Clicking the Google card shows the GEMINI_API_KEY env hint `@web` | Gemini card shows env hint | NA |
| Clicking a second card collapses the first `@web` | Accordion behaviour | NA |
| Clicking the OpenAI card shows GPT models without voice tags `@web` | OpenAI lists gpt models, voice=false | NA |
| Clicking an already-open card collapses it `@web` | Accordion toggle closes | NA |
| Clicking the Anthropic card shows the ANTHROPIC_API_KEY env hint `@web` | Anthropic card shows env hint | NA |
| Clicking the OpenAI card shows the OPENAI_API_KEY env hint `@web` | OpenAI card shows env hint | thin; folds into the OpenAI-models scenario |
| Settings panel opens with the currently selected provider card expanded `@web` | Panel reopens with selected provider expanded | NA |
| A Gemini request with a wrong key shows a descriptive error `@web` | 401 Gemini → "Invalid API key" toast | NA |
| An OpenAI request with a wrong key shows a descriptive error `@web` | 401 OpenAI → "Invalid API key" toast | NA |

# spec/packages/ — library packages

### `packages/chat-panel/chat-panel.feature` — Chat panel
Message list, expandable request detail, input row, mic button.

| Scenario | What it tests | ToDo |
|---|---|---|
| Sending renders a user bubble and an assistant reply `@web` | User + assistant bubbles; input clears | NA |
| An Error-prefixed reply renders in error style `@web` | Error replies styled as errors | NA |
| Request detail expands and shows the turns `@web` | Expand reveals turn history/context | NA |
| Streaming swaps send for stop, and stop cancels `@web` | Send↔stop toggle; stop cancels | NA |
| A prefill lands in the draft `@web` | Prefill populates the input | NA |
| Holding the mic records, releasing sends `@web` | Mic press/release fire voice events | NA |

### `packages/file-io/file-io.feature` — File IO
Format detection (extension + Content-Type), URL naming, HTTP fetch validation, `.flow` serialization, browser demo.

| Scenario | What it tests | ToDo |
|---|---|---|
| A .csv path is detected as csv even against a contradicting header `@headless` | Extension beats Content-Type | NA |
| A .ndjson path is detected as jsonl `@headless` | .ndjson → jsonl | NA |
| Content-Type decides when the path has no table extension `@headless` | Content-Type fallback | NA |
| No extension and no useful Content-Type means no format `@headless` | Both missing → no format | NA |
| The last path segment becomes the name `@headless` | URL basename → name | NA |
| A URL without a path segment falls back to download.&lt;format&gt; `@headless` | Root URL default name | NA |
| A fetched CSV comes back as a named picked file `@headless` | Fetch preserves name + content | NA |
| Blank input asks for a URL `@headless` | Empty input validation | see DRY note (URL validation) |
| Garbage input is rejected as not a URL `@headless` | Malformed URL rejected | see DRY note |
| Non-http protocols are rejected `@headless` | Non-HTTP blocked | see DRY note |
| A network failure is rewritten to an actionable message `@headless` | Network error message | NA |
| An HTTP error reports the status `@headless` | HTTP status surfaced | NA |
| An undetectable format is refused `@headless` | Undetectable format refused | NA |
| serializeFlow wraps the spec with version and source `@headless` | .flow JSON shape | NA |
| A spec with no table falls back to input.csv `@headless` | Default source name | NA |
| Fetching a CSV URL fills the preview `@web` | Browser fetch → preview | NA |
| Content-Type rescues an extension-less URL `@web` | Browser Content-Type path | NA |
| A failed fetch shows the error inline `@web` | Browser error display | NA |
| The demo reports the browser's file dialog capability `@web` | FSA capability reporting | NA |

### `packages/gherkin-tour/gherkin-tour.feature` — Gherkin Tour parser + driver
Zero-dep parser and driver. Several scenarios feed embedded Gherkin **doc-strings** to `parseTours` as test data — those inner `Scenario:` lines are inputs, not real scenarios, so they are not listed here.

| Scenario | What it tests | ToDo |
|---|---|---|
| A scenario is returned regardless of tags `@headless` | Untagged scenarios still parse | NA |
| Tags are captured on the scenario `@headless` | @web/@tour tags captured | NA |
| Multiple scenarios are all returned `@headless` | Many scenarios in one feature | NA |
| Top-level Background steps prepend `@headless` | Feature Background prepends to all | NA |
| Rule-scoped Background prepends only to scenarios under that Rule `@headless` | Rule Background scoped correctly | NA |
| load-file action from load "X" `@headless` | Parses load-file | NA |
| load-lookup action from load the lookup table "X" `@headless` | Parses load-lookup | NA |
| prefill-chat action from query "Y" `@headless` | Parses prefill-chat | NA |
| play-audio action from Play voiceover: "X" `@headless` | Parses play-audio | NA |
| the compare step is dropped — it collapses into the terminal stop `@headless` | compare dropped; golden lifted | NA |
| Unrecognised (verification) steps are dropped from the tour `@headless` | Non-action steps filtered | overlaps "compare step dropped" |
| the expected output step is lifted onto the scenario, not a step `@headless` | golden lifted to scenario | NA |
| Comment lines are skipped `@headless` | # comments ignored | NA |
| Scenario Outline is skipped silently `@headless` | Outlines ignored | NA |
| Empty input returns empty result `@headless` | Empty string → empty list | NA |
| play arms the tour at the first step `@headless` | play() → step 1 | NA |
| next executes the highlighted step then advances `@headless` | next() runs then advances | NA |
| each action dispatches to its own adapter method `@headless` | All action kinds dispatch | NA |
| reaching the terminal stop dispatches the scenario's golden file `@headless` | Terminal stop → showGolden | NA |
| advancing past the last step enters the terminal stop `@headless` | done=true, active=false | overlaps "reaching the terminal stop" |
| finishing a tour calls onFinish and ends the tour `@headless` | finish() → onFinish, deactivates | NA |

### `packages/model-config/model-config.feature` — Model config
Provider/key/model resolution (Anthropic/Gemini/OpenAI) + the ModelChooser component.

| Scenario | What it tests | ToDo |
|---|---|---|
| Empty env and empty stored yields anthropic defaults `@headless` | Default anthropic + claude-sonnet-4-6 | NA |
| ANTHROPIC_API_KEY in env sets provider and key `@headless` | Anthropic key resolves provider | NA |
| GEMINI_API_KEY in env sets provider and key `@headless` | Gemini key resolves provider | NA |
| OPENAI_API_KEY in env sets provider and key `@headless` | OpenAI key resolves provider | NA |
| Both keys in env — Gemini wins `@headless` | Anthropic+Gemini → Gemini | NA |
| All three keys in env — Gemini wins `@headless` | All three → Gemini | NA |
| ANTHROPIC_API_KEY and OPENAI_API_KEY in env — OpenAI wins `@headless` | Anthropic+OpenAI → OpenAI | the 3 precedence rows could be one Scenario Outline |
| Stored provider=gemini with no env key is used `@headless` | Stored provider used when env empty | NA |
| Env values override stored values `@headless` | Env beats stored | NA |
| TAMEDTABLE_MODEL in env overrides stored model `@headless` | Env model override | NA |
| Empty config yields the provider's cell default `@headless` | Cell model default | NA |
| TAMEDTABLE_CELL_MODEL in env overrides stored cellModel `@headless` | Env cell-model override | NA |
| A cross-provider stored cellModel is coerced to the provider cell default `@headless` | Cross-provider cell model coerced | NA |
| providerFor returns anthropic for a claude-* id `@headless` | claude-* → anthropic | NA |
| providerFor returns gemini for a gemini-* id `@headless` | gemini-* → gemini | NA |
| providerFor returns openai for a gpt-* id `@headless` | gpt-* → openai | NA |
| defaultModel for anthropic returns claude-sonnet-4-6 `@headless` | Anthropic default model | NA |
| defaultModel for gemini returns gemini-3.5-flash `@headless` | Gemini default model | NA |
| defaultModel for openai returns gpt-5.5 `@headless` | OpenAI default model | NA |
| defaultCellModel for anthropic returns claude-sonnet-4-5 `@headless` | Anthropic cell default | NA |
| defaultCellModel for openai returns gpt-5.4-mini `@headless` | OpenAI cell default | NA |
| ALL_MODELS has at least one Anthropic and one Gemini entry `@headless` | Catalogue coverage | NA |
| ALL_MODELS has at least one OpenAI entry `@headless` | Catalogue coverage | NA |
| ALL_MODELS entries each have a voiceInput boolean `@headless` | Every entry has voiceInput | NA |
| gpt-5.5 has voiceInput false `@headless` | OpenAI voiceInput=false | NA |
| claude-sonnet-4-6 has voiceInput false `@headless` | Anthropic voiceInput=false | NA |
| gemini-3.5-flash has voiceInput true `@headless` | Gemini voiceInput=true | NA |
| Clicking a provider card expands it and selects the provider `@web` | Card expands + selects | NA |
| Clicking the expanded card collapses it without changing the provider `@web` | Toggle collapses, keeps provider | NA |
| Picking a primary model updates the resolved config `@web` | Model pick updates config | NA |
| Picking a secondary model updates the resolved cell model `@web` | Secondary pick updates cellModel | NA |
| Each expanded card deep-links to that provider's key page `@web` | Per-provider key URL | NA |
| The chooser shows a general how-to-get-a-key help link `@web` | BYOK help link | NA |
| A typed API key stays masked until the eye toggle reveals it `@web` | Key masking + reveal | NA |

### `packages/table-view/table-view.feature` — Table view
Paged grid: selection, inline edit, column reorder, and the pure pagination math.

| Scenario | What it tests | ToDo |
|---|---|---|
| There is always at least one page `@headless` | pageCountFor floors at 1 | NA |
| Out-of-range pages clamp into range `@headless` | clampPage clamps both ends | NA |
| The last page holds the remainder `@headless` | pageSlice remainder | NA |
| Short pagers render every page number `@headless` | 1..7 fully listed | NA |
| Long pagers window around the current page `@headless` | 1,…,16,17,18,…,40 | NA |
| A cursor near the edge keeps single steps reachable `@headless` | 1,2,3,4,5,…,40 | NA |
| The first page renders with its range readout `@web` | "1–10 of 95", 10 rows | NA |
| Paging moves the visible window `@web` | "11–20", last "91–95" | NA |
| Clicking a cell selects it `@web` | Footer "R3 · name" | NA |
| Double-clicking edits a cell and Enter commits `@web` | Edit persists; fires event | NA |
| Dragging a header reorders the columns `@web` | Drag reorders; fires event | NA |
| The streaming banner follows the streaming flag `@web` | Banner + "running" status | NA |

### `packages/toolbar/toolbar.feature` — Toolbar
Brand lockup, file readout, action buttons, URL dialog with sample quick-picks.

| Scenario | What it tests | ToDo |
|---|---|---|
| A .csv sample is labelled CSV, everything else JSONL `@headless` | CSV/JSONL labelling | NA |
| Action buttons fire their callbacks `@web` | Save/Undo buttons fire events | NA |
| The theme toggle flips the wrapper `@web` | Toggle fires theme event | NA |
| Opening the URL dialog, typing, and loading `@web` | Open → type → submit → event | NA |
| Picking a sample fills the URL field `@web` | Sample pick fills the field | NA |

### `packages/ui-kit/ui-kit.feature` — UI kit
Theme tokens (light/dark), brand constants, and primitive components.

| Scenario | What it tests | ToDo |
|---|---|---|
| Light and dark themes expose the same token keys `@headless` | Same keys, different values | NA |
| Brand constants carry the published hex values `@headless` | ink/accent/line hex | NA |
| All four button variants render `@web` | ghost/chrome/primary/danger | NA |
| Clicking a button reports the click `@web` | Primary click fires event | NA |
| The full icon set renders `@web` | All 19 icons render | NA |
| The theme toggle flips to dark mode and back `@web` | dark↔light toggle | NA |
| The split button menu opens, picks, and closes `@web` | SplitButton menu flow | NA |
| A toast appears and can be dismissed `@web` | Toast show + dismiss | NA |

### `packages/voice-input/voice-input.feature` — Voice input
VoicePort, MediaRecorder→WAV, and `buildVoicePrompt` context text.

| Scenario | What it tests | ToDo |
|---|---|---|
| The prompt names the file and columns `@headless` | Prompt includes file + columns | NA |
| A selected cell adds a 1-based, JSON-quoted context line `@headless` | Selected-cell context line (1-based) | NA |
| No selection means no selected-cell line `@headless` | Omits the line without selection | NA |
| The demo renders the sample prompt `@web` | Demo prompt text | NA |
| Recording round-trips to a WAV blob `@web` | Start→stop → audio/wav blob | NA |
| Cancelling discards the recording `@web` | Cancel → idle | NA |
