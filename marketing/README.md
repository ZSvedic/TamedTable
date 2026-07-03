# Marketing

Everything the public sees before they open the app: the message, the feature illustrations, and the landing page that ships to the site root. Product behavior and types live in [spec/](../spec/); the brand marks and palette live in [brand/](brand/brand.md) — this dir owns them.

## Layout

```
marketing/
  marketing-brief.md     the message — tagline, audience, what TamedTable does
  tokens.json            design token master — colors, typography, spacing
  brand/                 marks, favicons, lockups, brand.md
  claude-design-app/     in-browser design canvas (scratch JSX + generated tokens.jsx)
  illustrations/         SVG feature tiles + gallery.html to preview them (old/ = superseded set)
  video/                 storyboard + render plan (demo-video-plan.md) for the 20s video
  web/                   the landing page (index.html + styles.css + main.js)
```

`web/`'s favicon and illustrations are **symlinks**, not copies — one source of truth. Edit the real file under `brand/` or `illustrations/`; both the homepage and the app pick the change up. Never replace a symlink with a copy.

The homepage and the web app deliberately use **different** favicons so a browser tab tells them apart: the homepage shows the dark-on-white mark (`favicon-32.png`), the app shows the white-on-dark mark (`favicon-ink-*.png`, copied into the app build from `src/packages/web/public/`). Both sets live in [brand/](brand/brand.md#favicons).

## What ships where

The landing page is the site root; the web app sits under `/app/`. The deploy ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)) assembles them:

- `https://zsvedic.github.io/TamedTable/` — `web/` (symlinks dereferenced)
- `https://zsvedic.github.io/TamedTable/app/` — the web app build
- `https://zsvedic.github.io/TamedTable/demos/<name>/` — per-package demos

A push to `main` that touches `marketing/web/`, `marketing/illustrations/`, or `marketing/brand/` redeploys. `marketing-brief.md` is a doc — editing it changes nothing live.

## Making a change

| You want to… | Do this |
|---|---|
| Change the pitch / tagline / audience | Edit `marketing-brief.md` first — it's the source the page copies from. |
| Edit page wording or structure | `web/index.html` — semantic markup, content lives here for SEO. |
| Restyle (color, layout, spacing) | `web/styles.css` — every color is a `:root` CSS variable; change one to re-skin. |
| Change page behavior | `web/main.js` — vanilla JS: nav toggle + the interactive feature lists. |
| Add or redraw a feature tile | Follow [process/prompts/prompt-illustrate.md](../process/prompts/prompt-illustrate.md); drop the SVG in `illustrations/`. The homepage sees it through the symlink. |
| Link to the app | Use `https://zsvedic.github.io/TamedTable/app/…` (not the bare root — that's the homepage now). |

Preview without a build: open `web/index.html` in a browser (the symlinks resolve locally), or `illustrations/_gallery.html` to eyeball all tiles. Fonts load straight from Google Fonts — no offline story, since the app needs network anyway.

Any markdown you add here follows [spec/writing-style.md](../spec/writing-style.md).
