# TamedTable MCP: product plan

This plan describes TamedTable MCP, the version of TamedTable that runs inside Claude and ChatGPT as an MCP App, and the tests that decide its first release. The reasons live in [mcp-rationale.md](mcp-rationale.md); what the chat apps already do without TamedTable is measured by [host-testing-plan.md](host-testing-plan.md).

Merged by model A from model A's and model O's drafts.

## Example

A user in Claude, with the TamedTable connector added:

```
User:    Open the customers CSV at <url>
Claude:  open_table(url)                    grid shows 50 of 2,000 rows; table t1, revision 1
User:    Sort by country
Claude:  apply_plan(t1, rev 1, "sort Country A to Z")
                                            engine sorts all 2,000 rows; revision 2
User:    Add a column Segment: business or consumer
Claude:  apply_plan(t1, rev 2, "Segment = AI judgment")
                                            cells marked pending; first 20 rows returned
Claude:  fill_cells(t1, batch, 20 answers)  next 20 rows returned, and so on to the end of the page
User:    Undo that
Claude:  undo(t1)                           back to the sorted table
User:    clicks "Run all rows in TamedTable Web"
                                            Web opens with the same data and recipe
```

No API key appears anywhere. Claude writes the recipe steps and fills the AI cells on the page; TamedTable's engine checks and runs them.

## What the first release does

It lets a user open a table, fix it by talking, see every change, and take the result and the recipe with them.

- **Open:** a URL (the server fetches it), pasted text, the sample, or a file picked in the grid. Host file helpers such as ChatGPT's file library are extras where they work.
- **Change by rule:** sort, filter, dedupe, rename, split, group, pivot, SQL formulas. The chat model writes one recipe step; the engine runs it on every row.
- **Change by judgment:** classify, clean, enrich, translate, validate. The chat model fills cells in batches of 20, only for the rows the user asked about. The rest stay pending.
- **Ask:** a profile of the table (empty cells, duplicates, mixed formats, outliers) and read-only questions answered over the whole table. Questions do not enter the history.
- **See:** a paged grid with changed-cell and pending-cell marks, plus manual edits for corrections.
- **Undo:** from the chat or the grid.
- **Take away:** a CSV or XLSX file, a copy on the clipboard, the `.flow` recipe, and "Run all rows in TamedTable Web". A recipe should replay in MCP, Web and CLI; test how pending AI steps and filled AI values carry over before promising identical replay.
- **Delete:** the user can delete a table at any time; every table also expires.

Rule of thumb: short, conversational jobs belong in MCP; long, visual jobs belong in Web. These stay Web-only: API key setup and model choice, voice input, the chat panel, tours, diagnostics, recents, the phone layout, AI on every row of a big file, batch CLI and benchmarks.

## How it works

The server holds each table. The chat model and the grid work on it through a table id, and neither holds a copy.

```
 Claude / ChatGPT: writes recipe steps, fills AI cells 20 at a time
        | tool calls                               ^ grid messages
        v                                          |
 mcp-server                                        |
   table store:   id -> rows with stable row ids, revision, recipe,
                  undo history, AI-cell cache, owner, expiry
   engine:        headless, declarative steps only, DuckDB locked down
   input/output:  file codecs, guarded URL fetch, expiring download links
        ^
        | one bundled HTML file
 mcp-view: paged grid, changed and pending marks, undo, export, "Run all in Web"
```

- **Small answers.** Tool results carry the id, revision, columns, counts and short results. Raw rows reach the model only when the request needs them. The grid pages through the rest with calls the model does not see, and a reopened grid fetches the same table again.
- **Revisions.** Every write sends the revision it started from: plan steps, grid edits, cell fills and undo. On a mismatch the server applies nothing and answers with the current revision and a one-line summary of the change. The chat model reads the new state and decides whether to retry. The first release never merges automatically.
- **Rule steps.** The chat model writes TablePlan steps, and the schema that guards Web and CLI validates them. The planner's knowledge ships as server instructions and tool descriptions: a trimmed `prompt-app-edit.md` with its grammar and examples.
- **AI cells.** An AI step marks its cells pending. The server hands out a batch of up to 20 row ids and input values with a token tied to those inputs and the revision. `fill_cells` accepts only the issued cells, rejects duplicates and stale inputs, reports what it saved, and advances the revision. A "Process next 20" button in the grid may post that request into the chat; E2 tests whether hosts accept it.
- **Grid edits** become recipe steps, so undo and replay see them.
- **The chat app decides** which model runs and how long the loop continues. MCP sampling is not used: the 2026-07-28 spec deprecated it.

## Tools

The model sees ten tools; the grid has three more of its own. Every tool answers in the same shape, and read tools are annotated as read-only so hosts ask fewer confirmations.

| Tool | Called by | Kind | Does |
|---|---|---|---|
| `open_table` | model, grid | write | Loads a URL, pasted text or the sample |
| `show_table` | model | read | Repaints the grid for a table |
| `profile_table` | model | read | Column statistics and suspicious values |
| `query_table` | model | read | Read-only question over the whole table, no history entry |
| `apply_plan` | model | write | Adds or changes recipe steps |
| `get_pending` | model | read | The next batch of up to 20 pending cells |
| `fill_cells` | model | write | Saves a batch of AI answers, returns the next batch |
| `undo` | model, grid | write | Steps back through the history |
| `export_table` | model, grid | read | File, clipboard text or `.flow` recipe |
| `delete_table` | model, grid | write | Deletes the table now |
| `get_page` | grid only | read | Rows for paging |
| `edit_cells` | grid only | write | Manual corrections, stored as recipe steps |
| `upload_chunk` | grid only | write | A picked file, in pieces |

## Two ways to run the server

The same code runs hosted, for claude.ai and ChatGPT, and locally, for Claude Desktop over stdio.

| | Hosted | Local |
|---|---|---|
| Who can reach it | Anyone with the URL | Only its own machine |
| Tables | Owned, expiring, rate-limited | Same, no expiry needed |
| JavaScript steps | Off | Allowed |
| Local file paths | Refused | Allowed |
| AI on all rows | Hand off to Web | Later: user's own key from the environment |

## Safety and privacy

- **Declarative steps only on the hosted server.** The engine slots that accept only JavaScript today (`join.on`, `validate`, some `group.by` forms) need safe forms first. SQL is the default form, restricted to the intended operation; arbitrary queries never enter as a change.
- **DuckDB:** load the data, then switch off file and network access and lock the settings. Add memory and time limits.
- **URL fetch:** check the destination after DNS lookup and on every redirect. Block private, loopback and cloud metadata addresses. Cap bytes, time and decompression.
- **Prompt injection:** table contents are data. Rows that reach the model are labelled as untrusted, and server instructions say to ignore instructions inside cells. `fill_cells` writes only issued cells. The host may have email or other connectors TamedTable cannot control, so E2 includes a malicious cell.
- **Keys:** no API keys in the grid or in tool arguments.
- **Sign-in:** anonymous, expiring table ids are fine for private testing. OpenAI's guidance says tools that expose user data or write should authenticate users, so plan on OAuth through an existing identity provider before a public listing, and check Claude's rules too. Every id has a hard expiry, an owner and a rate limit.
- **Privacy:** hosted MCP stores user tables, unlike browser-only Web. The `/mcp` page says where data goes, how long it stays and how to delete it.
- **Schema changes:** hosts cache tool schemas, so the server accepts older shapes for a while.

## Getting data in and out

The grid runs in a locked-down frame, so anything touching files or the network goes through the server.

| Need | What blocks it | What we do |
|---|---|---|
| Load a URL | The grid can't fetch | The server fetches, with the guard above |
| Upload a file | Chat attachments don't reach the server | Picker in the grid, paste, URL; host file helpers where offered |
| Download | The frame can't download | Host download if offered, else an expiring https link the host opens |
| Clipboard | Hosts may refuse | Ask for clipboard permission; convenience only |
| Fresh grid | A chat edit draws a new grid; a fullscreen grid doesn't update | Every grid rebuilds from the server; fullscreen re-reads by id |
| Local files | A hosted server can't see your disk | Local mode only |

## Repo

MCP becomes the fourth app over the shared engine, next to Headless, CLI and Web.

```
src/packages/
  table-plan, core, file-io, headless   shared engine, unchanged
  table-view, ui-kit                    shared grid pieces
  web, cli                              existing apps
  mcp-server                            new: tools, table store, fetch guard, HTTP + stdio
  mcp-view                              new: the grid, bundled into one HTML file
spec/packages/mcp-server/               Gherkin for the tools, run without a chat app
process/prototypes/tinytable-mcp/       moved from marketing/mcp-app
```

- **Reuse:** TablePlan schema, engine, SQL layer, undo journal, pending cells and AI-cell cache, file codecs, `table-view`, `ui-kit`, cassettes, Gherkin.
- **Write new:** table store, tools, grid wiring, file input, export, sign-in.
- **Leave out:** chat panel, toolbar, model chooser, voice, tours, browser file code, duckdb-wasm.

## Experiments

Build the smallest server and grid that can run these, then let the results set the limits.

| | Question | Run | Decides |
|---|---|---|---|
| E0 | What do ChatGPT and Claude already do? | [host-testing-plan.md](host-testing-plan.md) | Which gaps we build for |
| E1 | Can the chat model write good recipe steps? | Existing scenarios, schema alone, then schema plus trimmed planner prompt; a strong and a weaker model | Whether hosted MCP needs TamedTable's planner |
| E2 | How far will the chat model keep filling cells? | 1, 5 and 25 batches of 20 against the labelled videos; one malicious cell | Where chat AI stops and Web takes over |
| E3 | How big a table works? | Grow the table; try import, export, paging and undo in real hosts | The size cap |

- **E1 records** correct results, invalid plans, retries, prompt size and silently wrong results. Silently wrong results must be no more frequent than with the existing planner on the same scenarios. Read the actual failures before shipping. If E1 fails, revisit the no-key rule and the scope with Zel before adding any paid fallback.
- **E2 records** accuracy and coverage per batch, whether calls continue, confirmations, context growth, conflicts, and unwanted calls to other connectors. It tests the "Process next 20" button separately.
- **E3** checks ChatGPT and Claude first. Gemini support for MCP Apps is unverified.

## Order of work

1. Freeze the TinyTable prototype. Zel runs E0 while the tool contract and the E1 harness get written.
2. Run E1 with the real host setup.
3. Build the table store, revisions, safe steps and DuckDB lockdown, with Gherkin for stale writes and security limits.
4. Build the paged grid and the 20-row cell flow. Run E2 in ChatGPT and Claude.
5. Add import, export and the Web handoff. Run E3, write the `/mcp` page, set up sign-in, fix the server URL and check directory rules before submitting.

## Website

One brand, one site, two ways to use TamedTable.

- The homepage gets a second button, "Use in Claude or ChatGPT", next to "Open Web App".
- A `/mcp` page holds install buttons, example prompts, the privacy difference, limits and the rule of thumb.
- The server lives at `mcp.tamedtable.com`, fixed before any directory submission. Claude derives the grid's origin from the server URL, and hosts cache tools, so moving later hurts.
- The TinyTable name retires.

## Risks

- **Competition from the chat apps:** they already clean tables with code. E0 measures how much.
- **Quality:** chat-written steps may be worse than TamedTable's planner. E1 measures it.
- **Privacy and sign-in:** the hosted server holds user tables, which brings GDPR duties and likely a sign-in step.
- **Cost:** someone pays for AI on big files.
- **Host changes:** Claude and ChatGPT differ and change often (errors, cached tools, permissions, confirmations).
- **Distribution:** directory review, and free plans that can't add custom connectors.
- **Operations:** this is the first server TamedTable runs.
