---
description: Start the TamedTable dev environment — code tunnel + three MCP browser tabs (GitHub repo, live site, VSCode tunnel)
---

Set up the TamedTable dev environment, then report status:

1. **Start the VSCode tunnel.** If `pgrep -f "code tunnel"` shows nothing, run:

   ```
   nohup code tunnel --name tamedtable-mac --accept-server-license-terms > /tmp/code-tunnel.log 2>&1 &
   ```

   After ~5s, tail `/tmp/code-tunnel.log` and confirm it printed a `vscode.dev/tunnel/tamedtable-mac/...` URL. If you see `error connecting to relay` or `404`, recover with `code tunnel unregister` then re-run with a different `--name`. Surface any GitHub device-login code.

2. **Connect to my browser.** Call `list_connected_browsers`. If one is connected, select it; if multiple, ask which.

3. **Open three tabs in a fresh MCP tab group.** Call `tabs_context_mcp` with `createIfEmpty: true`, use the empty tab it returns for the first URL, then `tabs_create_mcp` for the other two:
   - https://github.com/ZSvedic/TamedTable
   - https://zsvedic.github.io/TamedTable/
   - https://vscode.dev/tunnel/tamedtable-mac/Users/zsvedic/LOCAL/CODE-2026/TamedTable

   Don't try to reuse tabs from prior chats — Claude in Chrome only sees tabs inside the current MCP group, so reattaching isn't reliable. If step 1 failed, skip the third tab and note it.

4. **Report**: tunnel status, browser used, tabs opened.

## After setup: routing each new task

Treat any follow-up message describing a coding/editing task on TamedTable as a new task. For each:

1. Draft a self-contained Cloud Claude prompt: repo `https://github.com/ZSvedic/TamedTable`, branch default `main`, files to touch, success criteria, constraints (commit/PR/local-only).
2. Show the prompt verbatim in a markdown code block.
3. Copy to clipboard with `printf '%s' "$PROMPT" | pbcopy`. Note if it fails but continue.
4. Offer four options and wait — don't auto-pick:
   - **A. Separate Cloud Claude.** Create a `RemoteTrigger` routine (`run_once_at` ~2 min out, model `claude-sonnet-4-6`, repo `https://github.com/ZSvedic/TamedTable`, environment `env_014d4GZ7qHz3iQNPLPWjX5X5`). Surface `https://claude.ai/code/routines/{ROUTINE_ID}` and fire time in Europe/Zagreb.
   - **B. Run in this chat.** Proceed locally.
   - **C. Append to a local file.** Ask which (suggest `TODO.md` or `tasks.md` if either exists, else ask for a path), then append.
   - **D. Other.** Ask what.
5. Execute the chosen option and report.
