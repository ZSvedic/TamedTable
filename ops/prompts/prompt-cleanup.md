Read `AGENTS.md` and `README.md` first. Find the most recent `ops/journal/YYYY-MM-DD-status.md` and read it. Run `git log --since=<last-status-date> --oneline` to see what changed since.

Walk every tracked file outside `ops/journal/` and gitignored paths. For each one:

- **Outdated?** Compare against the current state of the repo — what shipped, which files and directories exist, which version a feature lives in. Update any stale reference, regardless of file format (`.md`, `.csv`, `.txt`, anything).
- **Consistent?** Does it agree with every other tracked file? Fix any mismatch.
- **Simplified?** Can it be removed or shortened? Intentional repetition is fine (the same concept in a spec, a test, and a journal entry). Remove unintentional duplication. Delete files that no longer serve any purpose.

Then run the link check and fix any broken links:

    lychee --no-progress --accept '200..=204,403' \
      --exclude-path node_modules \
      --exclude-path src/node_modules \
      --exclude-path src/packages/web/node_modules \
      './**/*.md'

Write `ops/journal/YYYY-MM-DD-status.md` (today's date) with this table:

| File | Consistent | Simplified | Updates | Reason for existence |
|---|---|---|---|---|

The **Updates** column lists the change you made to that file in this pass. `-` if nothing changed.

Skip files in gitignored paths and frozen journal entries.
