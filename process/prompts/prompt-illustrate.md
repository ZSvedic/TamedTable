Create on-brand SVG marketing illustrations in `marketing/illustrations/`, one small tile per item in the list below.

List of tiles to create (each: the feature and the exact phrase a user would type):

<!-- ADD YOUR LIST HERE -->

Before drawing, read these and match what's already there:

- `marketing/illustrations/` — the existing tiles are the template. Reuse their structure: a 360×230 frame, a prompt chip at top showing the typed phrase, and one focused mini-table that shows the change. Study a few before starting.
- `marketing/brand/brand.md` — the palette and type system. Ink `#281C60`, accent Pale Sky `#96BED7`, grid Silver `#DCDCDC`, ground Linen `#F6F2EB`. Body/UI in Inter, data/labels in JetBrains Mono.
- `marketing/features.md` — the source of feature copy; lead each tile with the real phrase, not a label.

Rules learned the hard way — follow them or the tiles look off:

- **Fonts need full fallback stacks.** Write `font-family="Inter, ui-sans-serif, system-ui, sans-serif"` (and the JetBrains Mono equivalent). A bare `font-family="Inter"` falls back to serif because the font isn't loaded.
- **Headers round at the top only.** The column-header band must have square bottom corners so the line between header and first row is straight. Use a round-top path, not a `rx` rect.
- **Nothing pokes past the rounded card.** Any highlight box or filled cell at a table edge must round its outer corners to match the card, or be clipped.
- **Small and quiet.** Aim for ~2 KB per tile, one accent highlight, no visual noise.

Number new files continuing the existing sequence, and add each to `_gallery.html`.

Verify before delivering: rasterize every new SVG to PNG headlessly (install `rsvg-convert`, or render with Playwright) and look at the result — corners clean, no serif fallback, the accent lands on the right thing.

Deliver: open a PR into `main` and merge it once it renders correctly. These are assets only (no `src/`, no tests).
