# What I learned building an MCP App

Built against the MCP Apps extension, spec version `2026-01-26`, SDK `@modelcontextprotocol/ext-apps@2.0.0`. Everything below was run, not guessed: the numbers come from driving the SDK's reference host in headless Chromium and from calling the server over HTTP.

Two one-line summaries. The view is a sandboxed iframe with no origin of its own, so anything that touches the outside world goes through a tool call to the server. And the server should keep nothing between tool calls, because you do not control how the host connects.

## What worked

**The tool-plus-resource pairing.** An MCP App is one tool with `_meta.ui.resourceUri` and one resource serving a single bundled HTML file. Any tool that carries the same `resourceUri` repaints the same view, so `show-table`, `edit-table` and `open-table` all land in one place. Registering the tool is the whole integration: no host-side config, no manifest.

**App-only tools.** `_meta.ui.visibility: ["app"]` hides a tool from the model but leaves it callable from the view. The reference host listed exactly the tools the model should see. I ended up not needing it, for the reason in the next section, but the mechanism works.

**Editing from the parent chat.** This turned out to be nearly free, and not for the reason I expected. Every table tool carries the same `resourceUri`, so when the model calls `edit-table`, the host paints a fresh view with the new rows. The view does not have to be told anything; it just gets `ontoolresult` and renders.

**Opening a local file and opening a URL, both server-side.** `fs.readFile` and `fetch` in the server process. The URL case pulled a 191-row CSV off raw.githubusercontent.com with no CSP or CORS setup at all, because the request is made by Node, not by the browser.

**The native file picker.** `<input type="file">` inside the sandboxed iframe does open a real picker. The host's sandbox is `allow-scripts allow-same-origin allow-forms`, and that is enough. The bytes then exist only in the iframe, so I ship them to the server as text through an app-only `load-csv` tool.

## What broke in Claude, after passing every local test

**I assumed the model's tool calls and the view's tool calls share one MCP session. In Claude they do not.**

My first design kept the table in the server process. The model called `edit-table`, the server mutated its copy, and the view polled an app-only `get-table` to stay current. That passed everything against the reference host, where one client connection carries both.

In Claude it failed on the first try. The chat said "Sorted by country, A to Z." and the view underneath showed the original unsorted sample. The view's `get-table` was landing somewhere the model's `edit-table` had never touched, so the poll painted an untouched table over a correct result.

The fix was to stop keeping state on the server at all. Every tool now takes the current CSV as an argument and returns the new one, and the table itself lives in the view. An edit typed in the chat works because the model passes back the CSV it read from the last result. An edit made in the grid is applied locally and pushed to the model with `updateModelContext`. Nothing depends on two calls reaching the same process, let alone the same session.

I verified the new version by giving it the worst case a host can: a brand-new MCP session for every single call. Show, sort, delete, add, open a URL and save all still chain correctly.

Two lessons, and the second is the expensive one:

- **A stateless tool is the portable one.** State held between tool calls is a guess about how the host connects, and hosts differ.
- **The reference host is not the host.** It is one connection, one session, one tab, and it hid the wrong assumption completely. Anything that matters has to be tried in the real client before it counts as working.

## What was blocked

**Fetching a URL from inside the iframe.** `Refused to connect ... violates the following Content Security Policy directive: "connect-src"`. The host serves the view under a CSP built from `_meta.ui.csp.connectDomains` on the resource, and I declared none. Declaring them would have fixed this one URL, but only for origins I name at build time and only where the far end sends CORS headers. **Workaround:** `open-table` does the fetch server-side. It handles any URL and needs no CSP entry.

**Saving a file from the iframe.** The blob-plus-`<a download>` trick fires no download: the sandbox has no `allow-downloads`. I checked this was the sandbox and not the headless browser by running the same four lines on an ordinary page in the same browser, where the download fired. **Workaround:** `save-table` writes the file in the server process, which is the user's machine anyway under stdio.

**`openLink` with a `data:` URL.** My second attempt at getting a file out. The host accepted the `ui/open-link` request, then the browser refused to navigate a top-level `data:` URL, so nothing reached the disk. Worth knowing that an accepted `openLink` is not a successful one.

**Pushing an update into an open view.** There is no server-to-view notification in the extension. It matters less than it sounds: a chat-driven edit is a tool call, and a tool call paints its own view.

## What I would do differently

**Start from the transport, not the UI.** I wrote the table state, then the tools, then the view, and the view turned out to need almost nothing: it is a `<table>` and a handful of `callServerTool` calls. Half a day of iframe worry bought me one file picker.

**Give every tool the same output shape from the start.** All six table tools return the same `structuredContent`, so the view has one `render()` and one `call()` helper. I added `save-table` with a different shape and immediately had to special-case it.

**Show where the data came from, on screen.** The view prints its source and row count in the header. That one line is what made the session bug visible in a screenshot: the label said `sample` when the chat had just sorted 191 rows.

**Reach for the reference host earlier.** `examples/basic-host` shows the tool list, the raw JSON-RPC traffic and the App's `sendLog` output in one console. It caught the CSP refusal in the first run. I spent time on `curl` against `/mcp` first, which proves the tools work and tells you nothing about the iframe.

**Write a text fallback that is worth reading.** Every tool returns a CSV preview in `content`, and that is what the model reads to answer "which country has the most rows?". Hosts that cannot render the UI get a usable answer, and so does the model when it can.

## Getting it onto the internet

Claude Desktop and claude.ai want two different things from the same server. Desktop launches it over stdio on your own machine, so a file path in a JSON config is the whole install. claude.ai runs in Anthropic's cloud and can only reach a public https URL, so the same code has to be deployed somewhere that runs a process.

That rules out this repo's own PR preview, which is GitHub Pages: static files, no process, nothing to POST to. A static host can serve the view's HTML, but the view is not the app. The app is the tool calls.

Going public also forced the local-file tools off. `open-table` and `save-table` read and write the machine the server runs on. On your laptop that is the point. On a public host that is somebody else's disk, so they refuse a path unless `TINYTABLE_LOCAL_FILES=1` says the machine is yours. Opening an http(s) URL is unaffected.

The multi-tenancy problem solved itself: a server with no state has nothing for one visitor to leak to another.

## Not verified here

The sandbox findings come from the SDK's reference host, whose flags (`allow-scripts allow-same-origin allow-forms`) are the spec's minimum. A host that grants more could let the download and the in-iframe fetch through.

The session finding comes from Claude itself, on the deployed server.
