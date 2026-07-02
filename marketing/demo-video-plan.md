# Demo video plan

A plan for one 30-second video that shows what TamedTable does — the same clip
goes at the top of [README.md](../README.md) and (optionally) into the hero of
[tamedtable.com](https://www.tamedtable.com/). This doc owns the storyboard,
the look, and how to render it; it does not own the message (that's
[marketing-brief.md](marketing-brief.md)) or the palette (that's
[brand/brand.md](brand/brand.md)).

The video reuses one idea already proven on the site: a **prompt chip above a
mini-table that changes before your eyes** — the exact shape of every tile in
[illustrations/](illustrations/). The video is those tiles, animated, plus a
brand open and a close.

## The 30 seconds, shot by shot

Eight beats. Each maps to a real feature and, where possible, to one of the
seven homepage categories, so the video and the page tell the same story.

| Time | Beat | On screen | Reads as |
|---|---|---|---|
| 0.0–3.5 | **Open** | The mark draws itself cell by cell on Linen; wordmark fades in; tagline **"Talk to your data."** | Brand |
| 3.5–7.0 | **The mess** | A messy table drops in — `phone` column with `555-123-4567`, `(030) 5556789`, `86 555 1234`, all different shapes | The problem |
| 7.0–11.0 | **Say it** | A prompt chip types `normalize the phone numbers`; caret blinks; the ▸ run button pulses | Say what you want |
| 11.0–18.0 | **Watch it** | Cells rewrite row by row, top to bottom — `+15551234567`, `+49305556789`, `+8655551234` — each landing in a Pale-Sky highlight that fades to normal | Watch changes (the money shot) |
| 18.0–22.0 | **Your language** | The chip swaps to `normaliza los números de teléfono`; same result flashes — no re-work | Speaks your language |
| 22.0–26.0 | **Keep it** | Chip → `:save-flow tidy.flow`, then `:save-py tidy.py`; a tiny flow/Python glyph slides into a "saved" pill | Keep the steps, not the code |
| 26.0–29.0 | **Where** | Two words fade up: **Browser · Terminal**, one engine line under them | Web or CLI, same engine |
| 29.0–30.0 | **Close** | Mark + **Talk to your data.** + `tamedtable.com` + `open in your browser — no install` | CTA |

Design notes that keep it honest and on-brand:

- **The middle beat is the pitch.** Give "Watch it" the most time (7s). The
  row-by-row rewrite is what nobody else shows; do not rush it.
- **One accent, one focus.** Only the changing cells wear Pale Sky
  (`#96BED7`). Never color two things at once — same rule as the tiles.
- **Loopable.** The last frame settles on the mark and tagline, which is also
  the first frame's end state, so an autoplay loop has no visible seam.
- **Silent-first.** Autoplay is muted everywhere, so every point must land
  with no sound. Music, if any, is decoration for the homepage/YouTube cut
  only.

## The look — locked to the brand

Nothing here is a new decision; it all comes from [brand.md](brand/brand.md)
and [tokens.json](tokens.json). Pulling the values into one place so the
animation matches the tiles pixel for pixel:

- **Colors** — Ground Linen `#F6F2EB`, Ink Aubergine `#281C60`, Accent Pale
  Sky `#96BED7`, Grid Silver `#DCDCDC`, cell white `#FFFFFF`. Header band and
  all text are Ink. The one highlight is Pale Sky.
- **Type** — wordmark **Outfit** 500 small-caps; UI/labels **Inter**; every
  data cell and prompt chip **JetBrains Mono**. Load the real fonts before the
  first frame or the render falls back to serif (the same trap the tile prompt
  warns about).
- **Table** — round-top header band (square bottom corners), 34px rows
  alternating white / Linen, Silver outline — copy the geometry straight out
  of `illustrations/CleanUp-phone-numbers.svg`.
- **Motion** — quiet. Cells cross-fade, they don't spin. Typing is a caret and
  characters, not a bounce. 250–400ms per transition, ease-out. The mark
  draw-on is the only flourish.

## How to make it

Build the video **as code in the repo**, then render it to a file — same
philosophy as the cassettes and tours: deterministic, re-renderable, diffable,
no binary-editor round-trips. This environment already has the two tools that
make it free.

Recommended pipeline (no heavy new dependency):

1. **Author** an HTML/CSS/JS timeline at `marketing/video/` — one full-viewport
   1920×1080 scene, animated with CSS keyframes on a fixed clock, reusing the
   token colors and the tile SVG markup. A single `?t=<ms>` param that seeks
   the timeline makes each frame reproducible.
2. **Capture** with the pre-installed Playwright Chromium (see the
   `use-browser` skill): drive the page, record video, or screenshot frames at
   a fixed step (e.g. 33ms → 30fps) for exact control.
3. **Encode** the frames with `ffmpeg` to an H.264 MP4 and a looping WebM.

For the "Watch it" beat you have a shortcut: the app's **tours replay from
recorded cassettes with no API key** and are deep-linkable
(`app/?feature=clean-up.feature&scenario=Normalize+the+phone+numbers`).
Screen-record that deep link with Playwright and you get the *real* app doing
the *real* transform, deterministically, in as many takes as you want. Drop
that clip into the middle beat for authenticity; keep the illustrated open and
close for polish. This hybrid is the least work for the most credibility.

Alternative if a richer editor is wanted: **Remotion** (React video) gives a
real timeline and preview, at the cost of a dependency and a bit of setup. Only
reach for it if the CSS-timeline approach starts to fight back.

## What ships, and where

One 30-second master at 1920×1080, silent-safe, captions baked in. From it:

| Target | Format | Why |
|---|---|---|
| **tamedtable.com hero** | WebM + MP4 fallback, `<video autoplay muted loop playsinline>` | Autoplays, loops, light weight |
| **README (inline)** | Optimized looping GIF **or** poster PNG linking to the MP4 | GitHub markdown won't autoplay a committed `<video>`; a GIF loops inline, a poster+link stays small |
| **Social / YouTube (later)** | MP4 with optional music + captions | Out of scope for this pass; the master already covers it |

Placement in the repo:

- **Source** (HTML/CSS/JS timeline + capture script) → `marketing/video/`.
- **Rendered master** is large; host it as the deployed site serves it
  (`marketing/web/` asset, so tamedtable.com can `<video src>` it) rather than
  bloating the git history. Keep the README's GIF small and under a size
  budget, or link out to the hosted MP4 with a poster frame.

## Definition of done

- Plays clean at 30fps, 1920×1080, ≤30s, loops with no seam.
- Every beat readable with sound off.
- Colors and fonts match a tile side by side — no serif fallback, one accent.
- The phone numbers, the prompts, and the saved-flow step are all things the
  shipping app actually does (verify against the clean-up tour).
- Embedded and rendering in both the README and a local copy of the homepage.
