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

The canonical token *values* live in the design base,
`design/claude-design/tokens.json`, so they survive a full `src/`
regeneration. `packages/ui-kit/tokens.json` is a generated copy (run
`bun run sync:tokens` after editing the master) that this package imports, so
`src/` stays a self-contained deployable unit. The guard test fails CI if the
copy drifts from the master. The main entry types and names the tokens,
exporting the brand system as plain objects — no React:

- `brand` — the brand-literal hex constants (Aubergine ink `#281C60`, Pale Sky
  accent `#96BED7`, Silver line, white, Mist ground, Linen)
- `typography` — UI / mono / brand font stacks and the size scale
- `space` — spacing, fixed dimensions, corner radii
- `lightTheme` / `darkTheme` — two `Theme` objects sharing one shape: surfaces,
  ink levels, lines, accent + semantic colors, highlights, shadows

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
- `Icon({ name, size? })` — inline 16×16 SVG, `currentColor` stroke, 19 names
  (`data-uk-icon`).
- `Button({ children, onClick?, disabled?, variant?, title? })` — variants
  `ghost` (default), `chrome`, `primary`, `danger` (`data-uk-button`).
- `SplitButton({ children, onClick, menu, disabled?, title?, caretTitle?, id? })` —
  primary half plus a caret that opens a menu of `{ label, onClick, disabled? }`
  items; closes on pick, click-outside, or Escape (`data-uk-split-main`,
  `data-uk-split-caret`, `data-uk-menu-item`).
- `Toasts({ toasts, onDismiss })` — fixed bottom-right stack of
  `{ id, kind: "info" | "error", message }` items, each with a dismiss button;
  renders nothing when the list is empty; ships its own slide-in animation
  (`data-uk-toast`, `data-uk-toast-dismiss`).

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/ui-kit/`) mounts
every component over plain React state inside a `ThemeProvider`: the four
button variants, the full icon grid, a split button, add-info/add-error toast
buttons, and the theme toggle. The wrapper carries `data-uk-mode` with the
active mode, every interaction appends to the `#out` event log, and `#out`
is non-empty on load — the demo smoke test's ready signal.
