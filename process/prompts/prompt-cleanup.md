Read `AGENTS.md` and `README.md` first. Find the most recent `process/journal/YYYY-MM-DD-status.md` and read it. Run `git log --since=<last-status-date> --oneline` to see what changed since.

Walk every tracked file outside `process/journal/` and gitignored paths. For each one:

- **Outdated?** Compare against the current state of the repo — what shipped, which files and directories exist. Update any stale reference, regardless of file format (`.md`, `.csv`, `.txt`, anything).
- **Consistent?** Does it agree with every other tracked file? Fix any mismatch. The library-package mirror must stay complete: every library package under `src/packages/` has a matching `spec/packages/<name>/` (and no spec dir is an orphan), and each package `README.md` link table (spec, scenarios, code, demo) resolves. The app packages (`core`, `headless`, `cli`, `web`) are specced at app level, not in `spec/packages/`.
- **Simplified?** Can it be removed or shortened? Intentional repetition is fine (the same concept in a spec, a test, and a journal entry). Remove unintentional duplication. Delete files that no longer serve any purpose.

Run the test suite (`cd src && bun run test`) and refresh any test-tracking file (e.g. `MAP.md`) with the latest pass/fail counts and timestamps. Map test scenarios to rows by tag or filename; do not invent values.

Then run the link check and fix any broken links:

    lychee --no-progress --accept '200..=204,403' \
      --exclude-path node_modules \
      --exclude-path src/node_modules \
      './**/*.md'

Write `process/journal/YYYY-MM-DD-status.md` (today's date) with this table:

| File | Consistent | Simplified | Updates | Reason for existence |
|---|---|---|---|---|

The **Updates** column lists the change you made to that file in this pass. `-` if nothing changed.

Skip files in gitignored paths and frozen journal entries.

For each ID in `MAP.md`, run `grep -rn '#<ID>' . --exclude-dir=node_modules --exclude-dir=.git`. `MAP.md` has two tables: for **Feature** IDs, flag any whose hits do not match the Hdls/CLI/Web `✓` columns (orphan tags in columns marked `-`, or columns marked `✓` with no hit); for **Code area** IDs (no `✓` columns), flag any ID with zero hits — a row pointing at code that no longer exists.
