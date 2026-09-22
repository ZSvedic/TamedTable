# TinyTable: an MCP App prototype

A learning prototype of the [MCP Apps extension](https://github.com/modelcontextprotocol/ext-apps) (SEP-1865, spec version `2026-01-26`). It shows a CSV table inside the chat, lets you edit cells in place, opens and saves files locally and over http(s), and lets you change the data by typing a request in the parent chat.

Nothing here feeds TamedTable's app. It lives under `marketing/` as a standalone demo: run it by hand, read [LEARNINGS.md](LEARNINGS.md).

![The app running in the reference host](tinytable.png)

## Run it on your own machine

```bash
cd marketing/mcp-app
bun install
bun run start          # builds the view, serves MCP on http://localhost:3001/mcp
                       # local runs set TINYTABLE_LOCAL_FILES=1, so file tools work
```

To drive it from a host you can click, use the reference host that ships with the SDK:

```bash
git clone --depth 1 https://github.com/modelcontextprotocol/ext-apps.git /tmp/ext-apps
cd /tmp/ext-apps/examples/basic-host && bun install && bun run build && bun serve.ts
# open http://localhost:8080, pick "show-table", press Call Tool
```

## Install into Claude Desktop

Claude Desktop launches the server itself over stdio, so it needs a path and nothing else. Settings, Developer, Edit Config:

```json
{
  "mcpServers": {
    "tinytable": {
      "command": "bun",
      "args": ["run", "--cwd", "/absolute/path/to/marketing/mcp-app", "start:stdio"]
    }
  }
}
```

`start:stdio` rebuilds the view before serving, so there is no separate build step. Restart Claude Desktop, then ask it to *"show the table"*.

Over stdio the server runs on your machine, so `open-table` and `save-table` read and write your disk.

## Install into claude.ai

claude.ai runs in Anthropic's cloud and cannot reach your laptop, so the server has to sit at a public https URL. The `Dockerfile` is the whole deployment: any container host will take it.

### Put it on Render

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New**, **Web Service**, pick the `TamedTable` repo.
3. Set **Root Directory** to `marketing/mcp-app`. Render sees the `Dockerfile` and switches **Language** to Docker by itself.
4. Leave the rest alone and **Deploy**. The first build takes a few minutes.
5. Open the URL it gives you. `Connect an MCP client to /mcp` means it is up.

### Point Claude at it

In claude.ai: **Settings**, **Connectors**, **Add custom connector**, and paste `https://your-service.onrender.com/mcp`.

Then ask *"show the table"*.

On Render's free plan the service sleeps after 15 idle minutes and takes about half a minute to wake, so the first message after a pause may time out. Ask again.

### What changes on a public server

- Each MCP session gets its own table, so one visitor never sees another's data.
- `open-table` and `save-table` refuse local paths, because the disk belongs to the host, not to you. http(s) URLs still work. Set `TINYTABLE_LOCAL_FILES=1` to switch them back on.

### Or run the image yourself

```bash
docker build -t tinytable marketing/mcp-app
docker run -p 8080:8080 tinytable
```

## What is where

| File | Holds |
|---|---|
| `server.ts` | The seven tools and the one `ui://` resource |
| `table.ts` | The table itself: one instance per MCP session, CSV parse and write, the edit ops |
| `main.ts` | Transports: Streamable HTTP on :3001, or `--stdio` |
| `Dockerfile` | The image a container host runs for the claude.ai path |
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
