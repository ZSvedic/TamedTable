---
description: Start the TamedTable dev environment — code tunnel + three MCP browser tabs (GitHub repo, live site, VSCode tunnel)
---

Set up the TamedTable dev environment in one go. Do these steps in order, then report status:

1. **Start the VSCode tunnel.** From the TamedTable repo root, check if `code tunnel` is already running (`pgrep -f "code tunnel"`). If not, start it in the background with the explicit name `tamedtable-mac`:

   ```
   nohup code tunnel --name tamedtable-mac --accept-server-license-terms > /tmp/code-tunnel.log 2>&1 &
   ```

   Don't block. After ~5 seconds, tail `/tmp/code-tunnel.log` to confirm it printed the `vscode.dev/tunnel/tamedtable-mac/...` URL. If the log shows `error connecting to relay` or `404`, the tunnel name is in a stale state — recovery: `code tunnel unregister` then re-run with a different `--name`. If first-time GitHub device-login is needed, surface the device code.

2. **Connect to my browser.** Call `list_connected_browsers`. If exactly one browser is connected, select it. If multiple are connected, ask me which one to use.

3. **Open or reconnect to the three target tabs (idempotent — safe to run from multiple Claude chats).**

   Target URLs:
   - https://github.com/ZSvedic/TamedTable
   - https://zsvedic.github.io/TamedTable/
   - https://vscode.dev/tunnel/tamedtable-mac/Users/zsvedic/LOCAL/CODE-2026/TamedTable

   Procedure:
   - Call `tabs_context_mcp` with `createIfEmpty: true` to attach to (or create) the MCP tab group.
   - For each target URL, check whether the group already has a tab matching it. Match rules:
     - GitHub repo: exact match on `https://github.com/ZSvedic/TamedTable` (ignore trailing slash and any deep-link fragment).
     - Live site: any URL whose origin is `https://zsvedic.github.io` and pathname starts with `/TamedTable`.
     - Tunnel: any URL whose origin is `https://vscode.dev` and pathname starts with `/tunnel/tamedtable-mac`.
   - For each target that has no matching tab: if a blank `chrome://newtab/` tab exists, navigate it; otherwise call `tabs_create_mcp` and navigate the new tab.
   - Do NOT close or recreate tabs that already match — this lets multiple Claude chats reference the same tabs simultaneously.
   - Tab 3 (tunnel) requires step 1 to have succeeded. If step 1 surfaced an auth or relay error, skip the tunnel tab and note it.

4. **Report back** in one short summary: tunnel status (running / auth pending), which browser was used, and whether each tab was *found existing* or *newly opened*.

## After setup: handling each new task in this chat

Once steps 1–4 have run, treat any follow-up user message that describes a coding/editing task on TamedTable as a **new task**. For each new task, do NOT start working on it immediately. Instead:

1. **Draft a self-contained Cloud Claude prompt.** Write it so a fresh remote agent could execute it with zero context from this chat: repo (`https://github.com/ZSvedic/TamedTable`), branch (default `main`), files to touch, success criteria, any constraints (commit/push? open a PR? just edit locally?).

2. **Show the prompt verbatim in a single markdown code block** so the user can read or copy it.

3. **Copy the prompt to the macOS clipboard** with `pbcopy`, e.g. `printf '%s' "$PROMPT" | pbcopy`. If the clipboard write fails, note it but continue.

4. **Offer the user these four options and wait for a choice — do NOT auto-pick:**

   - **A. Execute in a separate Cloud Claude.** Create a one-off routine via `RemoteTrigger` (`run_once_at` ~2 min in the future, model `claude-sonnet-4-6`, repo `https://github.com/ZSvedic/TamedTable`, environment `env_014d4GZ7qHz3iQNPLPWjX5X5`). Surface the routine URL `https://claude.ai/code/routines/{ROUTINE_ID}` and the fire time in Europe/Zagreb.
   - **B. Run in this chat (local).** Proceed with the task here, in this same conversation, using local tools.
   - **C. Append the task to a local file.** Ask the user which file (suggest `TODO.md` or `tasks.md` if either exists, otherwise ask for a path), then append the prompt as a new entry.
   - **D. Other.** Ask the user what they want.

5. After the user picks, execute that option and report back.
