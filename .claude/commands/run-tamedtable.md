---
description: Start the TamedTable dev environment — code tunnel + two MCP browser tabs (GitHub repo, live site)
---

Set up the TamedTable dev environment in one go. Do these steps in order, then report status:

1. **Start the VSCode tunnel.** From the TamedTable repo root, check if `code tunnel` is already running (`pgrep -f "code tunnel"`). If not, start it in the background with the explicit name `tamedtable-mac`:

   ```
   nohup code tunnel --name tamedtable-mac --accept-server-license-terms > /tmp/code-tunnel.log 2>&1 &
   ```

   Don't block. After ~5 seconds, tail `/tmp/code-tunnel.log` to confirm it printed the `vscode.dev/tunnel/tamedtable-mac/...` URL. If the log shows `error connecting to relay` or `404`, the tunnel name is in a stale state — recovery: `code tunnel unregister` then re-run with a different `--name`. If first-time GitHub device-login is needed, surface the device code.

2. **Connect to my browser.** Call `list_connected_browsers`. If exactly one local browser is connected, select it. If multiple are connected, ask me which one to use.

3. **Create the MCP tab group with two tabs.**
   - Tab 1 → https://github.com/ZSvedic/TamedTable
   - Tab 2 → https://zsvedic.github.io/TamedTable/

   Use `tabs_context_mcp` (`createIfEmpty: true`) for the first tab, then `tabs_create_mcp` for the second. Navigate each to its URL.

4. **Report back** in one short summary: tunnel status (running / auth pending), which browser was used, and both tab titles confirmed loaded.
