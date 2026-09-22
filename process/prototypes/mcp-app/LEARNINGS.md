# What I learned building an MCP App

Built against the MCP Apps extension, spec version `2026-01-26`, SDK `@modelcontextprotocol/ext-apps@2.0.0`. Everything below was run, not guessed: the numbers come from driving the SDK's reference host in headless Chromium and from calling the server over HTTP.

The one-line summary: the view is a sandboxed iframe with no origin of its own, so anything that touches the outside world goes through a tool call to the server. Plan for that from the first line and the sandbox stops being a surprise.

## What worked

**The tool-plus-resource pairing.** An MCP App is one tool with `_meta.ui.resourceUri` and one resource serving a single bundled HTML file. Any tool that carries the same `resourceUri` repaints the same view, so `show-table`, `edit-table` and `open-table` all land in one place. Registering the tool is the whole integration: no host-side config, no manifest.

**App-only tools.** `_meta.ui.visibility: ["app"]` hides a tool from the model but leaves it callable from the view. The reference host listed four of my seven tools, exactly the four the model should see. This is what makes an in-grid cell edit clean: the view calls `set-cell`, the server mutates, and the model's tool list stays small.

**Keeping the data on the server.** The table lives in a module-level variable in the server process. The view holds no copy it has to reconcile, so a chat edit and a grid edit are the same write. It also survives the stateless HTTP transport, which builds a fresh `McpServer` per request.

**Editing from the parent chat.** This is the feature I expected to be hard. The model calls `edit-table` in its own turn, which does not reach an already-open view. A 2-second poll of the app-only `get-table` closes the gap: I called `edit-table` from outside while the view was open, and the row appeared in the grid within four seconds, version `v9` to `v10`. Cheap, because the call never leaves the machine.

**Opening a local file and opening a URL, both server-side.** `fs.readFile` and `fetch` in the server process. The URL case pulled a 191-row CSV off raw.githubusercontent.com with no CSP or CORS setup at all, because the request is made by Node, not by the browser.

**The native file picker.** `<input type="file">` inside the sandboxed iframe does open a real picker. The host's sandbox is `allow-scripts allow-same-origin allow-forms`, and that is enough. The bytes then exist only in the iframe, so I ship them to the server as text through an app-only `load-csv` tool.

## What was blocked

**Fetching a URL from inside the iframe.** `Refused to connect ... violates the following Content Security Policy directive: "connect-src"`. The host serves the view under a CSP built from `_meta.ui.csp.connectDomains` on the resource, and I declared none. Declaring them would have fixed this one URL, but only for origins I name at build time and only where the far end sends CORS headers. **Workaround:** `open-table` does the fetch server-side. It handles any URL and needs no CSP entry.

**Saving a file from the iframe.** The blob-plus-`<a download>` trick fires no download: the sandbox has no `allow-downloads`. I checked this was the sandbox and not the headless browser by running the same four lines on an ordinary page in the same browser, where the download fired. **Workaround:** `save-table` writes the file in the server process, which is the user's machine anyway under stdio.

**`openLink` with a `data:` URL.** My second attempt at getting a file out. The host accepted the `ui/open-link` request, then the browser refused to navigate a top-level `data:` URL, so nothing reached the disk. Worth knowing that an accepted `openLink` is not a successful one.

**Pushing an update into an open view.** There is no server-to-view notification in the extension. The view asks, the server answers. Polling is the answer, and the spec's own patterns doc says so.

## What I would do differently

**Start from the transport, not the UI.** I wrote the table state, then the tools, then the view, and the view turned out to need almost nothing: it is a `<table>` and seven `callServerTool` calls. Half a day of iframe worry bought me one file picker.

**Give every tool the same output shape from the start.** All six table tools return the same `structuredContent`, so the view has one `render()` and one `call()` helper. I added `save-table` with a different shape and immediately had to special-case it.

**Send a version counter in every result.** I added `version` for the poll and it paid for itself twice: it is also the cheapest way to see, in a screenshot, whether the view is stale.

**Reach for the reference host earlier.** `examples/basic-host` shows the tool list, the raw JSON-RPC traffic and the App's `sendLog` output in one console. It caught the CSP refusal in the first run. I spent time on `curl` against `/mcp` first, which proves the tools work and tells you nothing about the iframe.

**Write a text fallback that is worth reading.** Every tool returns a CSV preview in `content`, and that is what the model reads to answer "which country has the most rows?". Hosts that cannot render the UI get a usable answer, and so does the model when it can.

## Not verified here

I drove the SDK's reference host, not Claude Desktop, because this container has no Claude Desktop to run. The sandbox flags the reference host uses (`allow-scripts allow-same-origin allow-forms`) are the spec's minimum, so a host that grants more could let the download and the in-iframe fetch through. The `README.md` has the stdio config to point Claude Desktop at it.
