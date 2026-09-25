# TinyTable: an MCP App prototype

A learning prototype of the [MCP Apps extension](https://github.com/modelcontextprotocol/ext-apps) (SEP-1865, spec version `2026-01-26`). It shows a CSV table inside the chat, lets you edit cells in place, opens and saves files locally and over http(s), and lets you change the data by typing a request in the parent chat.

Nothing here feeds TamedTable's app. It lives under `process/prototypes/` as a standalone demo: run it by hand, read [LEARNINGS.md](LEARNINGS.md).

**Frozen.** TinyTable is no longer developed. What it taught feeds TamedTable MCP, the product described in [mcp-product-plan.md](../../journal/2026-09-24-mcp-app/mcp-product-plan.md), which is built in `src/packages/mcp-server/`. Fix it only to keep the demo server running.

![The app running in the reference host](tinytable.png)

## Run it on your own machine

```bash
cd process/prototypes/tinytable-mcp
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
      "args": ["run", "--cwd", "/absolute/path/to/process/prototypes/tinytable-mcp", "start:stdio"]
    }
  }
}
```

`start:stdio` rebuilds the view before serving, so there is no separate build step. Restart Claude Desktop, then ask it to *"show the table"*.

Over stdio the server runs on your machine, so `open-table` and `save-table` read and write your disk.

## Install from the server's own page

The deployed server serves `install.html` at its root: an **Add to Claude** button that deep-links into the add-connector dialog with the fields filled in, and an **Add to ChatGPT** button that copies the URL and lists ChatGPT's manual steps. Open <https://tamedtable.onrender.com/> and pick one.

The sections below are the same thing by hand.

## Install into ChatGPT

ChatGPT speaks the same MCP Apps standard, so the server needs no changes.

1. Settings → **Security and login** → turn on **Developer mode**.
2. Settings → **Plugins** (this is what ChatGPT now calls Connectors) → **+** → **Create plugin**. The button is hidden until Developer mode is on.
3. Name it, paste `https://tamedtable.onrender.com/mcp`, set **Authentication** to **No Auth**, tick the risk box, **Create**.

ChatGPT keeps a copy of the view and the tools. After you deploy a change to either, open the plugin in Settings, Plugins and press **Refresh**, or new chats keep the old one. Claude does the same with tools: use **Refresh tools list** in the connector's ⋯ menu, then reload any open claude.ai tab.

## Install into claude.ai

It is already running at **https://tamedtable.onrender.com/mcp**. Paste that into claude.ai under **Settings**, **Connectors**, **Add custom connector**, and skip to [what changes on a public server](#what-changes-on-a-public-server).

claude.ai runs in Anthropic's cloud and cannot reach your laptop, so the server has to sit at a public https URL. The `Dockerfile` is the whole deployment: any container host will take it.

### Deploy your own copy to Render

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New**, **Web Service**, pick the `TamedTable` repo.
3. Set **Root Directory** to `process/prototypes/tinytable-mcp`. Render sees the `Dockerfile` and switches **Language** to Docker by itself.
4. Leave the rest alone and **Deploy**. The first build takes a few minutes.
5. Open the URL it gives you. `Connect an MCP client to /mcp` means it is up.

### Point Claude at it

In claude.ai: **Settings**, **Connectors**, **Add custom connector**, and paste `https://your-service.onrender.com/mcp`.

Then ask *"show the table"*.

Set `TINYTABLE_PUBLIC_URL` to the service's URL, so the **Save file** button builds a link that points at it rather than at localhost.

On Render's free plan the service sleeps after 15 idle minutes and takes about half a minute to wake, so the first message after a pause may time out. Ask again. A sleep also loses the tables the server was holding; the view hands its rows back automatically when that happens.

### What changes on a public server

- `open-table` and `save-table` refuse local paths, because the disk belongs to the host, not to you. http(s) URLs still work. Set `TINYTABLE_LOCAL_FILES=1` to switch them back on.

### Or run the image yourself

```bash
docker build -t tinytable process/prototypes/tinytable-mcp
docker run -p 8080:8080 tinytable
```

## What is where

| File | Holds |
|---|---|
| `server.ts` | The five tools and the one `ui://` resource |
| `table.ts` | CSV parse and write, and the edit ops. Pure functions |
| `store.ts` | The tables the server holds, keyed by id |
| `main.ts` | Transports: stateless Streamable HTTP on :3001, or `--stdio`, plus the download endpoint |
| `install.html` | The landing page with the two install buttons, served at `/` |
| `Dockerfile` | The image a container host runs for the hosted path |
| `mcp-app.html`, `src/mcp-app.ts`, `src/app.css` | The view, bundled to one file by `vite-plugin-singlefile` |

## The tools

Four tools the model can call, all carrying the same `resourceUri` so any of them paints the view, plus one the view alone can call.

| Tool | Who calls it | Does |
|---|---|---|
| `show-table` | model, view | Displays a table, or the built-in sample |
| `edit-table` | model | A list of edits in one call, applied in order, all or nothing: `set-cell`, `add-row`, `delete-row`, `rename-column`, `sort`, `filter` |
| `open-table` | model, view | Reads a CSV from a local path or an http(s) URL |
| `save-table` | model, view | Writes the table to a local CSV file |
| `put-table` | view only | Stores an edit made in the grid |
| `download-link` | view only | Returns an https link that saves the table as a file |

`GET /download/<tableId>.csv` serves the table as a file, which is how the view gets one past the iframe sandbox.

Every result carries a `tableId`, and the server holds the rows under that id. The model passes the id back rather than the rows, and the view writes its grid edits under the same id, so there is one copy and the last writer wins. [LEARNINGS.md](LEARNINGS.md) has the two designs that came before this one and how each failed.
