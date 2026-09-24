# mcp-server behavior

The server holds each table. The chat model and the grid reach it through a table id and a revision number, and neither holds a copy of the rows. The chat model changes the table by writing recipe steps; TamedTable's engine checks them and runs them on every row.

```
 Claude / ChatGPT: writes recipe steps, fills AI cells 20 at a time
        | tool calls                               ^ grid messages
        v                                          |
 mcp-server: table store (id → rows, revision, recipe, history), engine
        ^
        | one bundled HTML file
 mcp-view: paged grid, changed and pending marks, undo, export
```

## Tools

The model sees ten tools; the grid calls three more that the model never sees (MCP Apps `visibility: ["app"]`). Read tools carry MCP's `readOnlyHint`, so hosts ask fewer confirmations. The names, descriptions and input schemas live in `tools.ts`; `tools()` returns all thirteen and `modelTools()` the ten.

| Tool | Called by | Kind | Does |
|---|---|---|---|
| `open_table` | model, grid | write | Loads a URL, pasted text or the sample |
| `show_table` | model | read | Repaints the grid; returns revision, columns, row count, recipe |
| `profile_table` | model | read | Column statistics and suspicious values |
| `query_table` | model | read | Read-only SQL over the whole table, no history entry |
| `apply_plan` | model | write | Edits the recipe |
| `get_pending` | model | read | The next batch of up to 20 pending AI cells |
| `fill_cells` | model | write | Saves a batch of AI answers, returns the next batch |
| `undo` | model, grid | write | Steps back through the history |
| `export_table` | model, grid | read | CSV or XLSX link, clipboard text, or the `.flow` recipe |
| `delete_table` | model, grid | write | Deletes the table now |
| `get_page` | grid | read | Rows for one grid page |
| `edit_cells` | grid | write | Manual corrections, stored as recipe steps |
| `upload_chunk` | grid | write | One piece of a picked file |

## Revisions

Every write that changes the recipe (`apply_plan`, `undo`, `edit_cells`) carries the revision it started from. On a mismatch the server changes nothing and answers with the current revision and a one-line summary of what changed. The chat model reads the new state and decides whether to retry; the server never merges.

## apply_plan

apply_plan takes RFC 6902 ops over the recipe `{columns, transformations}`, the same patch headless's planner writes, so the planner's rules and few-shots carry over unchanged:

```
apply_plan({ table_id: "t1", revision: 2, summary: "Sorted by Revenue, highest first.",
  operations: [{ op: "add", path: "/transformations/-",
                 value: { kind: "sort", by: [{ key: "Revenue", dir: "desc" }] } }] })
→ { ok: true, table_id: "t1", revision: 3 }
→ { ok: false, table_id: "t1", revision: 2, error: "transformations.0.by: sort.by must be non-empty" }
```

- `value` is typed JSON: a step, a column, or an array of either. The step schema is the TablePlan transformation union, generated from its Zod schema, without the `query`/`name` provenance the runner stamps.
- The server applies the ops, validates the recipe with the same check headless uses, runs it, and answers. On an error the model fixes the ops and calls again.

## Server instructions

`serverInstructions()` returns the text the server hands the chat app: [prompt-app-edit.md § MCP_INSTRUCTIONS](../../prompt-app-edit.md), with `{PLANNER_KNOWLEDGE}` replaced by `SYSTEM_PROMPT` trimmed to what a change needs (rules, spec shape, grammar, expression shapes, and the few-shots that change the table). `serverInstructions('schema')` leaves the placeholder empty; E1 compares the two.
