# Design base — web surface

The TamedTable **website** design base — the canonical home for the future
marketing/docs site's visual design. Empty for now beyond this stub; iterate
the web look here, then flow changes into the site code.

## Shared, not duplicated

This surface reuses the same brand foundation as the app — do not fork it:

- **Tokens** — read `design/tokens.json` (the master). Don't copy values into
  this folder. Web-specific tokens (e.g. a hero scale or page max-width) go
  **into the master**, namespaced if needed, so both surfaces share one
  palette and the drift guard keeps everyone honest.
- **Brand** — use the marks, favicons, and lockups in `design/brand/`
  (`brand.md` documents the system). Don't re-export or re-trace them here.

See [../claude-design-app/README.md](../claude-design-app/README.md) for how the
app surface stays in sync, and
[../../spec/packages/ui-kit/behavior.md](../../spec/packages/ui-kit/behavior.md)
for the token contract.
