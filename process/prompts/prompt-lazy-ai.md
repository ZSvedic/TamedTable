# Prompt: page-first AI execution, grid upgrades, tour consolidation

This doc is the task spec for the "pay only for the rows you look at" change: lazy AI
execution, the table-grid upgrades, and the tour/homepage restructure that presents them.
It directs future sessions; it is not itself a spec — `spec/behavior.md` stays canonical
and gets updated in phase 2. Work runs in three phases with a human review gate after
each. Do not start a phase before the previous one is approved.

## The customer story

TamedTable works the way you check data: page by page. Load a 100,000-row file and clean
it like it were 100 rows — AI steps run on the sample you are looking at, instantly and
for cents. When it looks right, one click runs everything, with the price and time shown
before you commit. No more paying for 100,000 AI calls to find out your instruction was
wrong.

## Decisions already made

- A new AI step runs on the current page immediately — that preview is the point.
- The run-all estimate dialog shows whenever more than one page of rows is pending.
- The large-file dialog has no "don't ask again" checkbox. Small files never see it.
- Shuffle is a view: seeded, `#` column keeps original row numbers, saving keeps
  original order.
- Deterministic steps (JS, SQL, filter, sort, dedupe) still run on all rows at once.
- The dependency rule: a step that *reads* an AI-made column on all rows (sort by it,
  filter by it, reference it in JS/SQL) first shows the run-all confirmation. Decline =
  the step is not applied.
- Header-click sort and the filter row are view state, like paging — they never touch
  the spec. Chat requests ("sort by revenue") stay spec steps, as today.
- Batch CLI stays fully eager: no pages, no dialogs, byte-identical output for saved flows.

## Phase 1 — tours and homepage (public-facing, review gate)

Today each homepage feature links to its own tiny tour: new tab, same file, one
transformation, close tab, repeat — six sections × 4–5 tours. Tours are for customers
first, tests second. Replace them with **one showcase tour per section**: one input file
per section, one tab, all of that section's features demonstrated as a single story.

- Keep atomic Gherkin scenarios for CI where they earn their keep; the homepage links
  only to showcase tours. A showcase tour is itself a recorded, replayable scenario.
- Sections (from the marketing-brief feature table): Clean up, Enrich & extract,
  Classify, Validate, Language, Deterministic, Load & save. Condense where two sections
  tell one story better.
- Add a new top section **Big files**: opens a large sample (add one, tens of thousands
  of rows), points at the shuffle badge, the pending-pages marks in the pager, the
  "N of M rows evaluated" readout, and ends highlighting the run-on-all estimate dialog —
  shown, not executed, so it needs no key and costs nothing.
- Homepage: reorganize the feature table around the showcase tours; add the
  preview-page → see-the-price → run-on-all story with a screenshot of the estimate
  dialog. Update `marketing/marketing-brief.md` first (it is the copy source): the
  "Asking stays cheap" bullet becomes *"Preview for cents, run for real when you're
  sure."* Tagline unchanged.
- Deliverable: updated brief, homepage, tour list and scripts, the large sample file.
  The human edits copy directly; wait for approval.

## Phase 2 — app UX spec (review gate)

Write the behavior into `spec/behavior.md` + `spec/code-contract.md` and Gherkin
scenarios (red). No implementation yet.

- **Large-file dialog** on loading a file bigger than one page: one sentence of
  explanation, radio Shuffled sample (default) / Original order.
- **Progress indicators**: pager marks pages with pending rows; a "N of M rows
  evaluated" readout; pending rows subtly marked; failed rows distinctly marked and
  individually retryable.
- **Run on all rows** button and **Save**: same confirmation flow — rows remaining,
  estimated tokens, cost (pricing data in `benchmarks/`), time; progress bar with
  cancel; finished rows always kept. Nothing pending → Save just saves.
- **Simple mode** setting "Always run on all rows": each AI step runs table-wide
  immediately; estimate dialog when more than one page is pending.
- **Grid upgrades** in `@tamedtable/table-view`:
  - Changed cells highlight; hover shows the previous value.
  - Header-click sort with direction indicator (view state; AI columns trigger the
    dependency rule).
  - A filter row under the header (view state; same rule for AI columns).
  - Double-click on a column separator autofits that column to its content.
- Deliverable: updated specs and red Gherkin; wait for approval.

## Phase 3 — implementation (TDD until green)

1. **Row state**: each row tracks the spec-step prefix applied to it. All indicators
   derive from row state, never stored per page (page size changes with provider).
   Undo lowers the mark; the cell cache makes re-runs and resume free.
2. **Scheduler**: AI steps evaluate rows in view; opening a page queues its lagging
   rows — never more than one page of AI calls at a time. Non-AI steps run table-wide.
   The dependency rule blocks on the run-all confirmation.
3. **Shuffle**: a seeded permutation over row indices, view-level only.
4. **Order**: ① row state + lazy evaluation, ② run-on-all + save + estimates,
   ③ load dialog + shuffle, ④ indicators + grid upgrades, ⑤ simple mode + big-files
   tour recording. One PR per slice; `cd src && bun run test` green before each.

## Acceptance criteria

1. A file larger than one page shows the shuffle dialog; a one-page file never does.
2. A new AI step touches only the current page; the page fills within one concurrency wave.
3. Opening an unevaluated page evaluates exactly that page's rows.
4. Header sort on an ordinary column costs no AI beyond the visible page; on an AI
   column it shows the run-all confirmation, and declining changes nothing.
5. Run on all / Save shows rows, tokens, cost, and time first; cancel keeps finished
   rows; re-run touches only pending or failed rows.
6. Saved files keep original row order; the same file reproduces the same shuffle.
7. Failed rows are marked and retryable one by one.
8. Changed cells highlight; hover shows the prior value; double-click on a separator
   autofits the column.
9. Simple mode restores table-wide runs, with the estimate dialog when >1 page pends.
10. Batch CLI output for a saved flow is byte-identical before and after.
11. The homepage links one showcase tour per section; the Big files tour runs without
    an API key.
