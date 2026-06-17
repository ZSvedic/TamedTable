---
description: Start the TamedTable dev environment — two MCP browser tabs (GitHub repo, live site)
---

Set up the TamedTable dev environment, then report status:

1. **Connect to my browser.** Call `list_connected_browsers`. If one is connected, select it; if multiple, ask which.

2. **Open two tabs in a fresh MCP tab group.** Call `tabs_context_mcp` with `createIfEmpty: true`, use the empty tab it returns for the first URL, then `tabs_create_mcp` for the second:
   - https://github.com/ZSvedic/TamedTable
   - https://zsvedic.github.io/TamedTable/app/

   Don't try to reuse tabs from prior chats — Claude in Chrome only sees tabs inside the current MCP group, so reattaching isn't reliable.

3. **Report**: browser used, tabs opened.

## After setup: routing each new task

Treat any follow-up message describing a coding/editing task on TamedTable as a new task. For each:

1. Draft a self-contained Cloud Claude prompt: repo `https://github.com/ZSvedic/TamedTable`, branch default `main`, files to touch, success criteria, constraints (commit/PR/local-only).
2. Show the prompt verbatim in a markdown code block.
3. Copy to clipboard with `printf '%s' "$PROMPT" | pbcopy`. Note if it fails but continue.
4. Offer four options and wait — don't auto-pick:
   - **1. Change the prompt.** Ask how.
   - **2. I will run a parallel Cloud Claude.** Continue this chat and pull later if you notice main was updated.
   - **3. Run in this chat.** Proceed locally.
   - **4. Append to a local file.** Ask which (suggest `TODO.md` or `tasks.md` if either exists, else ask for a path), then append.
5. Execute the chosen option.
