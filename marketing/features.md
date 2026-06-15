# Features

The top features, each paired with the benefit a reader actually cares about. It owns the "what you get" list; the "why it matters" framing is in [positioning.md](positioning.md), and the exact behavior is in [spec/behavior.md](../spec/behavior.md).

Lead with the differentiators, not the table of options. The first three are the ones nothing else does at once.

## The headline three

- **Plain-language transformations.** Type *"drop duplicate emails"* or *"normalize phone numbers"* — the LLM writes the spec, you never touch Pandas or regex. *So anyone on the team can clean data, not just the coder.*
- **You keep a replayable recipe.** Every turn saves to a small JSON flow. Replay it on new data with no model call, or export it as a standalone Python script. *So the work outlives the session and the tool.*
- **Flat cost as data grows.** The model edits the spec, never the whole table, so per-turn token cost stays constant whether you have 100 rows or a million. *So big tables don't mean big bills.*

## The rest

| Feature | What it gives you |
|---|---|
| **Web UI + CLI, one engine** | Prototype by clicking, ship by scripting — no rewrite between the two. |
| **Per-row, per-cell diffs** | Watch each change as it lands; see exactly what the transformation did. |
| **Undo and history** | Every patch is reversible — `:undo` in the CLI, **Undo** in the web app. |
| **Save data or save the flow** | Write the cleaned rows out, or save the recipe to run again later. |
| **Python export** | `:save-py` turns any flow into a standalone script — no TamedTable needed to run it. |
| **Runs offline once recorded** | Saved flows replay with zero API calls — fast, key-free, repeatable. |
| **CSV and JSONL in and out** | Load and save the formats data teams already pass around. |
| **Open source** | No lock-in, no proprietary format, inspect every line. |

## Honest limits

Worth stating up front — credibility with the dev audience depends on it:

- The web UI can't run `{sql}` transformations (DuckDB is native, not browser-friendly) and saves JSONL only. The CLI does the full set.
- LLM-filled cells aren't byte-deterministic across model versions; the recipe is stable, an individual ambiguous cell may shift.
- CSV and JSONL today — `.xlsx` and `.parquet` are out of scope until their scenarios exist.
