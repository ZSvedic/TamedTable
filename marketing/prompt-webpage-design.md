# Prompt — design the TamedTable landing page

Build the TamedTable marketing landing page as a self-contained static site, on the SaaSify template, styled with the brand, and filled with the copy that already exists. This prompt owns the page build; it does not own the copy (that's fixed in [homepage.md](homepage.md) and [features.md](features.md)) or the message (the [marketing brief](marketing-brief.md)).

Read [CLAUDE.md](../CLAUDE.md) first. This is a docs/asset task — no `src/` code, no test changes.

## What to build

A landing page that renders fully offline, no framework, no build step — plain HTML, CSS, and vanilla JS only. No React, Tailwind, Bootstrap, jQuery, or npm.

Start from **SaaSify**: <https://github.com/prantomollick/saas-landing-page-template> (MIT). It already has the section shape — hero, features grid, testimonials, pricing, CTA, footer. Copy its `index.html`, `style.css`, `script.js`, and favicon into a new `marketing/site/` folder; drop its bundled demo `.webm` (a 10 MB file you don't need).

## The three cleanups

SaaSify ships with network dependencies and stock content. Fix all three:

1. **No CDN.** It loads Poppins from Google Fonts and Font Awesome from a CDN. Self-host the brand fonts instead — Outfit (headings), Inter (body), JetBrains Mono (data) per [design/brand/brand.md](../design/brand/brand.md) — and replace Font Awesome icons with a few inline SVGs.
2. **Real images.** It uses Unsplash/Pravatar placeholders loaded from the network. Swap in the mark and lockups from [design/brand/](../design/brand/), and a real product shot for the hero (the terminal before/after block in [homepage.md](homepage.md) is a good stand-in until a screenshot exists).
3. **Brand colors.** Recolor to Aubergine `#281C60` / Pale Sky `#96BED7` / Linen `#F6F2EB` from [design/tokens.json](../design/tokens.json). SaaSify's CSS uses custom properties, so this is a variables pass.

## Copy and structure

Pour in the exact copy and section order from [homepage.md](homepage.md): hero → trust line → demo → three-column value → feature highlights → benefits → how-it-works → CTA → footer. The detailed feature tour comes from [features.md](features.md). Don't rewrite the words — they're approved. Match the tone notes there (TestDome-style: terse, confident, show-don't-tell).

## Verify and hand off

- Open `marketing/site/index.html` with **no network** and confirm fonts, icons, and images all render — nothing should 404.
- Drive it in the project's headless Chromium (see [README](../README.md#run-the-tests) for the browser setup) and capture a screenshot at desktop and mobile widths.
- Open a PR with the screenshots in the description. **Do not merge.**

## Ask before deciding

Where the site gets hosted is the user's call. The app already deploys to GitHub Pages at `/TamedTable/` via `.github/workflows/deploy.yml`. **Do not change that workflow or the Pages layout** — if the landing page should deploy too (and at which path), ask the user with `AskUserQuestion` before touching CI.
