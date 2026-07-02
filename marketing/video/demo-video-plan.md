# Demo video plan

A plan for a 30-second demo that ships in **two shapes** — horizontal 16:9 for
desktop (the README and the homepage hero box) and vertical 9:16 for phones —
each with a real-sounding voiceover **and** baked-in text, so it lands whether
the sound is on or off. This doc owns the storyboard, the look, and how to
render it; it does not own the message ([marketing-brief.md](../marketing-brief.md))
or the palette ([brand/brand.md](../brand/brand.md)).

Two rules shape everything below:

- **Never the whole app at once.** The camera frames one legible slice — the
  prompt, or a few changing rows, or the save button — and pans between slices.
  A full screenshot is unreadable in a phone-sized box; a zoomed slice is not.
- **One timeline, two framings.** The beats, the voiceover, and the captions
  are identical across ratios. Only the crop and the camera path differ, so
  there is one story to maintain, rendered twice.

The two framings map onto layouts the app already has: the **desktop layout**
for 16:9, the app's own **mobile dock layout** for 9:16. Both run the same
deterministic, key-free tours, so both are captured the same way at two
viewport sizes.

## The 30 seconds, shot by shot

Seven beats. The **camera** column says what fills the frame and how it moves —
the same content, cropped for each ratio. The live cells come from the
`clean-up` phone-normalize tour, which replays from a cassette with no API key.

| Time | Beat | Camera (what's in frame, how it moves) | Voiceover |
|---|---|---|---|
| 0.0–3.0 | **Open** | Brand mark draws on Linen, wordmark + **"Talk to your data."** Full-bleed, no app yet | *"Talk to your data."* |
| 3.0–7.0 | **The mess** | Push in on the `phone` column only — three rows, three different formats | *"This is your data. Messy."* |
| 7.0–11.0 | **Say it** | Pan up to the prompt chip; it types `normalize the phone numbers`; run button pulses | *"Just say what you want."* |
| 11.0–18.0 | **Watch it** | Pan back down to the rows; cells rewrite top-to-bottom, each landing in a Pale-Sky flash | *"Watch every row change — right in front of you."* |
| 18.0–22.0 | **Any language** | Chip swaps to `normaliza los números de teléfono`; same result flashes | *"Ask in any language. Same result."* |
| 22.0–26.0 | **Keep it** | Pan to the toolbar; `Save flow` and `Save as Python` glyphs slide into a "saved" pill | *"Keep the steps. Replay them free — or hand them off as Python."* |
| 26.0–30.0 | **Close** | Pull back to mark + tagline + `tamedtable.com` + `open in your browser — no install` | *"TamedTable. Talk to your data."* |

Notes that keep it honest and readable small:

- **The middle beat is the pitch.** "Watch it" gets 7 seconds — the row-by-row
  rewrite is what nobody else shows. Do not rush it.
- **One accent, one focus.** Only the changing cells wear Pale Sky (`#96BED7`),
  same rule as the illustration tiles.
- **Loopable.** The last frame settles on the mark and tagline, the open's end
  state, so an autoplay loop has no visible seam.
- **Legible-small test.** Every frame must be readable at the size of a phone
  screen or a hero box — roughly 360px wide. If a slice fails that, zoom in
  more or split it into two pans.

## Audio and text — both, every cut

Autoplay is muted on the web, so **the video must work silent**; the voiceover
is a bonus for anyone with sound on and for the social/YouTube cut.

- **Voiceover** — the seven lines above, ~55 words, ~28 seconds with pacing.
  Generate with a real-sounding TTS voice (warm, unhurried); render it once and
  reuse the same track for both ratios. Keep the script in
  `marketing/video/voiceover.txt` so a re-render is one command.
- **Captions** — the same lines as burned-in subtitles, lower third on 16:9,
  upper-middle on 9:16 (clear of the phone's dock). Ship a `.vtt` alongside for
  the accessible/`<track>` path too.
- **Key-phrase call-outs** — two or three of the beats also stamp a short
  phrase in Ink (`Say what you want`, `Any language`, `Save · Replay · Python`)
  in the brand type, separate from the running captions.

## The look — locked to the brand

Nothing new here; the values come from [brand.md](../brand/brand.md) and
[tokens.json](../tokens.json), so the video matches the app and the tiles:

- **Colors** — Ground Linen `#F6F2EB`, Ink Aubergine `#281C60`, Accent Pale Sky
  `#96BED7`, Grid Silver `#DCDCDC`, cell white. One highlight, Pale Sky.
- **Type** — wordmark **Outfit** 500 small-caps; captions/call-outs **Inter**;
  data cells and prompt chips **JetBrains Mono**. Load the real fonts before the
  first frame or the render falls back to serif.
- **Motion** — quiet. Cells cross-fade; the camera pans and eases (250–500ms,
  ease-out); the mark draw-on is the only flourish. No spins, no bounces.

## How to make it

Build it **as code in the repo**, then render it to files — same philosophy as
the cassettes and tours: deterministic, re-renderable, diffable. This
environment already has the tools.

1. **Capture the app slices.** Drive the deep-linked phone-normalize tour with
   the pre-installed Playwright Chromium (see the `use-browser` skill) at each
   viewport — a desktop size for 16:9, a phone size (≤768px, which triggers the
   app's dock layout) for 9:16. The tour replays from its cassette, so takes are
   identical every time, no API key.
2. **Compose the timeline** in `marketing/video/` — an HTML/CSS scene that
   places the captured slices and the illustrated open/close, and animates the
   **camera** (a CSS `transform` pan/zoom over the captured frames) plus the
   captions and call-outs on a fixed clock. A `?t=<ms>&ratio=16x9|9x16` param
   seeks and switches framing, so each frame is reproducible.
3. **Render** frames at 30fps via Playwright screenshots (exact control), once
   per ratio.
4. **Voiceover** — generate `voiceover.wav` from `voiceover.txt` with the TTS
   voice.
5. **Encode** with `ffmpeg`: mux the frames + `voiceover.wav`, burn the
   captions (`subtitles` filter), output H.264 MP4 and a looping WebM per ratio.

Alternative if a richer editor is wanted: **Remotion** (React video) gives a
real timeline and preview at the cost of a dependency — reach for it only if the
CSS-timeline approach fights back.

## What ships, and where

| Target | File | Format |
|---|---|---|
| Homepage hero, desktop | `hero-16x9.webm` + `.mp4` | `<video autoplay muted loop playsinline>` |
| Homepage hero, phone | `hero-9x16.webm` + `.mp4` | swapped in by a CSS media query / `<source media>` |
| README (inline) | `hero-16x9.gif` **or** `poster-16x9.png` → linked MP4 | GitHub markdown won't autoplay a committed `<video>`; a GIF loops inline, a poster+link stays small |
| Social / YouTube (later) | the 9:16 and 16:9 MP4s, sound on | out of scope this pass; the masters already cover it |

## Where everything goes

**Almost all of it lives in `marketing/video/`.** Source and rendered output
both belong there — one directory, one source of truth:

```
marketing/video/
  demo-video-plan.md      this doc
  timeline.html + .css    the animated scene (camera, captions, call-outs)
  capture.ts              drives Playwright: tour slices + frame render, per ratio
  voiceover.txt           the TTS script
  captions.vtt            subtitle track (also burned in)
  out/
    hero-16x9.{webm,mp4,gif}   poster-16x9.png
    hero-9x16.{webm,mp4}       voiceover.wav
```

Two small touches **outside** that dir are unavoidable, because the homepage is
served from `marketing/web/` and the README from the repo root:

1. **A symlink** `marketing/web/video → ../video`, exactly like the existing
   `web/illustrations` symlink. The deploy's `build-site.sh` copies the homepage
   with `cp -rL` (dereferences symlinks), so the videos land under the deployed
   site and `index.html` can point `<video src="video/hero-16x9.webm">` at them.
   Never replace the symlink with a copy — one source of truth.
2. **One line in the deploy trigger** — add `marketing/video/**` to the `paths:`
   list in [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)
   (next to `marketing/web/**`), so pushing a new render redeploys. Without it a
   video-only change wouldn't rebuild the site (the symlink file itself hasn't
   changed).

The README embeds by relative path — `marketing/video/out/hero-16x9.gif` (or the
poster) — so it needs nothing outside `marketing/video/`. Rendered files are
large; keep the README GIF/poster under a tight size budget and let the homepage
serve the full-quality MP4/WebM.

So: **yes, everything can live in `marketing/video/`** — plus one symlink under
`marketing/web/` and one line in the deploy workflow when the assets first land.

## Definition of done

- Both ratios play clean at 30fps, ≤30s, loop with no seam.
- Every beat readable with sound off, at ~360px wide.
- Colors and fonts match the app and a tile side by side — no serif fallback,
  one accent.
- Voiceover and captions say the same seven lines and stay in sync.
- The prompts, the phone numbers, and the save-flow / Python steps are all
  things the shipping app actually does (verify against the clean-up tour).
- Embedded and rendering in the README and a local copy of the homepage, with
  the phone cut swapping in at a narrow viewport.
