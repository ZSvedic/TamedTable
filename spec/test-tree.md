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

**The default suite runs every feature file.** `src/cucumber.js` globs all of
`test-cases/` + `packages/`; `TAMEDTABLE_FEATURES=a,b` narrows it for local
iteration. A scenario that calls the model needs a committed cassette to replay
offline — one missing its tape is tagged `@needs-recording` and excluded from
the default run until `bun run test:record` makes the tape (record mode includes
those scenarios). No scenario carries the tag today; the mechanism is the escape
hatch for the next one that does. (`datanorm.feature` was removed — its strict
byte-golden NL assertions were brittle and never recorded, and the normalization
behavior is covered offline by the clean-up / loadsave / multilingual tours.)

## Keeping `.feature` files small

Four levers, in rough order of safety. The first two are pure wins; the last two
trade something away — use them only where the note below says it's safe.

1. **Outline identical-shape scenarios.** When N scenarios differ only in inputs
   and expected values, fold them into one `Scenario Outline` with an `Examples`
   table (see `multilingual.feature`, `model-config.feature`, the `web.feature`
   URL-rejection rule). Two hard exceptions: **`@tour` scenarios must stay
   one-each** (the tour parser skips outlines and the homepage deep-links each by
   exact name), and an outline over `@web` non-tour scenarios silently drops them
   from the browser **Dev dropdown** (same parser skip) — acceptable, but note it.
2. **Use the plural assertion steps.** Replace a ladder of `And column "X" exists
   in the spec` with `Then columns exist in the spec: "A", "B", …` (and the
   `columns are absent from the current rows: …` mirror). Column names stay
   verbatim, so grep still finds them. Defined in `src/tests/common.steps.ts`.
3. **Combine tiny same-setup scenarios into one walkthrough** — the
   `loadsave.feature` trick. Safe **only** when assertions read *cumulative*
   output (e.g. `REPL stdout contains …`) and the session carries **no sticky
   state** between the merged steps. The four `repl-commands` clusters (`:help`,
   `:find`, `:load`, `:save`/`:save-flow`) qualify; the stateful ones (`:viewport`
   pins, `:undo`/`:redo` stack, `:show` viewport cursor) do **not** — leave them.
4. **Push library behavior down to `packages/*.feature`.** App feature files
   should keep only a thin integration pass; the exhaustive cases live in the
   package's own feature (see URL validation: `file-io.feature` owns the matrix,
   `web.feature` keeps one rejection outline).

**Failure clarity beats raw brevity.** A scenario name should still say what
broke. A 10-command walkthrough that asserts eight behaviors reports "walkthrough
failed" and makes you hunt — don't merge past the point where the name stops
describing the failure.

## Cross-file observations (DRY)

- **Tour scenarios are intentionally one-each, not collapsible** — see lever 1
  above. The `@tour` scenarios all share the load → phrase → assert shape but
  must stay separate (parser skips outlines; homepage deep-links by exact name).
- **URL validation lives in two layers, by design.**
  `packages/file-io/file-io.feature` owns the library matrix (blank / garbage /
  non-http / network / HTTP-status); `web.feature` keeps one `Scenario Outline`
  as the thin dialog integration pass. Resolved — no further folding.
- **`Export … data` + `Execute saved flow`** repeat across `filter` / `dedupe`
  (with sibling execute-flow scenarios in `convert`). Kept as per-op
  proof — each op's round-trip is worth its own scenario; fold only if the set
  grows past one-per-op.
- **`multilingual.feature`** is now 1 Spanish text tour + a 4-row text outline +
  5 voice scenarios. The voice ones each need their own clip and the Chinese one
  documents a real synthetic-audio gap — those stay separate.

# spec/test-cases/ — application behavior

### `aggregate.feature` — Group and aggregate
Group-collapse with count/sum/avg; output shape, row-order, LLM aggregation, empty input. Fixtures: `customers-input.csv`, `aggregate-by-country-expected.jsonl`, `filter-input.csv`, `aggregate-empty-input.jsonl`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Count customers per country](test-cases/aggregate.feature)<br>`@headless @cli @web` | By-Country group yields a customer_count column; matches expected output | NA |
| [Aggregate produces one row per distinct by-tuple](test-cases/aggregate.feature)<br>`@headless @cli @web` | Row count equals distinct Country count | NA |
| [by-keys and agg columns replace the prior column list](test-cases/aggregate.feature)<br>`@headless @cli @web` | FirstName and Phone absent post-group | NA |
| [Output row order matches first appearance of each group](test-cases/aggregate.feature)<br>`@headless @cli` | Rows ordered by first Country occurrence | NA |
| [Summarize each group with an LLM aggregate](test-cases/aggregate.feature)<br>`@headless @cli` | LLM produces one non-null summary per Country | NA |
| [Group on an empty table produces zero rows](test-cases/aggregate.feature)<br>`@headless @cli` | Empty input yields zero output rows | NA |

### `cancelation.feature` — Cancel long-running LLM transformation
Cancellation behaviour: partial-result visibility, in-flight revert, prior-work persistence.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Partial results visible while the LLM transformation runs](test-cases/cancelation.feature)<br>`@headless @cli @web` | Transformed rows show as chunks complete | NA |
| [Cancellation reverts the in-flight transformation](test-cases/cancelation.feature)<br>`@headless @cli @web` | Cancel stops within 2s, removes spec entry, reverts table | NA |
| [Cancellation does not affect previously-applied transformations](test-cases/cancelation.feature)<br>`@headless @cli @web` | Earlier columns remain after cancel | NA |

### `cassettes.feature` — Record and replay model API calls
Headless fetch-wrapper contract: faithful replay, loud fail on misses, record-once reuse — the thing that makes the suite offline.

| Scenario | What it tests | ToDo |
|---|---|---|
| [A request is sent through the caller-supplied fetch](test-cases/cassettes.feature)<br>`@headless @offline` | Model call routed via the supplied fetch | NA |
| [A recorded request replays verbatim without a network call](test-cases/cassettes.feature)<br>`@headless @offline` | Cassette replay matches recording, no network | NA |
| [An unrecorded request fails loudly](test-cases/cassettes.feature)<br>`@headless @offline` | Missing entry → loud error, no network fallback | NA |
| [A changed request body is a miss, not a stale hit](test-cases/cassettes.feature)<br>`@headless @offline` | Mutated body → miss, not stale replay | NA |
| [Record mode saves a fresh response, then serves repeats from disk](test-cases/cassettes.feature)<br>`@headless @offline` | Records upstream once, then serves from cassette | NA |

### `classify.feature` — Classify tours
Marketing tours; each loads a sample, runs a phrase, replays `classify.json`; asserts 1 transformation + no toast.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Label each ticket as billing, bug, or feature](test-cases/classify.feature)<br>`@web @tour @cat-classify` | Ticket classification via phrase replay (tickets.csv) | NA |
| [Score the sentiment of every review](test-cases/classify.feature)<br>`@web @tour @cat-classify` | Sentiment scoring via phrase replay (reviews.csv) | NA |
| [Sort the titles by seniority](test-cases/classify.feature)<br>`@web @tour @cat-classify` | Title ordering by seniority (titles.csv) | NA |
| [Split customers into men, women, and unknown](test-cases/classify.feature)<br>`@web @tour @cat-classify` | Gender classification (customers-input.csv) | NA |

### `clean-up.feature` — Clean up tours
Marketing tours; each loads `customers-input.csv`, runs a phrase, replays `clean-up.json`; asserts 1 transformation + no toast.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Normalize the phone numbers](test-cases/clean-up.feature)<br>`@web @tour @cat-cleanup` | Phone normalization via phrase replay | NA |
| [Make the country names consistent](test-cases/clean-up.feature)<br>`@web @tour @cat-cleanup` | Country consistency via phrase replay | NA |
| [Fix the capitalization of names](test-cases/clean-up.feature)<br>`@web @tour @cat-cleanup` | Name capitalization via phrase replay | NA |
| [Clean up the birth dates](test-cases/clean-up.feature)<br>`@web @tour @cat-cleanup` | Birth-date cleanup via phrase replay | NA |

### `cli-flags.feature` — CLI invocation flags
Flag parsing at startup (help, version, unknown), all offline.

| Scenario | What it tests | ToDo |
|---|---|---|
| [--help prints the CLI usage screen and exits 0](test-cases/cli-flags.feature)<br>`@cli @offline` | --help lists execute / --input / --output / ANTHROPIC_API_KEY | NA |
| [--help does not list REPL slash commands](test-cases/cli-flags.feature)<br>`@cli @offline` | --help excludes :undo / :redo / :show / :find / :schema | NA |
| [-h is an alias for --help](test-cases/cli-flags.feature)<br>`@cli @offline` | -h produces the same usage screen | NA |
| [--version prints the version and exits 0](test-cases/cli-flags.feature)<br>`@cli @offline` | --version prints version string, exit 0 | NA |
| [-v is an alias for --version](test-cases/cli-flags.feature)<br>`@cli @offline` | -v matches --version | NA |
| [--version does not start the REPL or list slash commands](test-cases/cli-flags.feature)<br>`@cli @offline` | --version output excludes :help / :undo / Usage: | NA |
| [bare "help" subcommand also prints CLI usage](test-cases/cli-flags.feature)<br>`@cli @offline` | `help` (no dashes) prints the usage screen | NA |
| [No arguments hints at --help](test-cases/cli-flags.feature)<br>`@cli @offline` | Bare invocation exits 1, suggests --help on stderr | NA |
| [Unknown option points to --help](test-cases/cli-flags.feature)<br>`@cli @offline` | Unknown flag exits 1, mentions --help | NA |

### `colsplit.feature` — Column split
Declarative 1→N split by literal or regex separator; padding, truncation, nulls, LLM extraction. Fixtures: `colsplit-fullname-input.csv`, `colsplit-addresses-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Split FullName into FirstName and LastName on space](test-cases/colsplit.feature)<br>`@headless @cli @web` | Space-separator split; source retained | NA |
| [Source column stays unless drop is set](test-cases/colsplit.feature)<br>`@headless @cli` | Default preserves FullName | NA |
| [Source column is removed when drop is set](test-cases/colsplit.feature)<br>`@headless @cli` | drop removes source after split | NA |
| [Split Address into Street, City, Zip on comma-space](test-cases/colsplit.feature)<br>`@headless @cli` | Regex separator splits into three columns | NA |
| [Too few parts pad the tail with null](test-cases/colsplit.feature)<br>`@headless @cli` | "Cher" → FirstName="Cher", LastName=null | NA |
| [Too many parts concatenate the extras onto the last column](test-cases/colsplit.feature)<br>`@headless @cli` | "Mary Jane Watson" → LastName="Jane Watson" | NA |
| [An empty input cell produces nulls in every output column](test-cases/colsplit.feature)<br>`@headless @cli` | Empty string → all-null outputs | NA |
| [Split with an LLM expression returning an array of parts](test-cases/colsplit.feature)<br>`@headless @cli` | LLM split handles messy international names | NA |

### `convert.feature` — Tabular format output
CSV/JSONL via `:save` and batch execute, RFC-4180 quoting, nulls, nested objects, `:reorder`, round-trips. Fixtures: `customers-input.{csv,jsonl}`, `cleanup.flow`, `filter-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [:save writes CSV when the extension is .csv](test-cases/convert.feature)<br>`@cli @offline` | CSV dispatch on extension | NA |
| [:save still writes JSONL when the extension is .jsonl](test-cases/convert.feature)<br>`@cli @offline` | JSONL dispatch on extension | NA |
| [:save rejects an unknown output extension](test-cases/convert.feature)<br>`@cli @offline` | Unknown extension error | NA |
| [Fields with commas, quotes, or newlines are quoted](test-cases/convert.feature)<br>`@headless @cli` | RFC-4180 quoting | NA |
| [Null and undefined render as empty cells](test-cases/convert.feature)<br>`@headless @cli` | null/undefined → empty string | NA |
| [Nested objects serialize as compact JSON inside the cell](test-cases/convert.feature)<br>`@headless @cli` | Nested object JSON in a CSV cell | NA |
| [Execute saved flow with CSV output](test-cases/convert.feature)<br>`@cli` | Batch execute → CSV, validated | NA |
| [Execute fails clearly when --output extension is unknown](test-cases/convert.feature)<br>`@cli` | Unknown output extension error (batch) | NA |
| [:reorder changes the CSV header order](test-cases/convert.feature)<br>`@cli @offline` | Reorder affects output header | NA |
| [Load JSONL, save CSV](test-cases/convert.feature)<br>`@cli` | JSONL→CSV conversion round-trip | NA |

### `debug.feature` — Debug output
`[debug]` block after NL requests (expression + token usage); suppressed for `:` commands and batch execute.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Debug block shows the executed expression and a usage summary](test-cases/debug.feature)<br>`@cli` | [debug] holds expression + token count on NL query | NA |
| [REPL ":" commands print no debug block](test-cases/debug.feature)<br>`@cli @offline` | :schema / :undo suppress debug | NA |
| ["tamedtable execute" prints no debug block](test-cases/debug.feature)<br>`@cli @offline` | Batch execute suppresses debug | NA |

### `dedupe.feature` — Deduplicate customer records
Dedupe by column key, export, execute saved flow — parallel to filter.feature.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Drop duplicates by Email](test-cases/dedupe.feature)<br>`@headless @cli @web @tour @cat-deterministic` | Email-keyed dedupe via phrase (3 surfaces) | NA |
| [Export deduplicated data](test-cases/dedupe.feature)<br>`@headless @cli @web` | Export to JSONL after dedupe | NA — kept as per-op proof (see DRY note) |
| [Execute saved flow from command line](test-cases/dedupe.feature)<br>`@cli` | CLI runs dedupe.flow | NA — kept as per-op proof (see DRY note) |

### `diagnostics.feature` — In-app diagnostics log
Web-only `#Diagnostics`: the localStorage ring buffer + one-click report. Every
scenario is `@offline` — a failure is simulated (a 401 mock or a tutorial replay
miss), so no model call leaves the browser.

| Scenario | What it tests | ToDo |
|---|---|---|
| [A failed model request is recorded with its fingerprint and truncated body](test-cases/diagnostics.feature)<br>`@web @offline` | A 401 records method/url/fingerprint/body + provider | NA |
| [A tutorial replay miss is recorded with the tour scenario and fingerprint](test-cases/diagnostics.feature)<br>`@web @offline` | The original "no recording" bug: off-script query → event names tour + scenario | NA |
| [The diagnostics report never contains an API key](test-cases/diagnostics.feature)<br>`@web @offline @regression` | Redaction: report holds no `sk-`/`AIza` shape, drops `*Key` fields | NA — regression lock |
| [The bug-report link points to GitHub with a redacted report](test-cases/diagnostics.feature)<br>`@web @offline @regression` | Prefilled GitHub issue URL targets the tracker and carries no key | NA — regression lock |
| [The diagnostics report is a self-contained markdown doc](test-cases/diagnostics.feature)<br>`@web @offline` | Report names the app version, lists newest event first | NA |
| [Clearing diagnostics empties the log](test-cases/diagnostics.feature)<br>`@web @offline` | Clear empties the in-memory + stored log | NA |

### `enrich.feature` — Enrich and extract tours
Marketing tours; each loads a distinct CSV, runs a phrase, replays `enrich.json`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Split the address into its parts](test-cases/enrich.feature)<br>`@web @tour @cat-enrich` | Address splitting (address.csv) | NA |
| [Fill the country from the city column](test-cases/enrich.feature)<br>`@web @tour @cat-enrich` | Country-from-city (cities.csv) | NA |
| [Add the industry for each company](test-cases/enrich.feature)<br>`@web @tour @cat-enrich` | Industry enrichment (companies.csv) | NA |
| [Extract the amount and date from the memo](test-cases/enrich.feature)<br>`@web @tour @cat-enrich` | Memo → 2 columns (memos.csv); asserts 2 transformations | NA |

### `filter.feature` — Filter customer records
Filter by predicate, export, execute saved flow.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Filter by Country](test-cases/filter.feature)<br>`@headless @cli @web @tour @cat-deterministic` | USA filter via phrase (3 surfaces) | NA |
| [Export filtered data](test-cases/filter.feature)<br>`@headless @cli @web` | Export to JSONL after filtering | NA — kept as per-op proof (see DRY note) |
| [Execute saved flow from command line](test-cases/filter.feature)<br>`@cli` | CLI runs filter.flow | NA — kept as per-op proof (see DRY note) |

### `join.feature` — Lookup join
Left/inner join enrich; nulls, rename collisions, multi-format inputs, undo. Fixtures: `customers-input.csv`, `join-country-codes.{csv,jsonl}`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Left join enriches each customer with ISO and Region](test-cases/join.feature)<br>`@headless @cli @web @tour @cat-deterministic` | Left join adds ISO + Region; FirstName preserved | NA |
| [Unmatched left rows get null right-side columns](test-cases/join.feature)<br>`@headless @cli` | "Atlantis" → ISO/Region null | NA |
| [Inner join removes left rows without a match](test-cases/join.feature)<br>`@headless @cli` | Inner join drops Atlantis | NA |
| [Right column with the same name as a left column is renamed](test-cases/join.feature)<br>`@headless @cli` | Country collision → Country + Country_2 | NA |
| [join.with with .jsonl loads as JSONL](test-cases/join.feature)<br>`@headless @cli` | Extension dispatch for .jsonl | NA |
| [join.with with an unknown extension rejects at validation](test-cases/join.feature)<br>`@headless @cli @offline` | .parquet rejected, exit 2 | NA |
| [:undo removes the joined columns](test-cases/join.feature)<br>`@headless @cli` | Undo reverses join | NA |

### `language-ai.feature` — Language tours
Marketing tours; load comments.csv / reviews.csv, run a phrase, replay `language-ai.json`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Summarize each review in one line](test-cases/language-ai.feature)<br>`@web @tour @cat-language` | Review summarization | NA |
| [Translate the comments to English](test-cases/language-ai.feature)<br>`@web @tour @cat-language` | Comment translation | NA |
| [Tag the language of every comment](test-cases/language-ai.feature)<br>`@web @tour @cat-language` | Per-row language detection | NA |

### `loadsave.feature` — Load, save and reuse tour
Single combined tour; the homepage save / undo / save-flow / save-py items all deep-link here.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Load a file, transform it, then save and reuse](test-cases/loadsave.feature)<br>`@web @tour @cat-loadsave` | Load → query → (save/reuse) workflow via replay | NA |

### `multilingual.feature` — Multilingual requests
Phone-normalization asked in 5 languages, as text and voice; `customers-input.csv` + espeak-ng TTS clips.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Normalize phone numbers in Spanish](test-cases/multilingual.feature)<br>`@headless @web @tour @cat-language` | Spanish text normalizes Phone | NA |
| [&lt;language&gt; text request](test-cases/multilingual.feature)<br>`@headless @web` | Outline (German, French, Croatian, Chinese) — each text request normalizes Phone | NA |
| [Spanish voice request](test-cases/multilingual.feature)<br>`@web` | Spanish voice triggers normalization | NA |
| [German voice request](test-cases/multilingual.feature)<br>`@web` | German voice triggers normalization | NA |
| [French voice request](test-cases/multilingual.feature)<br>`@web` | French voice triggers normalization | NA |
| [Croatian voice request](test-cases/multilingual.feature)<br>`@web` | Croatian voice triggers normalization | NA |
| [Chinese voice request — pipeline runs, synthetic audio mis-heard](test-cases/multilingual.feature)<br>`@web` | Pipeline completes; asserts only completion (documents TTS gap) | NA |

### `pivot.feature` — Pivot and unpivot
Wide↔long reshape; pivot agg, null-fill, unpivot multiplier, custom names. Fixtures: `pivot-long-input.csv`, `pivot-wide-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [One column per distinct on-value, default agg first](test-cases/pivot.feature)<br>`@headless @cli @web @tour @cat-deterministic` | Pivot Quarter → Q1–Q4; Quarter/Revenue dropped | NA |
| [agg=sum collapses multiple values per index/on cell](test-cases/pivot.feature)<br>`@headless @cli` | Duplicate EU/Q1 rows sum | NA |
| [Missing combinations render as null](test-cases/pivot.feature)<br>`@headless @cli` | APAC/Q3 absent → null | NA |
| [One row per distinct index tuple](test-cases/pivot.feature)<br>`@headless @cli` | Output rows = distinct Region count | NA |
| [One row per measure per input row](test-cases/pivot.feature)<br>`@headless @cli @web` | Unpivot Q1–Q4 → 4× rows; name + value columns | NA |
| [Custom names_to and values_to](test-cases/pivot.feature)<br>`@headless @cli` | Unpivot with custom output names | NA |

### `placeholders.feature` — LLM cell placeholders
Runtime `{Column}` / `{*}` substitution in per-row LLM prompts; expansion, errors, cache dedup, scope.

| Scenario | What it tests | ToDo |
|---|---|---|
| [{Column} substitutes the row's value verbatim](test-cases/placeholders.feature)<br>`@headless @offline` | {A} in "Greet {A}" → "Greet hello" | NA |
| [{Column} referencing an unknown column is an evaluation-time error](test-cases/placeholders.feature)<br>`@headless @offline` | {NotAColumn} → placeholder error via recovery loop | NA |
| [{*} inside mutate.value expands to other columns and excludes the target](test-cases/placeholders.feature)<br>`@headless @offline` | {*} excludes the target column | NA |
| [{*} inside filter.pred expands to all columns](test-cases/placeholders.feature)<br>`@headless @offline` | {*} includes all columns in a predicate | NA |
| [Cache reuse — without {*} two rows with identical primary input dedupe](test-cases/placeholders.feature)<br>`@headless @offline` | Identical primary input → 1 model call | NA |
| [Cache miss — with {*} two rows with identical primary input call twice](test-cases/placeholders.feature)<br>`@headless @offline` | {*} with differing other cols → 2 calls | NA |

### `repl-commands.feature` — REPL commands
The interactive `:`-commands (undo/redo/history/load/save/save-flow/show/find/schema/help/exit/viewport), offline and with one LLM round-trip. Fixtures: `dedupe-input.csv`, `customers-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [:help prints the REPL usage screen and omits CLI batch flags](test-cases/repl-commands.feature)<br>`@cli @offline` | Lists key commands + ANTHROPIC_API_KEY; excludes execute / --input / --output (merged two scenarios) | NA |
| [&lt;cmd&gt; closes the REPL with code 0](test-cases/repl-commands.feature)<br>`@cli @offline` | Outline (`exit`, `:exit`) — both spellings exit 0 | NA |
| [:undo on a freshly loaded CSV says nothing to undo](test-cases/repl-commands.feature)<br>`@cli @offline` | Undo on empty stack message | NA |
| [:redo on an empty redo stack says nothing to redo](test-cases/repl-commands.feature)<br>`@cli @offline` | Redo on empty stack message | NA |
| [:undo then :redo restores the committed state](test-cases/repl-commands.feature)<br>`@cli` | Undo+redo returns to normalized form | NA — stateful (redo stack), not mergeable |
| [a new NL request clears the redo stack](test-cases/repl-commands.feature)<br>`@cli` | New request after undo empties redo | NA — stateful, not mergeable |
| [:history lists turns with their commit status](test-cases/repl-commands.feature)<br>`@cli` | History shows turn #, name, [undone] | NA |
| [:schema prints one line per column](test-cases/repl-commands.feature)<br>`@cli @offline` | Schema lists all columns | NA |
| [bare :show reprints the current viewport](test-cases/repl-commands.feature)<br>`@cli @offline` | :show shows the default page | NA — :show cluster reads "last reprint"; merging needs a per-command capture step |
| [:show rows next advances by one page and shows the top marker](test-cases/repl-commands.feature)<br>`@cli @offline` | Forward paging + "…more rows" marker | NA — see above |
| [:show rows end jumps to the last page](test-cases/repl-commands.feature)<br>`@cli @offline` | Jump to final rows | NA — see above |
| [:show rows N snaps to the page containing row N](test-cases/repl-commands.feature)<br>`@cli @offline` | :show rows 15 → that page | NA — see above |
| [:show rows N clamps when N is out of range](test-cases/repl-commands.feature)<br>`@cli @offline` | :show rows 9999 clamps to last page | NA — see above |
| [:show cols next advances the column window and shows the left marker](test-cases/repl-commands.feature)<br>`@cli @offline` | Column paging + left marker | NA — see above |
| [:find matches by substring and regex, and reports misses and missing args](test-cases/repl-commands.feature)<br>`@cli @offline` | Substring (`canada`→`*Canada*`), regex (`/\+44/`), no-match, missing-pattern (merged four scenarios — cumulative stdout) | NA |
| [viewport resets to (0,0) after a committed NL request](test-cases/repl-commands.feature)<br>`@cli` | View jumps to top-left after commit | NA |
| [viewport resets to (0,0) after :load](test-cases/repl-commands.feature)<br>`@cli @offline` | View resets after :load | NA |
| [:load reports a missing path, an unknown extension, and a successful load](test-cases/repl-commands.feature)<br>`@cli @offline` | missing-path / unknown-ext / success (merged three scenarios — cumulative stdout) | NA |
| [:show and :find do not enter the patch journal](test-cases/repl-commands.feature)<br>`@cli @offline` | View commands don't record turns | NA |
| [:save and :save-flow report missing paths and write their files](test-cases/repl-commands.feature)<br>`@cli @offline` | both missing-path messages + both files written (merged four scenarios) | NA |
| [bare :viewport prints current page size and source](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport shows size + auto/manual | NA — :viewport cluster pins sticky state; kept separate |
| [:viewport with explicit rows and cols shrinks the page](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport 5 3 limits display + markers | NA |
| [:viewport pins only rows when cols is auto](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport 5 auto pins rows | NA |
| [:viewport pins only cols when rows is auto](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport auto 3 pins cols | NA |
| [:viewport auto clears prior pins on both axes](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport auto resets both | NA |
| [:viewport pins survive :load and viewport-cursor resets](test-cases/repl-commands.feature)<br>`@cli @offline` | Manual size persists across :load | NA |
| [:viewport with a non-positive integer prints invalid size](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport 0 3 → "invalid size" | NA |
| [:viewport with malformed args prints usage](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport foo → usage | NA |
| [:viewport does not enter the patch journal](test-cases/repl-commands.feature)<br>`@cli @offline` | :viewport doesn't record turns | NA |

### `save-py.feature` — Export a flow as a Python script
`:save-py` exports a deterministic flow; rejects LLM cells; arg validation.

| Scenario | What it tests | ToDo |
|---|---|---|
| [:save-py exports a deterministic flow as a Python script](test-cases/save-py.feature)<br>`@cli` | Filter flow → runnable Python (uv header) | NA |
| [:save-py refuses a flow that contains an LLM cell](test-cases/save-py.feature)<br>`@cli` | Rejects when LLM cells present | NA |
| [:save-py rejects a non-.py output path](test-cases/save-py.feature)<br>`@cli @offline` | Validates .py extension | NA |
| [:save-py with no path prints usage](test-cases/save-py.feature)<br>`@cli @offline` | Usage when path missing | NA |

### `sort.feature` — Sort rows by a key
Sort on {js}/{sql}/{llm} keys with optional top-N limit; one marketing tour. Fixtures: `sort-input.csv`, `sales.csv`, `sort-*.flow`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Sort by a {js} key, descending, limited to the top 2](test-cases/sort.feature)<br>`@cli @offline` | JS sort + limit | NA |
| [Sort by revenue, top 10](test-cases/sort.feature)<br>`@web @tour @cat-deterministic` | Revenue top-N via phrase replay (sales.csv): golden row order + 10-row visible page | NA |
| [Sort by a bare column of numeric strings, descending](test-cases/sort.feature)<br>`@cli @offline @regression` | Numeric-aware compare — "2" before "10", never text order | NA |
| [Sort by a {js} key, descending](test-cases/sort.feature)<br>`@cli @offline` | JS sort, no limit | NA |
| [Sort by a {sql} key, descending](test-cases/sort.feature)<br>`@cli @offline` | SQL sort, no limit | NA |

### `sql.feature` — SQL expressions
`{sql}` as scalar/predicate/aggregate via DuckDB, plus state and cancellation. Fixtures: `customers-input.csv`, `performance-liked-videos.csv`, `filter-input.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [SQL scalar fills a new column](test-cases/sql.feature)<br>`@headless @cli` | SQL scalar in mutate creates a column | NA |
| [SQL parse error flows through the recovery loop](test-cases/sql.feature)<br>`@headless @cli @scripted` | Invalid SQL routes to recovery | NA |
| [SQL predicate filters rows](test-cases/sql.feature)<br>`@headless @cli` | SQL WHERE-style filter | NA |
| [SQL aggregate inside group](test-cases/sql.feature)<br>`@headless @cli` | SQL aggregate in group context | NA |
| [SQL sees the latest committed rows after :undo](test-cases/sql.feature)<br>`@headless @cli` | DuckDB reflects undo | NA |
| [Reloading input resets the DuckDB relation](test-cases/sql.feature)<br>`@headless @cli` | :load clears prior SQL columns | NA |
| [Ctrl-C interrupts a long-running SQL aggregate](test-cases/sql.feature)<br>`@headless @cli @cancel @scripted` | Cancel stops in-flight SQL, no spec change | NA |
| [Cancellation leaves the DuckDB relation intact for the next request](test-cases/sql.feature)<br>`@headless @cli @cancel @scripted` | State survives cancel | NA |
| [Cancellation does not affect previously-applied SQL transformations](test-cases/sql.feature)<br>`@headless @cli @cancel @scripted` | Prior SQL columns survive cancel | NA |
| [A SQL query that ignores interrupt drains within the next request](test-cases/sql.feature)<br>`@headless @cli @cancel @scripted` | Lingering query drained by next request | NA |

### `tutorial.feature` — Tutorial (Tours) panel
The Tours panel: lists `@tour` scenarios grouped by category, replays them key-free via WebController (no browser).

| Scenario | What it tests | ToDo |
|---|---|---|
| [Tutorial button opens the panel](test-cases/tutorial.feature)<br>`@web` | Button shows the panel | NA |
| [The clickable list shows only @tour scenario names](test-cases/tutorial.feature)<br>`@web` | Lists named @tour tours only | NA |
| [The tutorial list is grouped by feature category](test-cases/tutorial.feature)<br>`@web` | Tours grouped under Clean up / Validate / Be exact / Process language | NA |
| [The Dev dropdown lists @web non-@tour scenarios](test-cases/tutorial.feature)<br>`@web` | Dev shows @web non-@tour; hides tours | NA |
| [Play starts the tutorial at step 1](test-cases/tutorial.feature)<br>`@web` | Select + play → step 1 | NA |
| [Play closes the tutorial panel](test-cases/tutorial.feature)<br>`@web` | Playing hides the panel | NA |
| [Next executes the current step and advances](test-cases/tutorial.feature)<br>`@web` | Next runs step, moves to step 2 | NA |
| [Cancel exits the tutorial](test-cases/tutorial.feature)<br>`@web` | Cancel deactivates | NA |
| [Play again after cancel restarts at step 1](test-cases/tutorial.feature)<br>`@web` | Re-play resets to step 1 | NA |
| [Finish after last step returns to the tutorial chooser](test-cases/tutorial.feature)<br>`@web` | Finish reopens panel, deactivates | NA |
| [Finishing a deep-link tour opens the Tutorial chooser panel](test-cases/tutorial.feature)<br>`@web` | Deep-link finish reopens panel | NA — kept: a distinct entry path (deep link vs panel play) |
| [A query step prefills the chat input when highlighted](test-cases/tutorial.feature)<br>`@web` | prefill-chat fills the input | NA |
| [Running a query step clears the prefilled chat input](test-cases/tutorial.feature)<br>`@web` | Advancing past a query clears the input | NA |
| [A load-file step loads the fixture on Next](test-cases/tutorial.feature)<br>`@web` | load-file auto-loads the table | NA |
| [A show-golden step makes the golden rows available after execution](test-cases/tutorial.feature)<br>`@web` | Golden rows appear after the last step | NA |
| [A prefill-chat step replays from the tour's cassette, key-free](test-cases/tutorial.feature)<br>`@web` | Query replays cassette → 1 transformation, no toast | NA |
| [A play-audio step replays the voice cassette against Gemini, key-free](test-cases/tutorial.feature)<br>`@web` | Voice step replays → 1 transformation, no toast | NA |
| [The join tour skips the lookup-table step](test-cases/tutorial.feature)<br>`@web` | load-lookup is silent; step 2 is the query | NA |
| [Playing a tour to the end marks it complete](test-cases/tutorial.feature)<br>`@web` | Finishing sets completion (persisted) | NA |
| [A valid feature and scenario autoplays from step 1](test-cases/tutorial.feature)<br>`@web` | Deep link autoplays, panel hidden | NA |
| [An unknown scenario leaves the panel closed](test-cases/tutorial.feature)<br>`@web` | Unknown deep link: panel closed, inactive | NA |
| [A missing scenario param leaves the panel closed](test-cases/tutorial.feature)<br>`@web` | Empty scenario param: panel closed, inactive | NA |

### `validate.feature` — Row and dataset validation
`validate` adds `_valid`/`_validation`; thresholds, additivity, overwrite; 4 marketing tours. Fixtures: `customers-input.csv`, `emails.csv`, `birthdates.csv`, `citycountry.csv`, `prices.csv`.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Flag rows with empty Phone](test-cases/validate.feature)<br>`@headless @cli @web @tour @cat-validate` | Adds _valid/_validation; marks empty Phone | NA |
| [validate is additive — no rows are dropped](test-cases/validate.feature)<br>`@headless @cli` | Row count preserved | NA |
| [filter on _valid keeps only passing rows](test-cases/validate.feature)<br>`@headless @cli` | validate+filter chain keeps passing rows | NA |
| [Failing more than the threshold aborts the request](test-cases/validate.feature)<br>`@headless @cli` | >20% fail → reject + rollback | NA |
| [Failing within the threshold commits the transformation](test-cases/validate.feature)<br>`@headless @cli` | Within bounds → commit | NA |
| [Flag emails that look fake](test-cases/validate.feature)<br>`@web @tour @cat-validate` | Tour: emails.csv → 1 transformation, no toast | NA |
| [Flag any impossible birth date](test-cases/validate.feature)<br>`@web @tour @cat-validate` | Tour: birthdates.csv → 1 transformation | NA |
| [Check the city matches the country](test-cases/validate.feature)<br>`@web @tour @cat-validate` | Tour: citycountry.csv → 2 transformations | NA |
| [Flag prices that seem wrong](test-cases/validate.feature)<br>`@web @tour @cat-validate` | Tour: prices.csv → 1 transformation | NA |
| [A second validate replaces the prior _valid and _validation](test-cases/validate.feature)<br>`@headless @cli` | Second validate overwrites reserved columns | NA |

### `voice.feature` — Voice input
Mic button (Gemini-only) gating, press-hold-release round-trip, cancel, errors, one tour. Fixtures: `customers-input.csv`, `voice-*.m4a`, cassettes.

| Scenario | What it tests | ToDo |
|---|---|---|
| [The mic is hidden when the selected model has no voice support](test-cases/voice.feature)<br>`@web` | gemini→anthropic hides the mic | NA |
| [The mic is hidden when Google has no Gemini key](test-cases/voice.feature)<br>`@web` | gemini selected, no key → hidden | NA |
| [The mic is shown when Google is selected with a Gemini key](test-cases/voice.feature)<br>`@web` | gemini + key → shown | NA |
| [The mic is hidden for an OpenAI model even with a key](test-cases/voice.feature)<br>`@web` | OpenAI → hidden regardless of key | NA |
| [Holding then releasing the mic produces a user bubble and an assistant reply](test-cases/voice.feature)<br>`@web` | Full record→send→reply, 1 transformation | NA |
| [A spoken "normalize DOB column" request applies a transformation](test-cases/voice.feature)<br>`@web` | Voice normalization; transcript bubble + spec update | NA |
| [Escape cancels a recording without sending anything](test-cases/voice.feature)<br>`@web` | Escape aborts; no chat/spec change | NA |
| [Normalize DOB by voice](test-cases/voice.feature)<br>`@web @tour @cat-language` | Tour: key-free voice via cassette | NA — `@tour` scenarios stay one-each (see lever 1) |
| [A model error surfaces a toast and changes nothing](test-cases/voice.feature)<br>`@web` | Bad key → toast + assistant msg, spec untouched | NA |

### `web.feature` — Web front-end
Browser-only flows (dialogs, settings, cell edit, reorder, paging, footer) with no real API calls. Fixtures: `customers-input.csv`, `paginate-input.csv`, mock LLM responses.

| Scenario | What it tests | ToDo |
|---|---|---|
| [A request without an API key surfaces a toast and changes nothing](test-cases/web.feature)<br>`@web` | Missing key → toast, spec empty | NA |
| [A text request needs the selected provider's key, not Anthropic's](test-cases/web.feature)<br>`@web` | Google selected → needs Google key, not Anthropic | NA |
| [Saving an API key in the settings panel configures the engine](test-cases/web.feature)<br>`@web` | Settings persists key to engine | NA |
| [Load CSV via the Open File dialog](test-cases/web.feature)<br>`@web` | Dialog → CSV renders 5+ rows | NA — now the sole dialog test (datanorm duplicate removed) |
| [Opening an empty file yields an empty table without an error](test-cases/web.feature)<br>`@web` | Empty file: 0 rows, no toast | NA |
| [Save flow via the Save File dialog](test-cases/web.feature)<br>`@web` | Cell edit → save dialog persists flow | NA — now the sole dialog test (datanorm duplicate removed) |
| [Without File System Access support, saving falls back to a download](test-cases/web.feature)<br>`@web` | Download fallback when FSA absent | NA |
| [Opening the URL dialog shows it](test-cases/web.feature)<br>`@web` | URL dialog opens | NA |
| [Closing the URL dialog hides it](test-cases/web.feature)<br>`@web` | URL dialog closes | NA |
| [Loading a CSV from a URL renders the table](test-cases/web.feature)<br>`@web` | CSV from URL renders | NA |
| [Loading a JSONL from a URL renders the table](test-cases/web.feature)<br>`@web` | JSONL from URL renders | NA |
| [&lt;kind&gt; is rejected with a clear error](test-cases/web.feature)<br>`@web` | Outline (non-http, invalid, empty) — thin dialog pass; library matrix lives in file-io.feature | NA |
| [Editing a cell appends a mutate transformation](test-cases/web.feature)<br>`@web` | Cell edit → 1 transformation, value persists | NA |
| [Undo reverts a cell edit](test-cases/web.feature)<br>`@web` | Undo reverts the edit | NA |
| [Reordering columns by drag updates the column order](test-cases/web.feature)<br>`@web` | Drag → column becomes first | NA |
| [Undo reverts a column reorder](test-cases/web.feature)<br>`@web` | Undo reverts the reorder | NA |
| [A freshly loaded table opens on the first page](test-cases/web.feature)<br>`@web` | Large table opens on page 1 (20 rows) | NA |
| [Moving to the next page shows the following rows](test-cases/web.feature)<br>`@web` | Page 2 shows next 20 | NA |
| [The last page shows only the remaining rows](test-cases/web.feature)<br>`@web` | Final page shows remainder | NA |
| [Paging past the last page clamps to the last page](test-cases/web.feature)<br>`@web` | Page 99 clamps to last | NA |
| [A freshly loaded table is idle with no cell selected](test-cases/web.feature)<br>`@web` | Footer "idle", no selection | NA |
| [Selecting a cell reports its location in the footer](test-cases/web.feature)<br>`@web` | Footer shows cell coords | NA |
| [Saving data marks the footer as saved](test-cases/web.feature)<br>`@web` | Footer reports "saved" after save | NA |
| [Editing a cell returns the footer to idle after a save](test-cases/web.feature)<br>`@web` | Edit resets footer from saved→idle | NA |
| [The web app defaults to the Sonnet model](test-cases/web.feature)<br>`@web` | Default model claude-sonnet-4-6 | NA |
| [Choosing a model keeps the loaded table intact](test-cases/web.feature)<br>`@web` | Model switch preserves data | NA |
| [Settings panel opens with three provider cards](test-cases/web.feature)<br>`@web` | Three collapsed provider cards | NA |
| [Clicking the Google card expands it and selects Google](test-cases/web.feature)<br>`@web` | Gemini card expands + selects | NA |
| [Clicking the Google card shows the GEMINI_API_KEY env hint](test-cases/web.feature)<br>`@web` | Gemini card shows env hint | NA |
| [Clicking a second card collapses the first](test-cases/web.feature)<br>`@web` | Accordion behaviour | NA |
| [Clicking the OpenAI card shows GPT models and the env hint](test-cases/web.feature)<br>`@web` | OpenAI lists gpt models (voice=false) + OPENAI_API_KEY hint (folded in the thin env-hint scenario) | NA |
| [Clicking an already-open card collapses it](test-cases/web.feature)<br>`@web` | Accordion toggle closes | NA |
| [Clicking the Anthropic card shows the ANTHROPIC_API_KEY env hint](test-cases/web.feature)<br>`@web` | Anthropic card shows env hint + configured provider | NA |
| [Settings panel opens with the currently selected provider card expanded](test-cases/web.feature)<br>`@web` | Panel reopens with selected provider expanded | NA |
| [A Gemini request with a wrong key shows a descriptive error](test-cases/web.feature)<br>`@web` | 401 Gemini → "Invalid API key" toast + unrestricted-key guidance | NA |
| [An OpenAI request with a wrong key shows a descriptive error](test-cases/web.feature)<br>`@web` | 401 OpenAI → "Invalid API key" toast | NA |

# spec/packages/ — library packages

### `packages/chat-panel/chat-panel.feature` — Chat panel
Message list, expandable request detail, input row, mic button.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Sending renders a user bubble and an assistant reply](packages/chat-panel/chat-panel.feature)<br>`@web` | User + assistant bubbles; input clears | NA |
| [An Error-prefixed reply renders in error style](packages/chat-panel/chat-panel.feature)<br>`@web` | Error replies styled as errors | NA |
| [Request detail expands and shows the turns](packages/chat-panel/chat-panel.feature)<br>`@web` | Expand reveals turn history/context | NA |
| [Streaming swaps send for stop, and stop cancels](packages/chat-panel/chat-panel.feature)<br>`@web` | Send↔stop toggle; stop cancels | NA |
| [A prefill lands in the draft](packages/chat-panel/chat-panel.feature)<br>`@web` | Prefill populates the input | NA |
| [Holding the mic records, releasing sends](packages/chat-panel/chat-panel.feature)<br>`@web` | Mic press/release fire voice events | NA |

### `packages/file-io/file-io.feature` — File IO
Format detection (extension + Content-Type), URL naming, HTTP fetch validation, `.flow` serialization, browser demo.

| Scenario | What it tests | ToDo |
|---|---|---|
| [A .csv path is detected as csv even against a contradicting header](packages/file-io/file-io.feature)<br>`@headless` | Extension beats Content-Type | NA |
| [A .ndjson path is detected as jsonl](packages/file-io/file-io.feature)<br>`@headless` | .ndjson → jsonl | NA |
| [Content-Type decides when the path has no table extension](packages/file-io/file-io.feature)<br>`@headless` | Content-Type fallback | NA |
| [No extension and no useful Content-Type means no format](packages/file-io/file-io.feature)<br>`@headless` | Both missing → no format | NA |
| [The last path segment becomes the name](packages/file-io/file-io.feature)<br>`@headless` | URL basename → name | NA |
| [A URL without a path segment falls back to download.&lt;format&gt;](packages/file-io/file-io.feature)<br>`@headless` | Root URL default name | NA |
| [A fetched CSV comes back as a named picked file](packages/file-io/file-io.feature)<br>`@headless` | Fetch preserves name + content | NA |
| [Blank input asks for a URL](packages/file-io/file-io.feature)<br>`@headless` | Empty input validation | NA — library-layer matrix, the canonical home (web keeps one thin pass) |
| [Garbage input is rejected as not a URL](packages/file-io/file-io.feature)<br>`@headless` | Malformed URL rejected | NA — see above |
| [Non-http protocols are rejected](packages/file-io/file-io.feature)<br>`@headless` | Non-HTTP blocked | NA — see above |
| [A network failure is rewritten to an actionable message](packages/file-io/file-io.feature)<br>`@headless` | Network error message | NA |
| [An HTTP error reports the status](packages/file-io/file-io.feature)<br>`@headless` | HTTP status surfaced | NA |
| [An undetectable format is refused](packages/file-io/file-io.feature)<br>`@headless` | Undetectable format refused | NA |
| [serializeFlow wraps the spec with version and source](packages/file-io/file-io.feature)<br>`@headless` | .flow JSON shape | NA |
| [A spec with no table falls back to input.csv](packages/file-io/file-io.feature)<br>`@headless` | Default source name | NA |
| [Fetching a CSV URL fills the preview](packages/file-io/file-io.feature)<br>`@web` | Browser fetch → preview | NA |
| [Content-Type rescues an extension-less URL](packages/file-io/file-io.feature)<br>`@web` | Browser Content-Type path | NA |
| [A failed fetch shows the error inline](packages/file-io/file-io.feature)<br>`@web` | Browser error display | NA |
| [The demo reports the browser's file dialog capability](packages/file-io/file-io.feature)<br>`@web` | FSA capability reporting | NA |

### `packages/gherkin-tour/gherkin-tour.feature` — Gherkin Tour parser + driver
Zero-dep parser and driver. Several scenarios feed embedded Gherkin **doc-strings** to `parseTours` as test data — those inner `Scenario:` lines are inputs, not real scenarios, so they are not listed here.

| Scenario | What it tests | ToDo |
|---|---|---|
| [A scenario is returned regardless of tags](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Untagged scenarios still parse | NA |
| [Tags are captured on the scenario](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | @web/@tour tags captured | NA |
| [Multiple scenarios are all returned](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Many scenarios in one feature | NA |
| [Top-level Background steps prepend](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Feature Background prepends to all | NA |
| [Rule-scoped Background prepends only to scenarios under that Rule](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Rule Background scoped correctly | NA |
| [load-file action from load "X"](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Parses load-file | NA |
| [load-lookup action from load the lookup table "X"](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Parses load-lookup | NA |
| [prefill-chat action from query "Y"](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Parses prefill-chat | NA |
| [play-audio action from speak "X"](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Parses play-audio | NA |
| [the compare step is dropped — it collapses into the terminal stop](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | compare dropped; golden lifted | NA |
| [Unrecognised (verification) steps are dropped from the tour](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Non-action steps filtered | NA — kept: distinct contract (generic filtering vs the compare-step collapse) |
| [the expected output step is lifted onto the scenario, not a step](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | golden lifted to scenario | NA |
| [Comment lines are skipped](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | # comments ignored | NA |
| [Scenario Outline is skipped silently](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Outlines ignored | NA |
| [Empty input returns empty result](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Empty string → empty list | NA |
| [play arms the tour at the first step](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | play() → step 1 | NA |
| [next executes the highlighted step then advances](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | next() runs then advances | NA |
| [each action dispatches to its own adapter method](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | All action kinds dispatch | NA |
| [reaching the terminal stop dispatches the scenario's golden file](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | Terminal stop → showGolden | NA |
| [advancing past the last step enters the terminal stop](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | done=true, active=false | NA — kept: distinct contract (done/active flags vs golden dispatch) |
| [finishing a tour calls onFinish and ends the tour](packages/gherkin-tour/gherkin-tour.feature)<br>`@headless` | finish() → onFinish, deactivates | NA |

### `packages/model-config/model-config.feature` — Model config
Provider/key/model resolution (Anthropic/Gemini/OpenAI) + the ModelChooser component.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Empty env and empty stored yields anthropic defaults](packages/model-config/model-config.feature)<br>`@headless` | Default anthropic + claude-sonnet-4-6 | NA |
| [ANTHROPIC_API_KEY in env sets provider and key](packages/model-config/model-config.feature)<br>`@headless` | Anthropic key resolves provider | NA |
| [GEMINI_API_KEY in env sets provider and key](packages/model-config/model-config.feature)<br>`@headless` | Gemini key resolves provider | NA |
| [OPENAI_API_KEY in env sets provider and key](packages/model-config/model-config.feature)<br>`@headless` | OpenAI key resolves provider | NA |
| [&lt;present&gt; in env — &lt;winner&gt; wins over Anthropic](packages/model-config/model-config.feature)<br>`@headless` | Outline (Anthropic+Gemini, all three, Anthropic+OpenAI) — Gemini beats OpenAI beats Anthropic; loser key nulled | NA |
| [Stored provider=gemini with no env key is used](packages/model-config/model-config.feature)<br>`@headless` | Stored provider used when env empty | NA |
| [Env values override stored values](packages/model-config/model-config.feature)<br>`@headless` | Env beats stored | NA |
| [TAMEDTABLE_MODEL in env overrides stored model](packages/model-config/model-config.feature)<br>`@headless` | Env model override | NA |
| [Empty config yields the provider's cell default](packages/model-config/model-config.feature)<br>`@headless` | Cell model default | NA |
| [TAMEDTABLE_CELL_MODEL in env overrides stored cellModel](packages/model-config/model-config.feature)<br>`@headless` | Env cell-model override | NA |
| [A cross-provider stored cellModel is coerced to the provider cell default](packages/model-config/model-config.feature)<br>`@headless` | Cross-provider cell model coerced | NA |
| [providerFor returns anthropic for a claude-* id](packages/model-config/model-config.feature)<br>`@headless` | claude-* → anthropic | NA |
| [providerFor returns gemini for a gemini-* id](packages/model-config/model-config.feature)<br>`@headless` | gemini-* → gemini | NA |
| [providerFor returns openai for a gpt-* id](packages/model-config/model-config.feature)<br>`@headless` | gpt-* → openai | NA |
| [defaultModel for anthropic returns claude-sonnet-4-6](packages/model-config/model-config.feature)<br>`@headless` | Anthropic default model | NA |
| [defaultModel for gemini returns gemini-3.5-flash](packages/model-config/model-config.feature)<br>`@headless` | Gemini default model | NA |
| [defaultModel for openai returns gpt-5.5](packages/model-config/model-config.feature)<br>`@headless` | OpenAI default model | NA |
| [defaultCellModel for anthropic returns claude-sonnet-4-5](packages/model-config/model-config.feature)<br>`@headless` | Anthropic cell default | NA |
| [defaultCellModel for openai returns gpt-5.4-mini](packages/model-config/model-config.feature)<br>`@headless` | OpenAI cell default | NA |
| [ALL_MODELS has at least one Anthropic and one Gemini entry](packages/model-config/model-config.feature)<br>`@headless` | Catalogue coverage | NA |
| [ALL_MODELS has at least one OpenAI entry](packages/model-config/model-config.feature)<br>`@headless` | Catalogue coverage | NA |
| [ALL_MODELS entries each have a voiceInput boolean](packages/model-config/model-config.feature)<br>`@headless` | Every entry has voiceInput | NA |
| [gpt-5.5 has voiceInput false](packages/model-config/model-config.feature)<br>`@headless` | OpenAI voiceInput=false | NA |
| [claude-sonnet-4-6 has voiceInput false](packages/model-config/model-config.feature)<br>`@headless` | Anthropic voiceInput=false | NA |
| [gemini-3.5-flash has voiceInput true](packages/model-config/model-config.feature)<br>`@headless` | Gemini voiceInput=true | NA |
| [Clicking a provider card expands it and selects the provider](packages/model-config/model-config.feature)<br>`@web` | Card expands + selects | NA |
| [Clicking the expanded card collapses it without changing the provider](packages/model-config/model-config.feature)<br>`@web` | Toggle collapses, keeps provider | NA |
| [Picking a primary model updates the resolved config](packages/model-config/model-config.feature)<br>`@web` | Model pick updates config | NA |
| [Picking a secondary model updates the resolved cell model](packages/model-config/model-config.feature)<br>`@web` | Secondary pick updates cellModel | NA |
| [Each expanded card deep-links to that provider's key page](packages/model-config/model-config.feature)<br>`@web` | Per-provider key URL | NA |
| [The chooser shows a general how-to-get-a-key help link](packages/model-config/model-config.feature)<br>`@web` | BYOK help link | NA |
| [A typed API key stays masked until the eye toggle reveals it](packages/model-config/model-config.feature)<br>`@web` | Key masking + reveal | NA |

### `packages/table-view/table-view.feature` — Table view
Paged grid: selection, inline edit, column reorder, and the pure pagination math.

| Scenario | What it tests | ToDo |
|---|---|---|
| [There is always at least one page](packages/table-view/table-view.feature)<br>`@headless` | pageCountFor floors at 1 | NA |
| [Out-of-range pages clamp into range](packages/table-view/table-view.feature)<br>`@headless` | clampPage clamps both ends | NA |
| [The last page holds the remainder](packages/table-view/table-view.feature)<br>`@headless` | pageSlice remainder | NA |
| [Short pagers render every page number](packages/table-view/table-view.feature)<br>`@headless` | 1..7 fully listed | NA |
| [Long pagers window around the current page](packages/table-view/table-view.feature)<br>`@headless` | 1,…,16,17,18,…,40 | NA |
| [A cursor near the edge keeps single steps reachable](packages/table-view/table-view.feature)<br>`@headless` | 1,2,3,4,5,…,40 | NA |
| [The first page renders with its range readout](packages/table-view/table-view.feature)<br>`@web` | "1–10 of 95", 10 rows | NA |
| [Paging moves the visible window](packages/table-view/table-view.feature)<br>`@web` | "11–20", last "91–95" | NA |
| [Clicking a cell selects it](packages/table-view/table-view.feature)<br>`@web` | Footer "R3 · name" | NA |
| [Double-clicking edits a cell and Enter commits](packages/table-view/table-view.feature)<br>`@web` | Edit persists; fires event | NA |
| [Dragging a header reorders the columns](packages/table-view/table-view.feature)<br>`@web` | Drag reorders; fires event | NA |
| [The streaming banner follows the streaming flag](packages/table-view/table-view.feature)<br>`@web` | Banner + "running" status | NA |

### `packages/toolbar/toolbar.feature` — Toolbar
Brand lockup, file readout, action buttons, URL dialog with sample quick-picks.

| Scenario | What it tests | ToDo |
|---|---|---|
| [A .csv sample is labelled CSV, everything else JSONL](packages/toolbar/toolbar.feature)<br>`@headless` | CSV/JSONL labelling | NA |
| [Action buttons fire their callbacks](packages/toolbar/toolbar.feature)<br>`@web` | Save/Undo buttons fire events | NA |
| [The theme toggle flips the wrapper](packages/toolbar/toolbar.feature)<br>`@web` | Toggle fires theme event | NA |
| [Opening the URL dialog, typing, and loading](packages/toolbar/toolbar.feature)<br>`@web` | Open → type → submit → event | NA |
| [Picking a sample fills the URL field](packages/toolbar/toolbar.feature)<br>`@web` | Sample pick fills the field | NA |

### `packages/ui-kit/ui-kit.feature` — UI kit
Theme tokens (light/dark), brand constants, and primitive components.

| Scenario | What it tests | ToDo |
|---|---|---|
| [Light and dark themes expose the same token keys](packages/ui-kit/ui-kit.feature)<br>`@headless` | Same keys, different values | NA |
| [Brand constants carry the published hex values](packages/ui-kit/ui-kit.feature)<br>`@headless` | ink/accent/line hex | NA |
| [All four button variants render](packages/ui-kit/ui-kit.feature)<br>`@web` | ghost/chrome/primary/danger | NA |
| [Clicking a button reports the click](packages/ui-kit/ui-kit.feature)<br>`@web` | Primary click fires event | NA |
| [The full icon set renders](packages/ui-kit/ui-kit.feature)<br>`@web` | All 19 icons render | NA |
| [The theme toggle flips to dark mode and back](packages/ui-kit/ui-kit.feature)<br>`@web` | dark↔light toggle | NA |
| [The split button menu opens, picks, and closes](packages/ui-kit/ui-kit.feature)<br>`@web` | SplitButton menu flow | NA |
| [A toast appears and can be dismissed](packages/ui-kit/ui-kit.feature)<br>`@web` | Toast show + dismiss | NA |

### `packages/voice-input/voice-input.feature` — Voice input
VoicePort, MediaRecorder→WAV, and `buildVoicePrompt` context text.

| Scenario | What it tests | ToDo |
|---|---|---|
| [The prompt names the file and columns](packages/voice-input/voice-input.feature)<br>`@headless` | Prompt includes file + columns | NA |
| [A selected cell adds a 1-based, JSON-quoted context line](packages/voice-input/voice-input.feature)<br>`@headless` | Selected-cell context line (1-based) | NA |
| [No selection means no selected-cell line](packages/voice-input/voice-input.feature)<br>`@headless` | Omits the line without selection | NA |
| [The demo renders the sample prompt](packages/voice-input/voice-input.feature)<br>`@web` | Demo prompt text | NA |
| [Recording round-trips to a WAV blob](packages/voice-input/voice-input.feature)<br>`@web` | Start→stop → audio/wav blob | NA |
| [Cancelling discards the recording](packages/voice-input/voice-input.feature)<br>`@web` | Cancel → idle | NA |
