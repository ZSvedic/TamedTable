# Design base

The TamedTable design base — the canonical home for the visual design,
deliberately kept **outside `src/`** so it survives a full `src/`
regeneration (e.g. rebuilding the app with a different model). Iterate on the
design here, then flow changes into the code.

## Source of truth

| File | Role |
|---|---|
| [tokens.json](tokens.json) | **Canonical** brand/theme tokens — colors, typography, spacing. The master copy. |
| `src/packages/ui-kit/tokens.json` | Generated copy the app imports. Never edit directly. |

After editing `tokens.json`, regenerate the app's copy:

```
cd src && bun run sync:tokens
```

The design-token guard (`src/tests/no-hardcoded-colors.test.ts`) fails CI if
the copy drifts from this master, so the two can never silently diverge.

## How design and code stay in sync

- **Tokens** — share the bytes. This `tokens.json` is the one source; the app
  copies it. No second hand-maintained palette.
- **Primitives** (`src/packages/ui-kit/`) — code is canonical. The published
  [ui-kit demo](https://zsvedic.github.io/TamedTable/demos/ui-kit/demo.html) is
  the shared design-review surface.
- **Iteration** — prototype here (the `.jsx`/`.html` files are Claude-design
  scratch); land a change by editing `tokens.json` (then `sync:tokens`) or
  re-implementing a component in `ui-kit`, never by copying scratch JSX back.

See [spec/packages/ui-kit/behavior.md](../../spec/packages/ui-kit/behavior.md)
for the token contract.
