# Toolbar

The `@tamedtable/toolbar` package owns the app's top bar and its "Open from
URL" dialog. It holds no app state and no engine wiring: the host passes the
load state, the file readout, and the undo/redo flags as props, and hears
about every button press through callbacks (`onOpenLocal`, `onOpenUrl`,
`onSaveData`, `onSaveFlow`, `onUndo`, `onRedo`, `onToggleTheme`,
`onOpenSettings`, `onOpenTutorial`). The sample-file list and their URLs are
app data, passed in — the package never reaches for `import.meta.env` or
`window.location`.

The `Brand` mark/wordmark/lockup lives inside this package: the toolbar is its
only consumer, so there is no reason to host it elsewhere or in `ui-kit`.

## Worked example

The web app's wrapper binds `WebController`:

```
<Toolbar
  openButtonId="tutorial-open-btn"
  loaded={controller.isLoaded()} busy={controller.streaming}
  fileName={fileName} rowCount={rows.length} colCount={cols.length}
  canUndo={controller.canUndo()} canRedo={controller.canRedo()}
  onOpenUrl={() => controller.openUrlDialog()}
  onOpenLocal={() => void controller.openCsv()}
  onSaveData={() => void controller.saveData()}
  onSaveFlow={() => void controller.saveFlow()}
  onUndo={() => void controller.undo()} onRedo={() => void controller.redo()}
  onToggleTheme={toggle}
  onOpenSettings={() => controller.openSettings()}
  onOpenTutorial={() => controller.openTutorial()}
/>
<OpenUrlDialog
  open={controller.urlDialogOpen} samples={samples}
  onSubmit={(url) => controller.loadFromUrl(url)}
  onClose={() => controller.closeUrlDialog()}
/>
```

## Sample-file labels (main entry, React-free)

`ToolbarSample` is `{ name, url }`. `sampleKind(name)` returns `"CSV"` or
`"JSONL"` from the filename extension (anything not ending in `.csv` is
treated as JSONL) — the badge the dialog shows beside each sample row.

## Toolbar component (`./components` entry, react peer dependency)

- Left: the brand lockup (reverse mark on a dark theme), then a monospace
  readout of `fileName · {rowCount} rows × {colCount} cols` once `loaded`.
- Right: an "Open URL…" split button (its `openButtonId` is the Driver.js
  tutorial target) whose menu carries "Open local…"; "Save data" and "Save
  flow" (disabled until `loaded`); a divider; "Undo" / "Redo" (gated on
  `canUndo` / `canRedo`); a divider; the light/dark toggle (sun on dark,
  moon on light); "Settings"; and "Tutorial". Every action except the theme
  toggle, settings, and tutorial is also disabled while `busy`.

## OpenUrlDialog component

`OpenUrlDialog({ open, samples, onSubmit, onClose })` — a modal over a URL
field and a sample-file list. Picking a sample fills the URL field (so the
user sees and can edit the URL before fetching); one "Load" action submits,
typed or picked. Submit calls `onSubmit(url)`; on resolve the dialog closes,
on reject it shows the error and stays open. Escape or the backdrop closes
it unless a load is in flight. An `http://` URL draws an unencrypted-note.

Stable attributes: `data-tb-toolbar`, `data-tb-info`, `data-tb-dialog`,
`data-tb-url-input`, `data-tb-sample`.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/toolbar/`) mounts
the toolbar and dialog over plain React state: every button appends to the
`#out` event log (non-empty on load — the smoke test's ready signal), the
theme toggle flips the wrapper, and the dialog's submit logs the loaded URL
and closes. Sample rows are seeded so the pick-and-edit flow is exercised.
