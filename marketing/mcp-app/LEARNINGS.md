# What I learned building an MCP App

Built against the MCP Apps extension, spec version `2026-01-26`, SDK `@modelcontextprotocol/ext-apps@2.0.0`. Everything below was run, not guessed: the numbers come from driving the SDK's reference host in headless Chromium and from calling the server over HTTP.

Two one-line summaries. The view is a sandboxed iframe with no origin of its own, so anything that touches the outside world goes through a tool call to the server. And the model should be given a handle to the data, never a copy of it, because you control neither how the host connects nor which copy the model reaches for.

## What worked

**The tool-plus-resource pairing.** An MCP App is one tool with `_meta.ui.resourceUri` and one resource serving a single bundled HTML file. Any tool that carries the same `resourceUri` repaints the same view, so `show-table`, `edit-table` and `open-table` all land in one place. Registering the tool is the whole integration: no host-side config, no manifest.

**App-only tools.** `_meta.ui.visibility: ["app"]` hides a tool from the model but leaves it callable from the view. The reference host listed exactly the four tools the model should see and kept `put-table` out of them. That is what lets a grid edit reach the server without teaching the model a tool it should never call.

**Editing from the parent chat.** This turned out to be nearly free, and not for the reason I expected. Every table tool carries the same `resourceUri`, so when the model calls `edit-table`, the host paints a fresh view with the new rows. The view does not have to be told anything; it just gets `ontoolresult` and renders.

**Opening a local file and opening a URL, both server-side.** `fs.readFile` and `fetch` in the server process. The URL case pulled a 191-row CSV off raw.githubusercontent.com with no CSP or CORS setup at all, because the request is made by Node, not by the browser.

**The native file picker.** `<input type="file">` inside the sandboxed iframe does open a real picker. The host's sandbox is `allow-scripts allow-same-origin allow-forms`, and that is enough. The bytes then exist only in the iframe, so I ship them to the server as text through an app-only `load-csv` tool.

## What broke in Claude, after passing every local test

**I assumed the model's tool calls and the view's tool calls share one MCP session. In Claude they do not.**

My first design kept the table in the server process. The model called `edit-table`, the server mutated its copy, and the view polled an app-only `get-table` to stay current. That passed everything against the reference host, where one client connection carries both.

In Claude it failed on the first try. The chat said "Sorted by country, A to Z." and the view underneath showed the original unsorted sample. The view's `get-table` was landing somewhere the model's `edit-table` had never touched, so the poll painted an untouched table over a correct result.

My first fix went too far the other way: the server kept nothing, every tool took the current CSV as an argument, and the table lived in the view. Chat edits worked again, because the model passed back the CSV it had read from the last tool result.

That lasted until someone added a row in the view. The next chat edit wiped it. The model had two copies to choose from, the CSV in the last tool result and the newer one the view had sent with `updateModelContext`, and it used the older one. The spec explains why it is allowed to: a view's context update *overwrites* the previous one and the host **MAY** defer delivering it until the next user message, so nothing puts it after the stale tool result.

The fix that held is a third design. The server keeps tables in a map **keyed by id, never by session**. Every result carries a `tableId`; the model passes that id back, and the view writes its own edits under the same id through an app-only `put-table`. Whoever wrote last wins, because there is only one copy. The model never handles rows at all, only a short opaque string, and the tool results carry a 20-row preview rather than the table.

I verified it by giving the server the worst case a host can: a brand-new MCP session for every single call. Add a row in the view, then delete a row from the chat passing only the id, and the added row survives.

Three lessons, and the last one is the expensive one:

- **Give the model a handle, not the data.** A copy of the data in the model's context is a copy that will go stale, and the model cannot tell which copy is newest. An id cannot go stale.
- **Session state is a guess about how the host connects.** Key shared state by something that travels in the arguments instead.
- **The reference host is not the host.** It is one connection, one session, one tab, and it hid both wrong assumptions completely. Anything that matters has to be tried in the real client before it counts as working.

A fourth thing fell out of the third. Once the tables were keyed by id, the HTTP transport had no reason to hand out session ids, and holding them was actively harmful: a free-tier host sleeps, the process restarts, and every client still sending an old session id gets `400 Server not initialized`. The transport is now stateless, a fresh server per request, and the id in the arguments carries the continuity. A restart now costs one lost table rather than a dead connector, and the view notices: when the server says it has never heard of an id, the view hands its rows back under that id and retries.

## The same server in ChatGPT

It worked with no code changes at all. OpenAI's own docs say ChatGPT "implements the open MCP Apps standard," and they mean it: same `_meta.ui.resourceUri`, same `text/html;profile=mcp-app`, same view, same `tableId` round trip. One server, two clients, one build.

Four things worth knowing before trying it:

- **Connectors is called Plugins.** ChatGPT renamed the page in July 2026, and the Developer mode toggle moved to **Security and login**. Guides written before then send you to a page that no longer exists. The **+** button on Plugins is not rendered at all until Developer mode is on.
- **Authentication defaults to OAuth.** A server with no auth has to be set to **No Auth** by hand, or the dialog fails discovering OAuth settings that were never there.
- **ChatGPT labels the view `CSP off`.** Developer-mode apps run without the production Content Security Policy, and there is a separate toggle, "Enforce CSP in developer mode", to put it back. Claude gives no such choice, and the difference is visible: the in-iframe fetch that Claude refuses returns `200, 2613 bytes` in ChatGPT. Same view, same sandbox, opposite answers. The CSP block is host policy.
- **A relaxed CSP is not a relaxed sandbox.** With `CSP off`, the download button still does nothing in ChatGPT. CSP governs what the page may talk to; the sandbox attribute governs what it may do. Only one of them was loosened.
- **ChatGPT throws failed tool calls, Claude returns them.** A tool answering with `isError` reaches the view as a result in Claude and as a thrown `ProtocolError` in ChatGPT. Code that only inspects `result.isError` silently misses half the failures. Mine did, and the recovery path it guarded never ran until I handled both.
- **`_meta.ui.csp` and `_meta.ui.domain` are required to submit an app**, and ChatGPT says so on the app's page as soon as you connect. They are optional for development, so this prototype ships without them, but anything headed for the ChatGPT directory needs both.

## Putting an install button on a web page

Claude takes a prefilled deep link, so "Add to Claude" is a real one-click button:

```
https://claude.ai/settings/connectors?modal=add-custom-connector&mcpName=<name>&mcpServerUrl=<url>
```

It opens the add-connector dialog with both fields filled; the user only confirms. The parameter names are community-documented rather than official, and Claude has moved the connectors path before, so treat it as something to re-check, not as an API.

ChatGPT has no equivalent. The honest "Add to ChatGPT" button copies the server URL, opens ChatGPT's settings, and lists the three manual steps. This prototype's own landing page (`install.html`, served at `/`) does exactly that, so the deployed server is its own install page.

## What was blocked

**Fetching a URL from inside the iframe.** `Refused to connect ... violates the following Content Security Policy directive: "connect-src"`. The host serves the view under a CSP built from `_meta.ui.csp.connectDomains` on the resource, and I declared none. Declaring them would have fixed this one URL, but only for origins I name at build time and only where the far end sends CORS headers. **Workaround:** `open-table` does the fetch server-side. It handles any URL and needs no CSP entry.

**Saving a file from the iframe.** The blob-plus-`<a download>` trick fires no download: the sandbox has no `allow-downloads`. I checked this was the sandbox and not the headless browser by running the same four lines on an ordinary page in the same browser, where the download fired. **Workarounds:** two, both in the section below.

**`openLink` with a `data:` URL.** My second attempt at getting a file out. The host accepted the `ui/open-link` request, then the browser refused to navigate a top-level `data:` URL, so nothing reached the disk. Worth knowing that an accepted `openLink` is not a successful one.

*Corrected on 23 September 2026:* that was the reference host. Claude refuses a `data:` link outright, and ChatGPT accepts it and then gets nothing either. See [the cross-client table](#what-each-client-allows).

**Pushing an update into an open view.** There is no server-to-view notification in the extension. It matters less than it sounds: a chat-driven edit is a tool call, and a tool call paints its own view.

## Getting a file out anyway

The download block reads like a showstopper for anything that edits data. It is not, once you stop trying to make the iframe produce the file.

**A link the host opens.** The server holds the table already, so it also serves it: `GET /download/<tableId>.csv`, with `Content-Disposition: attachment`. The view asks an app-only tool for that URL and passes it to `openLink`. The host opens an ordinary https link in the user's own browser, outside the sandbox, and the attachment header turns opening into saving. Verified end to end: the host accepted the link, and the endpoint answers `200`, `text/csv`, with the attachment header set.

This is the difference that matters. `openLink` with a `data:` URL is refused by the browser; `openLink` with an https URL is just a link.

**The clipboard.** `navigator.clipboard.writeText` inside the sandbox, with the old `execCommand("copy")` as a fallback. One of the two works: I read the clipboard back after clicking and it held the CSV. It needs no server, no host cooperation and no permission prompt, only a user gesture, so it is the cheapest escape hatch there is and worth having even when a download link exists.

## Two bugs the second client found

Neither showed up in Claude, and both were mine rather than the host's.

**A probe that only reported.** The in-iframe fetch button was written when the answer was always "blocked", so it logged the byte count and threw the bytes away. The first time a host allowed the fetch, it printed `succeeded: 200, 2613 bytes` and loaded nothing. A probe whose success path does nothing is a probe that lies the day it starts working.

**One recovery path, and a button that walked around it.** Every server call went through a wrapper that re-sends the table when the server has forgotten it, except the Save file button, which called the tool directly because it needed the result back. It was the one button that failed after a redeploy. The wrapper now returns the result, so there is one door and no reason for anything to take another.

## What I would do differently

**Start from the transport, not the UI.** I wrote the table state, then the tools, then the view, and the view turned out to need almost nothing: it is a `<table>` and a handful of `callServerTool` calls. Half a day of iframe worry bought me one file picker.

**Give every tool the same output shape from the start.** All six table tools return the same `structuredContent`, so the view has one `render()` and one `call()` helper. I added `save-table` with a different shape and immediately had to special-case it.

**Make every server call go through one function.** Two of the three bugs in the paragraphs above are the same bug: something bypassed the shared path. The wrapper should return the tool result from the start, so no caller ever has a reason to skip it.

**Show where the data came from, on screen.** The view prints its source and row count in the header. That one line is what made the session bug visible in a screenshot: the label said `sample` when the chat had just sorted 191 rows.

**Reach for the reference host earlier.** `examples/basic-host` shows the tool list, the raw JSON-RPC traffic and the App's `sendLog` output in one console. It caught the CSP refusal in the first run. I spent time on `curl` against `/mcp` first, which proves the tools work and tells you nothing about the iframe.

**Write a text fallback that is worth reading.** Every tool returns a CSV preview in `content`, and that is what the model reads to answer "which country has the most rows?". Hosts that cannot render the UI get a usable answer, and so does the model when it can.

## Getting it onto the internet

Claude Desktop and claude.ai want two different things from the same server. Desktop launches it over stdio on your own machine, so a file path in a JSON config is the whole install. claude.ai runs in Anthropic's cloud and can only reach a public https URL, so the same code has to be deployed somewhere that runs a process.

That rules out this repo's own PR preview, which is GitHub Pages: static files, no process, nothing to POST to. A static host can serve the view's HTML, but the view is not the app. The app is the tool calls.

Going public also forced the local-file tools off. `open-table` and `save-table` read and write the machine the server runs on. On your laptop that is the point. On a public host that is somebody else's disk, so they refuse a path unless `TINYTABLE_LOCAL_FILES=1` says the machine is yours. Opening an http(s) URL is unaffected.

Tables are keyed by a random id rather than by user, so visitors are separated by not being able to guess each other's ids. That is fine for a prototype and would not be fine for anything real.

## Fullscreen

Both clients offer fullscreen and grant it when the view asks. The view declares `availableDisplayModes: ["inline", "fullscreen"]` when it connects, shows a Fullscreen button only when the host lists `fullscreen`, and asks with `requestDisplayMode`. The button's label and the layout follow `displayMode` in the host context, not the button's own idea of the mode, because the host can leave fullscreen by itself.

What each host said and did, from the view's log:

- **Claude:** `Host display mode inline, offers inline, fullscreen.` then `Asked for fullscreen, the host gave fullscreen.`
- **ChatGPT:** `Host display mode inline, offers inline, fullscreen, pip.` then the same grant, and `Asked for inline, the host gave inline.` on the way back. ChatGPT also offers `pip` (picture in picture), which I did not try.

In both, the host's own close button (the X in the header it draws) sent a context change and the button went back to "Fullscreen" with no extra code. That is the reason to follow the context rather than the click.

Both hosts wrap the fullscreen view in their own frame: a header with a name and an X on top, and the chat box floating over the bottom. Claude's header shows the connector's name (`tamedtable.onrender`), ChatGPT's the app's (`TinyTable`), and ChatGPT's chat box reads "Ask TinyTable". In ChatGPT that chat box covers the last lines of the view, so anything pinned to the bottom of a fullscreen view needs room left under it.

## What each client allows

Tried on 23 September 2026, in Chrome on a Mac, against the deployed server: claude.ai (Sonnet 5) and chatgpt.com in developer mode. Each cell quotes the view's own log line or says what I checked outside the browser. Android and iOS were out of reach, so they are not here.

Both hosts put the view in an iframe with the same sandbox, `allow-scripts allow-same-origin allow-forms`, read from the page's DOM. So the reference host's flags were the real ones, and the sandbox findings above hold in both clients. The `allow` attribute differs: Claude sets `fullscreen *`, ChatGPT sets `local-network-access *; microphone *; midi *`. Neither grants `clipboard-write`.

| Capability | Claude | ChatGPT | Who decides |
|---|---|---|---|
| Fullscreen | Granted, and back. | Granted, and back. Also offers `pip`. | The host. |
| In-iframe fetch ("Fetch in page", was "Fetch here…") | `In-iframe fetch blocked: TypeError: Failed to fetch.` | CSP off: `In-iframe fetch succeeded: 200, 2613 bytes. Loading it.`, and the grid showed 191 rows. CSP on: `In-iframe fetch blocked: TypeError: Failed to fetch.` | The host's CSP. The same view in the same sandbox flips with ChatGPT's "Enforce CSP" toggle. |
| Blob download ("Blob download", was "Download… (blocked)") | `Download click dispatched.` Nothing new in `~/Downloads`. | Same. | The sandbox: no `allow-downloads` in either. |
| `openLink` to a `data:` URL ("data: link", was "Save via data: URL") | `openLink with a data: URL was refused by the host.` | `openLink with a data: URL was accepted by the host.` ChatGPT then showed an "External site" dialog with the whole URL. When I pressed its Open link from a background tab, I saw no tab and no file. From a tab in front, with the CSP off, the link opened: a person pressing the same button saw it work. | Claude: the host says no. ChatGPT: the host passes it on, and it works. |
| `openLink` to an https URL ("Save file") | Claude showed an "Open external link" dialog with the download URL. Its Open link button stayed disabled the whole time, because the tab was never the visible one (`document.visibilityState` was `hidden`). The view's `openLink` call never returned, before or after I closed the dialog. | ChatGPT answered at once (`Opened https://tamedtable.onrender.com/download/….csv; your browser should save it.`), then showed an "External site" dialog. I pressed Open link. No file appeared in `~/Downloads`, though the same URL answers `200`, `text/csv`, `attachment` to curl. | Both hosts put a confirmation in front of the link. Whether a file lands is unconfirmed in both: see [Needs a human](#needs-a-human). |
| Native file picker ("Pick file…") | Not tried. | Not tried. | See [Needs a human](#needs-a-human). |
| Clipboard ("Copy CSV") | `Copied with the fallback path.` `pbpaste` gave back the exact five lines of the sample. | Same, and the same five lines. | The iframe's `allow` attribute. `navigator.clipboard.writeText` needs `clipboard-write`, which neither host grants, so both fall through to `execCommand("copy")`, which a keypress still allows. |
| A grid edit survives a chat edit | `Set row 0, name.` (Ada Lovelace to Ada King), then "sort by country" in the chat. Claude called `edit-table` with `op: sort` and the view's `tableId`. Result: Hedy Lamarr, Ada King, Alan Turing, Grace Hopper. | Same edit, same request, same result. | The design: one copy per `tableId`. Both models passed the id back. |

Three things in that table I did not expect:

- **An accepted `openLink` tells the view nothing.** ChatGPT says yes before the user has answered its dialog. Claude says nothing until the user answers, and with the dialog dismissed it never answered. A view cannot tell from `openLink` whether anything opened, in either client.
- **Claude refuses what ChatGPT forwards.** For a `data:` link the two hosts made opposite calls. In ChatGPT the link opens, so a `data:` link is a way out of the sandbox there that needs no server.

*Corrected the same day:* I first wrote that Chrome refuses the `data:` page ChatGPT opens. That came from a test in a background tab, where I could not see a new tab appear. A person testing with the tab in front saw the link open.
- **The clipboard works for a reason that looks like luck.** Only the deprecated `execCommand` path copies. If a browser drops it, or a host starts blocking it, copying breaks in both clients at once.

## Two more bugs the real clients found

**A host can replay an old result.** Turning on ChatGPT's "Enforce CSP" reloaded the view, and the view painted the first `show-table` result it had ever been given: the 4-row sample, although it had just loaded 191 rows under the same `tableId`. The server had the right table the whole time. The view now asks `show-table` for its id after painting any tool result, and repaints if the server's copy differs. After a reload, Claude's first view logged `The host replayed an older result. Showing the server's copy.` and showed the sorted, edited table.

**That fix had a race of its own, and Claude showed it at once.** The check ran right after a deploy, which had restarted the server and emptied it. Every view on the page loaded together, each got "No table with id", and each sent its own rows back through the shared recovery path. The newest view happened to write last. Nothing made sure it would, and the oldest view's rows are the 4-row sample. The check now reads without recovery, so a view only writes when the user does something in it.

## How the testing was driven

The Claude in Chrome extension cannot click inside the app's iframe in either client. Its clicks land on the host page instead: text I typed after clicking a grid cell went into Claude's own chat box. The keyboard does reach the iframe. Focusing the iframe element and pressing Tab lands on the view's first control, and Enter presses a button. Every in-view action above was done that way, which also means every one of them ran with the user activation a keypress gives.

The screenshots stayed inside the browser tool; I could not save them as files (macOS refused `screencapture`, and the extension keeps its images). So the evidence here is the view's log lines, the page DOM, `pbpaste`, `~/Downloads` and curl.

## Needs a human

- **Pick file…** in both clients. The picker is a native dialog that would open over the Chrome window, and I could only see that window, not click in it. The reference host showed the picker opening.
- **Save file in Claude.** Bring the Claude tab to the front, press Save file, then Open link, and check that `table.csv` downloads.
- **Save file in ChatGPT.** Press Open link and check where the file goes; it did not land in `~/Downloads`.
- **Android and iOS**, for fullscreen above all: other people report blank fullscreen views on Android.

## Not verified here

The session finding comes from Claude itself, on the deployed server. The sandbox findings now come from both clients as well as the reference host.
