# Autopilot: drive TinyTable in a real browser for an hour

You are running in the Claude desktop app on a Mac, with control of a Chrome window that already has tabs open and signed in to **claude.ai** and **chatgpt.com**. The human has left. They will read the result in an hour.

**Do not ask the human to click anything.** If you find yourself writing "could you try", stop and drive the browser yourself. If something genuinely cannot be done without them, note it in LEARNINGS.md under "Needs a human" and move on to the next experiment.

## The thing you are working on

`marketing/mcp-app/` in the TamedTable repository: TinyTable, a prototype MCP App (the MCP Apps extension, SEP-1865). Read these first, in this order:

1. `marketing/mcp-app/README.md`: what it is and how to run it.
2. `marketing/mcp-app/LEARNINGS.md`: what is already known. Do not rediscover it.
3. `marketing/mcp-app/TODO.md`: what is left. Item 1, fullscreen, is your main build task.

It is deployed at `https://tamedtable.onrender.com/mcp` and both browser tabs already have it connected. Render's free plan sleeps after 15 idle minutes, so the first call after a pause may time out; call it again rather than concluding it is broken.

## What to do, in order

**1. Build fullscreen (TODO item 1).** The extension has `requestDisplayMode({ mode: "fullscreen" })` and a way back to `"inline"`. Add a button, handle the display-mode change so the grid uses the space it gets, and make the button reflect the current mode. The SDK's own docs and `examples/` are the reference: clone `modelcontextprotocol/ext-apps` and read `docs/patterns.md` under "Entering / exiting fullscreen", plus `src/app.ts`.

**2. Deploy and test it in both clients, yourself.** Push to the branch Render builds, wait for the deploy, then in each browser tab: reconnect the connector if the tool schemas changed, ask for the table, click the button, screenshot what happens. Report what ChatGPT web does and what Claude does. Android and iOS are out of reach; say so rather than guessing.

**3. Fill in the cross-client matrix (TODO item 2).** This is the most valuable output. For each of these, try it in both clients and record what actually happened, with a screenshot:

- the in-iframe fetch ("Fetch here…"), in ChatGPT with "Enforce CSP in developer mode" **off** and again with it **on**, and in Claude
- the blob download ("Download… (blocked)")
- `openLink` to an https URL ("Save file") and to a `data:` URL ("Save via data: URL")
- the native file picker ("Pick file…")
- the clipboard ("Copy CSV"), and whether the pasted text is right
- editing a cell in the grid, then asking the chat to change something else, and checking the grid edit survived

Put the result in LEARNINGS.md as a table with a row per capability and a column per client. Where the two differ, say which side made the decision: the sandbox attribute, the host's CSP, or the model.

**4. Fix what you find.** Bugs you can fix inside `marketing/mcp-app/` are yours to fix. Keep changes small, run `bun test` and `bunx tsc --noEmit` in that directory before pushing, and push each fix separately with a message that says what you observed and what you changed.

## Rules

- **Evidence or it did not happen.** Every claim in LEARNINGS.md needs a screenshot or a copied log line behind it. The view prints a timestamped log at the bottom; use it. Save screenshots under `temp/` (gitignored) and reference what they showed in the text.
- **Change nothing outside `marketing/mcp-app/`**, except LEARNINGS.md and TODO.md which live there anyway. The rest of the repository is a real product and is not part of this experiment.
- **Do not merge anything, do not open a pull request, do not touch Render's settings.** Push to the working branch only.
- **The existing LEARNINGS.md is the record of what was already tried.** Add to it, correct it where you prove it wrong, and say plainly when you do. Do not rewrite what is still true.
- Write the way `spec/writing-style.md` asks: plain words, active voice, no em dashes, no inflated vocabulary.

## What I want to see when I get back

1. TinyTable with a working fullscreen button, deployed, and screenshots of it in both clients.
2. A cross-client capability table in LEARNINGS.md, every row backed by something you observed.
3. TODO.md updated: items you finished struck off, anything new you found added, in priority order.
4. A short closing summary in the chat: what works now that did not before, what is still blocked and why, and the single most surprising thing you learned.

If you run out of time, stop at a pushed, working commit rather than a half-finished one, and say in the summary exactly where you stopped.
