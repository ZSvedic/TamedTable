# Bug inventory — browser hunt

Reproducible failures found by driving the **production build** of the web app
in a real browser (Playwright), plus any expressible through the controller.
Every entry here is a **red test left failing on purpose** — the fix is the
human's call. Nothing in this directory is meant to pass.

- Browser findings live in `src/packages/web/e2e/red/<area>.e2e.ts`, run by the
  Playwright `red` project: `bun run test:e2e:red` (from `src/packages/web/`).
  CI does **not** gate on it.
- Controller-expressible findings live here as `red-<area>.feature`, every
  scenario tagged `@red` + its surface tag, run by `bun run test:red` (from
  `src/`). CI does **not** gate on it.

Newest finding last.

| ID | Sev | Symptom | Proof (red test) | Suspected cause | Repro on dev too? |
|---|---|---|---|---|---|
| TT-R01 | major | A sample opened from Open ▸ "Open sample…" is missing from Open ▸ Recent until the page is reloaded (or another file is opened). URL/local/drop paths add it immediately. | `e2e/red/open.e2e.ts` | `controller-files.ts:326` `loadFromUrl` records the recent after the last `notify()`, and the sample picker fires no `notify()` after the async record | yes (logic, not build-only) |
| TT-R02 | minor | A manual cell edit shows the new value but no changed-cell tint and no "was: …" tooltip until an unrelated re-render (e.g. clicking another cell) fires. | `e2e/red/grid.e2e.ts` | `controller-patch.ts:136-137` `editCell` records the changed-cell mark after `applySpecChange`'s `notify()`, with no trailing `notify()` | yes (logic, not build-only) |

## TT-R01 — sample-picker load missing from Recent until reload (major)

Opening a bundled sample through the **Open ▸ "Open sample…"** picker succeeds
and shows the table, but the file does not appear in the **Open ▸ Recent**
submenu. After the *first* sample load the Recent submenu is empty; after
further loads it always lags exactly one behind (it lists every opened sample
except the one currently on screen). A page reload fixes it — the persisted
`tamedtable-recents` store is correct, so on reload the initial render reads the
full list. The other three load routes are fine: `openCsv` (local), `openDropped`
(drag-and-drop), and `openFlow` all call `notify()` in a `finally` *after*
`recentsStore.record()`, so their entry renders at once.

The sample path differs because `loadFromUrl` (used by both the sample picker and
the URL dialog) records the entry *after* `loadFromPicked()` has already fired
its final `notify()` (inside `commitParsed`, via `pushMessage`), and then does
not `notify()` again. The URL **dialog** happens to survive this because it
`await`s `loadFromUrl` and then closes the dialog (a `notify()`) after the record
lands — but the **sample** picker calls `onPick(url)` fire-and-forget and closes
synchronously, so its only post-click `notify()` runs *before* the async record.
The result: a successful load the spec says Recent must list ("the last 5
successful loads, newest first") is silently dropped from the menu until the next
render.

## TT-R02 — manual cell edit doesn't tint until a later render (minor)

Double-clicking a cell, typing a value, and pressing Enter commits the edit (the
cell shows the new value and it is undoable), but the changed-cell **tint** and
the **"was: <previous>" tooltip** do not appear. The cell keeps the neutral
"Click to select · double-click to edit" title until any other action forces a
re-render — click another cell and the tint and tooltip snap in. So the mark is
computed correctly; only the render that should reveal it is missed.

`editCell` records the mark (`engine.noteChangedCell(...)` and `marks.set(...)`)
*after* it `await`s `applySpecChange`, which already fired its `notify()`. With no
`notify()` after the mark is set, React renders the committed edit without it.
The table-view spec says "a changed cell tints, and hovering it shows a small
[was: …] tooltip", and `controller-patch.ts` states the intent outright — "The
edited cell tints like any other change" — so the reveal firing only on the next
unrelated render is a defect, even though the data is never wrong.
