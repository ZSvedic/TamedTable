Read `AGENTS.md` and `README.md` first. Then run `git log --oneline -20` and `git diff main~1..main` to see what recently changed.

Audit every tracked file:

- **Consistent?** Does it agree with every other file? Fix any mismatch.
- **Simplified?** Can it be removed or shortened? Some intentional repetition is fine (e.g., the same concept in a spec, a test, and a journal entry). Remove unintentional duplication.

Write `ops/journal/YYYY-MM-DD-status.md` (today's date) with a four-column table:

| File | Consistent | Simplified | Reason for existence |
|---|---|---|---|

Skip cache and package directories (`node_modules`, `.gitignore` targets).
