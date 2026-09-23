# TinyTable: what is left

Ordered. Everything here is known and deliberate, not forgotten. The prototype works; these are the gaps between a spike and something you would ship.

## Next

1. **Fullscreen.** The extension has `requestDisplayMode({ mode: "fullscreen" })` and a way back to `"inline"`, and both hosts support it: reported working on ChatGPT web and iOS, with Android bugs where the view can open blank depending on where the widget sits. A table is exactly the thing that wants the whole window, so this is the first real feature to add. Handle `onDisplayModeChanged` so the grid can show more rows when it has the room.
2. **Try the clients against each other.** ChatGPT runs developer-mode apps with the CSP off, so the in-iframe fetch works there and not in Claude. Flip "Enforce CSP in developer mode" on and confirm it starts failing. Same for `openLink`, the file picker and the clipboard: the matrix of what each host allows is the most useful thing this prototype can produce.
3. **Declare `_meta.ui.csp` and `_meta.ui.domain`.** ChatGPT requires both to submit an app, and says so on the app's page. Declaring a CSP would also make the in-iframe fetch behave the same in both clients, at the cost of the probe that currently shows the difference. Keep a probe that points somewhere undeclared.

## Correctness

4. **Body size limit.** Express defaults to a 100 kB JSON body, so a table that `open-table` loads happily can be too big for `put-table` to send back, and the edit is lost with a 413. Raise the limit and say what the ceiling is.
5. **CSV embedded newlines.** Quoted commas and quotes round trip and are tested; a newline inside a quoted cell still splits the row.
6. **Tables never expire.** The store drops the oldest entry past 200. Fine for a demo, wrong for anything real: entries should age out on a timer, and a table nobody holds an id for is unreachable but still resident.

## Hardening, if this ever stops being a prototype

7. **`open-table` is a fetch proxy.** It refuses loopback, link-local and RFC-1918 hostnames by name, which stops the obvious cases and not DNS rebinding. A real version resolves the host and checks the address it actually connects to.
8. **Table ids are the only access control.** Anyone who knows an id can read or overwrite that table through the public server. They are random UUIDs, so this is security by unguessability. A real version ties a table to an authenticated user.
9. **No auth at all.** The server is open to anyone who finds the URL, which is the point for a demo and unacceptable otherwise.

## Nice to have

10. **Undo.** Every edit replaces the table under the same id; keeping the previous version per id would make "undo that" work from the chat.
11. **Column operations from the grid.** Sort and filter are chat-only; the headers are the obvious place for them.
12. **Bigger tables.** 191 rows render fine. There is no virtualisation, so tens of thousands will not.
