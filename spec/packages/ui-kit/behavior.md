# UI kit

The `@tamedtable/ui-kit` package owns the TamedTable design system: the brand
tokens (colors, typography, spacing) and the primitive React components every
surface composes — buttons, icons, the split/dropdown button, the toast stack,
and the light/dark theme context. It owns no app state and no storage: hosts
pass data in and get callbacks out, and theme persistence is injected through
`ThemeProvider` props.

## Worked example

The web app wraps its shell in the provider, persisting the mode itself:

```
<ThemeProvider initialMode={stored} onModeChange={store}>
  <Toolbar … />          // composes Button, SplitButton, Icon
  <Toasts toasts={controller.toasts} onDismiss={(id) => controller.dismissToast(id)} />
</ThemeProvider>
```

Inside any child, `useTheme()` returns the active `Theme` object and
`useThemeControls()` returns `{ mode, toggle }` for the sun/moon button.

## Tokens (main entry, React-free)

The canonical token *values* live at
`marketing/tokens.json`, so they survive a full `src/`
regeneration. `bun run sync:tokens` regenerates two copies from it:
`packages/ui-kit/tokens.json` (which this package imports, so `src/` stays a
self-contained deployable unit) and `marketing/claude-design-app/tokens.jsx` (the
design canvas globals). The guard test fails CI if either copy drifts. The main entry types and names the tokens,
exporting the brand system as plain objects — no React:

- `brand` — the brand-literal hex constants (Aubergine ink `#281C60`, Pale Sky
  accent `#96BED7`, Silver line, white, Mist ground, Linen)
- `typography` — UI / mono / brand font stacks and the size scale
- `space` — spacing, fixed dimensions, corner radii
- `lightTheme` / `darkTheme` — two `Theme` objects sharing one shape: surfaces,
  ink levels, lines, accent + semantic colors, highlights, shadows

Each **on-color** names the label to place on a matching filled surface —
`inkOnInk` on an `ink` fill (the primary button), `inkOnAcc` on an `accent`
fill. In **both** themes an on-color must contrast with its surface: their
`oklch` lightness differs by a clear margin, so a primary button is never, say,
near-white text on a near-white fill. A guard test enforces this — it is how a
mistuned token (an on-color left equal to its surface in one theme) is caught.

Components read the active theme through `useTheme()` and never hard-code a
color, so the visual design lives in this one package. Other library packages
keep their namespaced CSS custom properties; the host sets those variables
from these tokens.

## Components (`./components` entry, react peer dependency)

All components are pure — props in, callbacks out — and carry stable
`data-uk-*` attributes for tests:

- `ThemeProvider({ initialMode?, onModeChange?, children })` — owns the
  mode state (default light), paints the page background, and notifies the
  host on toggle; the host persists the mode. `useTheme()` / `useThemeControls()`
  throw outside the provider.
- `Icon({ name, size? })` — inline 16×16 SVG, `currentColor` stroke
  (`data-uk-icon`). The glyph artwork is canonical in `marketing/icons/` —
  one SVG per name, so the drawings survive a full `src/` regeneration; a
  glyph whose source SVG says `fill="currentColor"` renders filled (stop,
  play), every other one stroked. `bun run sync:icons` regenerates the
  package's importable catalogue (`icons.ts`) from that directory; the guard
  test fails CI if the catalogue drifts.
- `Button({ children, onClick?, disabled?, variant?, title? })` — variants
  `ghost` (default), `chrome`, `primary`, `danger` (`data-uk-button`).
- `SplitButton({ children, onClick, menu, disabled?, title?, caretTitle?, id? })` —
  primary half plus a caret that opens a menu of `{ label, onClick, disabled? }`
  items; closes on pick, click-outside, or Escape (`data-uk-split-main`,
  `data-uk-split-caret`, `data-uk-menu-item`).
- `Toasts({ toasts, onDismiss, onAction? })` — fixed bottom-right stack of
  `{ id, kind: "info" | "error", message, action? }` items, each with a dismiss
  button; a toast carrying an `action` label also shows an inline action button
  that calls `onAction(id)` (`data-uk-toast-action`). Renders nothing when the
  list is empty; ships its own slide-in animation (`data-uk-toast`,
  `data-uk-toast-dismiss`). Each toast also **auto-fades** on its own — it
  schedules `onDismiss(id)` after `toastDurationMs(message)`, fading out
  (`data-uk-toast-leaving`) just before it goes. Hovering a toast pauses the
  timer so it stays while the cursor is over it (and while a slow reader needs
  it), and restarts the full countdown when the cursor leaves. The dismiss
  button still removes a toast at once. So a routine "Saved …" note clears
  itself, yet an error a user wants to act on (its `action` button, e.g. "Copy
  report") survives as long as they hover it.

The timing is a React-free helper in the main entry, so it is unit-testable and
shared:

- `TYPING_MS_PER_CHAR` — the cadence (ms per character) the app types tutorial
  queries at, reused as a reading-speed proxy.
- `toastDurationMs(message)` — the time to read `message` (one character per
  typing tick) doubled, then clamped between `TOAST_FLOOR_MS` and
  `TOAST_CEILING_MS` so a terse note still lingers long enough to notice and a
  long error does not camp on the screen.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/ui-kit/`) mounts
every component over plain React state inside a `ThemeProvider`: the four
button variants, the full icon grid, a split button, add-info/add-error toast
buttons, and the theme toggle. The wrapper carries `data-uk-mode` with the
active mode, every interaction appends to the `#out` event log, and `#out`
is non-empty on load — the demo smoke test's ready signal.
