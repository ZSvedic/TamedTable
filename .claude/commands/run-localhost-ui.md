---
description: Fast local UI loop — isolated worktree + live preview; iterate in seconds, then run the full SDD/TDD loop and merge on "finish"
---

Fast UI-iteration loop for TamedTable. Edit source → see it in the preview pane in
~1 second (Vite HMR, no PR/CI/deploy). Each run lives in its own git worktree, so
several `run-localhost-ui` chats run **in parallel** without touching each other's
files. Only when I say **finish** do we run the slow, correct pipeline once.

Optional argument `$ARGUMENTS` = which dev server to run: `web` (full app, default)
or `gherkin-tour-demo` (isolated tour UI). Anything else → ask.

**Tested gotcha — read first.** `preview_start` resolves `.claude/launch.json` from
the **original session root (the main checkout), not the worktree** — `EnterWorktree`
does *not* redirect it. So the launch config that points at the worktree must be added
to the **main** repo's `.claude/launch.json`, with an **absolute** path to the
worktree's `src/packages/web`. Note the main repo's absolute path before you enter the
worktree (the launch file lives at `<main>/.claude/launch.json`).

## Phase 1 — Set up the isolated local loop

1. **Enter a worktree.** Call `EnterWorktree` with a short `name` (e.g. `ui-<topic>`).
   This branches from `origin/main` and switches the session into
   `<main>/.claude/worktrees/<name>/`. From here on, your file edits and git all
   target this worktree's branch.

2. **Pick a free port** so parallel runs never collide (start at 5181 — 5180 is the
   `illustrations` config's default). Take the first free one:
   ```sh
   for p in $(seq 5181 5279); do
     lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1 || { echo $p; break; }
   done
   ```

3. **Add a uniquely-named config to the MAIN launch.json** (absolute path, so the
   preview pane — pinned to the main root — can serve the worktree). Append to
   `<main>/.claude/launch.json` a config like:
   ```json
   {
     "name": "ui-<topic>",
     "runtimeExecutable": "sh",
     "runtimeArgs": ["-c", "cd <main>/.claude/worktrees/<name>/src/packages/web && exec bun run dev -- --port <PORT>"],
     "port": <PORT>
   }
   ```
   For `gherkin-tour-demo`, point at `…/<name>/src/packages/gherkin-tour` and run
   `exec bun demo.html --port <PORT>`. This edit is **temporary and never committed** —
   Phase 3 removes it. Unique name + unique port keep parallel runs from clashing.

4. **Install deps in the worktree.** A fresh worktree has no `node_modules`:
   ```sh
   cd src && bun install
   ```
   (Fast — bun reuses its global cache. Mention it if it's slow.)

5. **Start the server in the preview pane.** `preview_start` with the config name
   from step 3. Confirm it came up on `<PORT>` (the result echoes the port).

6. **Load and confirm.** Reload the preview to the app (for `web`,
   `preview_eval` → `location.href='http://localhost:<PORT>/TamedTable/app/'`; for the
   demo, the launch root). Take `preview_screenshot`.

7. **Report**: worktree path + branch, server, port, and a screenshot.

## Phase 2 — Iterate (the fast loop)

For each issue I report:

- Edit the **real source** (e.g. `src/packages/gherkin-tour/ui.ts`, `index.ts`).
  HMR refreshes the preview automatically.
- Re-check with `preview_screenshot` / `preview_snapshot` and show me the result.
- To nail an exact value fast (a margin, a colour, a label), you may inject CSS/JS
  live with `preview_eval` to find the number — but it's throwaway, so **bake the
  final value into source** before moving on.
- Keep edits scoped to the UI behaviour I'm describing. Don't start the spec/test
  pipeline yet.

## Phase 3 — On "finish": the full SDD/TDD pipeline (once)

When I say **finish** (or "ship it"/"land it"), follow the repo
[workflow rule](../../CLAUDE.md#workflow-rule--changing-a-component) in order:

1. `spec/behavior.md` + `spec/code-contract.md` — update to match the new behaviour.
2. `spec/test-cases/*.feature` — add/update the Gherkin scenario.
3. `src/tests/*.steps.ts` (or the package's step defs) — write/update step defs;
   run the suite and confirm the new behaviour is **red**.
4. `src/packages/<name>/` — the source already changed during Phase 2; adjust until
   the suite goes **green**.
5. `cd src && bun run test` — confirm green before committing.
6. Commit on the worktree branch, push, open a PR (`gh pr create`) with a body
   describing the UI change.
7. **Decide how it merges (merge policy):**
   - **Routine change** → queue auto-merge: `gh pr merge --squash --auto
     --delete-branch`. It lands automatically once CI is green; you don't wait.
   - **Notable UI change** (this command is for UI work, so this is common) → **do
     not** auto-merge. Add the `pr-preview` label (`gh pr edit --add-label
     pr-preview`), which triggers [pr-preview.yml](../../.github/workflows/pr-preview.yml)
     to build a live preview at `https://zsvedic.github.io/TamedTable/pr-preview/pr-<N>/`.
     Post that URL and **wait** for the user to eyeball it and say "merge"; then
     `gh pr merge --squash --delete-branch`.
   - **User said "hold merges"** (e.g. they're testing on `main`) → do neither. Leave
     the PR open, report its URL, and don't queue or merge anything until they clear it.

   When unsure whether a change is "notable", default to the `pr-preview` path — a
   visual sign-off is cheap; an unwanted merge into `main` is not.
8. Stop the preview server (`preview_stop`) and **remove the temp config** you added
   to `<main>/.claude/launch.json` in Phase 1 — leave that file as it was.
9. `ExitWorktree` with `action: "remove"` once the work is merged (or `keep` if the PR
   is still awaiting the user's preview sign-off).

If CI is red, fix on the branch and push again — don't merge red.

## Notes

- **Keep the Mac awake for long loops.** The dev server and this session run locally,
  so if macOS sleeps (idle or lid-close), the whole loop freezes until you wake it. For
  a long iteration session, run under `caffeinate` so the machine stays awake while it
  runs, then sleeps normally afterwards:
  ```sh
  caffeinate -i claude     # -i blocks idle sleep for the life of the process
  ```
  If you'll close the lid, stay on AC power and use `caffeinate -dimsu` (it can't
  override lid-close sleep on battery).
- The **preview pane is local-only** — it can't show the deployed
  `zsvedic.github.io` URL, only the worktree's dev server. That's the point: you see
  *your* edits, not what's shipped.
- Parallel safety comes from the worktree: separate files, separate branch, separate
  port, and a uniquely-named launch config. Two `run-localhost-ui` chats won't race on
  source. The one shared file they both touch is the main `.claude/launch.json` (each
  appends its own named config) — keep those edits uncommitted and remove yours at
  finish so the file stays clean.
