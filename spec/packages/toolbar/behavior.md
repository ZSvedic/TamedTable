# Toolbar

The `@tamedtable/toolbar` package owns the app's top bar, its URL-open dialog,
and its sample picker. It holds no app state and no engine wiring: the host
passes the load state, the file readout, and the undo/redo flags as props, and
hears about every button press through callbacks (`onOpenSample`,
`onOpenLocal`, `onOpenUrl`, `onSaveData`, `onSaveFlow`, `onUndo`, `onRedo`,
`onToggleTheme`, `onOpenSettings`, `onOpenTutorial`). The "Save as" menu entries are app data
too — the host passes `saveDataMenu` and `saveFlowMenu`, each a list of
`{ label, onClick }` items, because the package knows nothing about file
formats or flow/Python exports. The sample-file list and their URLs are app
data, passed in — the package never reaches for `import.meta.env` or
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
  onOpenSample={() => controller.openSampleDialog()}
  onOpenLocal={() => void controller.openCsv()}
  onOpenUrl={() => controller.openUrlDialog()}
  onSaveData={() => void controller.saveData()}
  onSaveFlow={() => void controller.saveFlow()}
  onUndo={() => void controller.undo()} onRedo={() => void controller.redo()}
  onToggleTheme={toggle}
  onOpenSettings={() => controller.openSettings()}
  onOpenTutorial={() => controller.openTutorial()}
/>
<OpenSampleDialog
  open={controller.sampleDialogOpen} samples={samples}
  onPick={(url) => controller.loadFromUrl(url)}
  onClose={() => controller.closeSampleDialog()}
/>
<OpenUrlDialog
  open={controller.urlDialogOpen}
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
- Right: an "Open sample…" split button (its `openButtonId` is the Driver.js
  tutorial target) — the primary half raises the sample picker, and its caret
  menu carries "Open local…" and "Open URL…"; a "Save data" split
  button — the primary half saves in the format the table was loaded as, and
  its caret menu (`saveDataMenu`) lists "Save as <format>…" entries that save a
  copy in a different format (and let the user rename); a "Save flow" split
  button on the same pattern — the primary half saves the `.flow`, and its
  caret menu (`saveFlowMenu`) carries "Save as Flow…" and "Save as Python…";
  both saves disabled until `loaded`; a divider; "Undo" / "Redo" (gated on `canUndo` /
  `canRedo`); a divider; the light/dark toggle (sun on dark, moon on light);
  "Settings"; and "Tours". Every action except the theme toggle, settings, and
  tours is also disabled while `busy`.

## OpenUrlDialog component

`OpenUrlDialog({ open, onSubmit, onClose })` — a modal over a single URL
field. The "Load" action submits the typed address: `onSubmit(url)` resolves
to close the dialog, or rejects to show the error and stay open. Escape or the
backdrop closes it unless a load is in flight. An `http://` URL draws an
unencrypted-note. It carries no sample list — samples live in their own picker.

## OpenSampleDialog component

`OpenSampleDialog({ open, samples, onPick, onClose })` — a modal listing the
bundled sample files (each row shows its `sampleKind` badge and name). Clicking
a row calls `onPick(sample.url)` and closes the dialog — picking a sample loads
it straight away, no extra confirm step. Escape or the backdrop closes it.

Stable attributes: `data-tb-toolbar`, `data-tb-info`, `data-tb-dialog`,
`data-tb-url-input`, `data-tb-sample-dialog`, `data-tb-sample`.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/toolbar/`) mounts
the toolbar and dialog over plain React state: every button appends to the
`#out` event log (non-empty on load — the smoke test's ready signal), the
theme toggle flips the wrapper, and the URL dialog's submit logs the loaded URL
and closes. Sample rows are seeded in the sample picker so the pick-to-load
flow is exercised.
