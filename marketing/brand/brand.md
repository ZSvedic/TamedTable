# TamedTable — Brand System

## The mark

The TamedTable icon is a **9 × 5 pixel mark with overhanging eaves**. Two T-shaped pillars hold up a top bar that extends one cell past each pillar; between them sit two floating cross-bars; a single accent cell anchors dead-center on the top bar.

### Grid

```
col:  0  1  2  3  4  5  6  7  8
row0: █  █  █  █  ◆  █  █  █  █     ← top bar (◆ = accent at col 4)
row1: .  █  .  .  .  .  .  █  .
row2: .  █  .  █  █  █  .  █  .     ← upper cross-bar
row3: .  █  .  .  .  .  .  █  .
row4: .  █  .  █  █  █  .  █  .     ← lower cross-bar
```

| Symbol | Meaning |
|--------|---------|
| `█` | Ink color (T-pillars, cross-bars) |
| `◆` | Accent color (single accent cell) |
| `.` | Empty (Icon Background color) |

Geometry rules:
- 9 columns × 5 rows
- Pillars at col 1 and col 7 (mirrored across col 4)
- Accent cell at (row 0, col 4) — dead-center on the top bar
- Cross-bars at rows 2 and 4, cols 3–5
- Top bar overhangs both pillars by exactly 1 cell

---

## Palette

There are 5 basic brand colors with **distinct roles**. 
You can make additional variants when needed in UI.

| Role | Name | HEX | RGB | OKLCH |
|------|------|-----|-----|-------|
| Ink | Aubergine | `#281C60` | 40 · 28 · 96 | 26% 0.13 287° |
| Accent | Pale Sky | `#96BED7` | 150 · 190 · 215 | 77% 0.06 240° |
| Grid Lines | Silver | `#DCDCDC` | 220 · 220 · 220 | 89% 0 0 |
| Icon Background | White | `#FFFFFF` | 255 · 255 · 255 | 100% 0 0 |
| Ground | Linen | `#F6F2EB` | 246 · 242 · 235 | 96% 0.012 89° |

### What each color is for

- **Ink (Aubergine `#281C60`)** — All T-pillars, all cross-bars, all body and headline text. **Replaces black** throughout the system. Deep purple-violet that pairs warmly with the pale sky accent.

- **Accent (Pale Sky `#96BED7`)** — *Only* the single accent cell in the icon's top bar. Sparingly elsewhere for highlights or focus. Light enough to recede on white grounds, but vivid against ink.

- **Grid Lines (Silver `#DCDCDC`)** — Gutters between cells in grid rendering mode. Subtle so it doesn't compete with the ink T's. Visible enough to give the spreadsheet-cell feel.

- **Icon Background (White `#FFFFFF`)** — Empty cells inside the icon's bounding box. Makes the icon read as a self-contained tile, regardless of what canvas surrounds it.

- **Ground (Linen `#F6F2EB`)** — Page background. The temperature contrast between cool ink and warm linen is what makes the system feel intentional rather than utilitarian.

---

## Rendering modes

### Crisp — for ≤ 80 px
- No corner radius
- No gap between cells (cells touch)
- `shape-rendering: crispEdges`
- Empty cells fill with Icon Background (`#FFFFFF`)
- Use for: **favicon, in-line UI, navbar at small scale, body-rendered logos**

### Grid — for > 80 px
- 2% inset per cell side → **4% gap** between adjacent cells (and the same 4% strip on every outer edge, so edges match internal gaps)
- `shape-rendering: crispEdges` (cells are axis-aligned squares)
- Empty cells: Icon Background (`#FFFFFF`)
- Gap fill: Grid Lines (`#DCDCDC`)
- Use for: **hero, app icon, print, anywhere the spreadsheet-cell feel is desired**

### Reverse (for dark UI)
When the mark sits on a dark or accent-colored canvas:
- Skip the icon background tile (transparent)
- Skip the grid lines
- T-pillars and cross-bars render in **white** (`#FFFFFF`)
- Accent cell stays **Pale Sky** (`#96BED7`)

The mark reads as a light silhouette on dark, with the accent cell still highlighting.

---

## Favicons

Two crisp favicon sets ship in this dir so a browser tab tells the two surfaces apart at a glance:

| Set | Source | Files | Used by |
|-----|--------|-------|---------|
| **Dark-on-white** | `icon-square-crisp.svg` | `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | The marketing homepage (`zsvedic.github.io/TamedTable/`) |
| **White-on-dark** | `icon-square-ink-crisp.svg` | `favicon-ink-16.png`, `favicon-ink-32.png`, `favicon-ink-48.png` | The web app (`zsvedic.github.io/TamedTable/app/`) |

The white-on-dark set is the dark-on-white mark with Ink and Icon Background swapped — Ink (`#281C60`) fills the tile, the T-pillars and cross-bars turn white, and the accent cell stays Pale Sky (`#96BED7`). Both sets render in Crisp mode (cells touch, no grid lines), so they read at favicon sizes.

---

## Typography

### Wordmark — **TamedTable**

Camel-case, both T's capitalized.

| Property | Value |
|----------|-------|
| Font family | **Outfit** (Google Fonts) |
| Weight | **500** |
| Letter spacing | **+0.005em** |
| Case | **small caps** (`font-variant-caps: small-caps`) |
| Color | Ink (`#281C60`) |

Result: **T**ᴀᴍᴇᴅ**T**ᴀʙʟᴇ — capitals stay full-size, lowercase letters become small caps.

### Body & UI

- **Inter** (Google Fonts), weights 400–600, for all body and UI copy.
- **JetBrains Mono**, weights 400–500, for specs, labels, captions, and any data-dense text.

---

## Lockup variants

### A — Single row (default)
```
[icon] TamedTable
```
- Icon height: `1.18em` (relative to wordmark font-size)
- Gap: `0.40em`
- Use for: navbar, footer, social handles, anywhere horizontal space is comfortable.

### B — Two row
```
[icon  ] Tamed
[      ] Table
```
- Icon height: `1.65em` (cap-top of row 1 → baseline of row 2)
- Gap: `0.42em`
- Wordmark line-height: `0.96`
- Use for: narrow-but-tall layouts — mobile splash, sidebar, label cards, badges.

---

## Sizing rules

| Size | Mode | Wordmark? |
|------|------|-----------|
| > 80 px | Grid | Yes (when space allows) |
| 32–80 px | Crisp | Yes |
| 24–32 px | Crisp | Yes |
| < 24 px | Crisp | **No — icon only** |

---

## Anti-patterns

- ❌ Don't recolor the accent cell. It is always Pale Sky (`#96BED7`); in reverse mode it stays sky on dark.
- ❌ Don't round the cell corners.
- ❌ Don't change the 9 × 5 cell grid.
- ❌ Don't reposition the accent cell. It lives at row 0, col 4.
- ❌ Don't use grid mode below 32 px — the gaps disappear into anti-aliasing.
- ❌ Don't use crisp mode above 80 px — the spreadsheet-cell reading is lost.
- ❌ Don't substitute black for Ink (`#281C60`). Black is colder; the Ink is intentionally warm.
- ❌ Don't put the wordmark in any font other than Outfit at the locked settings.
