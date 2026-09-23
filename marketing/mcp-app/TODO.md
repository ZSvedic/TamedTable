# TinyTable: what is left

Ordered. Everything here is known and deliberate, not forgotten. The prototype works; these are the gaps between a spike and something you would ship.

## Done

- ~~**Fullscreen.**~~ A button that asks for fullscreen and back, and follows the host's own close button. Works in Claude and ChatGPT web; see [LEARNINGS.md](LEARNINGS.md#fullscreen).
- ~~**Try the clients against each other.**~~ The table is in [LEARNINGS.md](LEARNINGS.md#what-each-client-allows). Three cells are still open: see item 2.
- ~~**Stop trusting `openLink`'s answer.**~~ Save file now logs that it asked, then the host's answer if one arrives, and waits on nothing.

## Next

1. **Leave room for the host's chat box in fullscreen.** Both hosts float their chat box over the bottom of a fullscreen view, and in ChatGPT it covers the last log lines. Log `safeAreaInsets` and `containerDimensions` from both hosts first, to see whether either reports the chat box; if not, pad the bottom in fullscreen.
2. **Finish the three open cells of the table.** Pick file in both clients, and whether Save file actually lands a file in each. All three need a person at the keyboard; the steps are under "Needs a human" in LEARNINGS.md.
3. **Declare `_meta.ui.csp` and `_meta.ui.domain`.** ChatGPT requires both to submit an app, and says so on the app's page. Declaring a CSP would also make the in-iframe fetch behave the same in both clients, at the cost of the probe that currently shows the difference. Keep a probe that points somewhere undeclared.
4. **Try ChatGPT's `pip` display mode.** ChatGPT lists it next to fullscreen. The button could offer it when the host does.

## Correctness

5. **Body size limit.** Express defaults to a 100 kB JSON body, so a table that `open-table` loads happily can be too big for `put-table` to send back, and the edit is lost with a 413. Raise the limit and say what the ceiling is.
6. **CSV embedded newlines.** Quoted commas and quotes round trip and are tested; a newline inside a quoted cell still splits the row.
7. **Tables never expire.** The store drops the oldest entry past 200. Fine for a demo, wrong for anything real: entries should age out on a timer, and a table nobody holds an id for is unreachable but still resident.

## Hardening, if this ever stops being a prototype

8. **`open-table` is a fetch proxy.** It refuses loopback, link-local and RFC-1918 hostnames by name, which stops the obvious cases and not DNS rebinding. A real version resolves the host and checks the address it actually connects to.
9. **Table ids are the only access control.** Anyone who knows an id can read or overwrite that table through the public server. They are random UUIDs, so this is security by unguessability. A real version ties a table to an authenticated user.
10. **No auth at all.** The server is open to anyone who finds the URL, which is the point for a demo and unacceptable otherwise.

## Nice to have

11. **Undo.** Every edit replaces the table under the same id; keeping the previous version per id would make "undo that" work from the chat.
12. **Column operations from the grid.** Sort and filter are chat-only; the headers are the obvious place for them.
13. **Bigger tables.** 191 rows render fine. There is no virtualisation, so tens of thousands will not.
