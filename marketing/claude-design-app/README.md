# Design base — app surface

The TamedTable **app** design base — the canonical home for the running app's
visual design, deliberately kept **outside `src/`** so it survives a full
`src/` regeneration (e.g. rebuilding the app with a different model). Iterate on
the design here, then flow changes into the code. Shared assets live one level
up: `marketing/tokens.json` (the token master) and `marketing/brand/` (marks,
favicons, lockups, `brand.md`).

## Source of truth

| File | Role |
|---|---|
| [../tokens.json](../tokens.json) | **Canonical** brand/theme tokens — colors, typography, spacing. The master. |
| `src/packages/ui-kit/tokens.json` | Generated copy the app imports. Never edit directly. |
| [tokens.jsx](tokens.jsx) | Generated `TT_*` globals for the in-browser canvas. Never edit directly. |

After editing `../tokens.json`, regenerate both derived copies:

```
cd src && bun run sync:tokens
```

The design-token guard (`src/tests/no-hardcoded-colors.test.ts`) fails CI if
either generated copy drifts from this master, so they can never silently
diverge — edit `../tokens.json` and re-sync, never a generated file.

## How design and code stay in sync

- **Tokens** — share the bytes. `../tokens.json` is the one source; the app
  copies it. No second hand-maintained palette.
- **Primitives** (`src/packages/ui-kit/`) — code is canonical. The published
  [ui-kit demo](https://zsvedic.github.io/TamedTable/demos/ui-kit/demo.html) is
  the shared design-review surface.
- **Iteration** — prototype here (the component/app `.jsx` + `.html` files are
  Claude-design scratch; `tokens.jsx` is generated, not scratch); land a change
  by editing `../tokens.json` (then `sync:tokens`) or re-implementing a component
  in `ui-kit`, never by copying scratch JSX back.

See [spec/packages/ui-kit/behavior.md](../../spec/packages/ui-kit/behavior.md)
for the token contract.
