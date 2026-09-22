# TinyTable: an MCP App prototype

A learning prototype of the [MCP Apps extension](https://github.com/modelcontextprotocol/ext-apps) (SEP-1865, spec version `2026-01-26`). It shows a CSV table inside the chat, lets you edit cells in place, opens and saves files locally and over http(s), and lets you change the data by typing a request in the parent chat.

Nothing here feeds TamedTable's app. It lives under `process/` because it is a spike: run it by hand, read [LEARNINGS.md](LEARNINGS.md), throw it away.

![The app running in the reference host](tinytable.png)

## Run it

```bash
cd process/prototypes/mcp-app
bun install
bun run start          # builds the view, serves MCP on http://localhost:3001/mcp
```

To drive it from a host you can click, use the reference host that ships with the SDK:

```bash
git clone --depth 1 https://github.com/modelcontextprotocol/ext-apps.git /tmp/ext-apps
cd /tmp/ext-apps/examples/basic-host && bun install && bun run build && bun serve.ts
# open http://localhost:8080, pick "show-table", press Call Tool
```

To run it in Claude Desktop instead, build once and register the stdio transport:

```bash
bun run build
```

```json
{
  "mcpServers": {
    "tinytable": {
      "command": "bun",
      "args": ["/absolute/path/to/process/prototypes/mcp-app/main.ts", "--stdio"]
    }
  }
}
```

Then ask Claude *"show the table"*, and follow up with *"sort it by country"* or *"open ~/data.csv"*.

## What is where

| File | Holds |
|---|---|
| `server.ts` | The seven tools and the one `ui://` resource |
| `table.ts` | The table itself: in-memory state, CSV parse and write, the edit ops |
| `main.ts` | Transports: Streamable HTTP on :3001, or `--stdio` |
| `mcp-app.html`, `src/mcp-app.ts`, `src/app.css` | The view, bundled to one file by `vite-plugin-singlefile` |

## The tools

Four are visible to the model, three are marked `visibility: ["app"]` and only the view can call them.

| Tool | Who calls it | Does |
|---|---|---|
| `show-table` | model | Paints the current table |
| `edit-table` | model | `set-cell`, `add-row`, `delete-row`, `rename-column`, `sort`, `filter` |
| `open-table` | model, view | Reads a CSV from a local path or an http(s) URL |
| `save-table` | model, view | Writes the CSV to a local path |
| `get-table` | view only | The poll that catches chat-driven edits |
| `load-csv` | view only | Takes CSV text the view already holds |
| `set-cell` | view only | One cell, edited in the grid |
