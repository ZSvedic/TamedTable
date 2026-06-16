# Prompt — design the TamedTable landing page

Build the TamedTable marketing landing page in two phases: first a low-fidelity mockup that nails the exact copy and section order, then — once the copy is approved — the high-fidelity page built on the SaaSify template. This prompt owns the page build; it does not own the message (that's the [marketing brief](marketing-brief.md)).

Read [CLAUDE.md](../CLAUDE.md) first. This is a docs/asset task — no `src/` code, no test changes.

## Phase 1 — mockup with exact copy (do this first, stop here for review)

Goal: agree on the words and the layout before any visual polish. Produce a single plain `marketing/mockup.html` — minimal unstyled HTML, every section in order, filled with the **exact final copy**. No template, no brand colors, no images yet; placeholder boxes labelled with what goes there (e.g. "[hero product shot]", "[logo]") are fine.

- Pull the copy and section order from [homepage.md](homepage.md): hero → trust line → demo → three-column value → feature highlights → benefits → how-it-works → CTA → footer. The detailed feature tour is in [features.md](features.md).
- Use the words as written — but this is the moment to flag any line that reads awkward in place. List proposed copy changes in the PR description.
- Open a PR titled "Landing page — copy mockup", post a screenshot, and **stop**. Wait for the copy to be honed and approved before Phase 2.

## Phase 2 — high-fidelity page (only after copy is approved)

Build the real page as a self-contained static site — plain HTML, CSS, and vanilla JS only. No framework, no build step, no React, Tailwind, Bootstrap, jQuery, or npm.

Start from **SaaSify**: <https://github.com/prantomollick/saas-landing-page-template> (MIT). It already has the section shape — hero, features grid, testimonials, pricing, CTA, footer. Copy its `index.html`, `style.css`, `script.js`, and favicon into `marketing/site/`; drop its bundled demo `.webm` (a 10 MB file you don't need). Pour in the approved copy from the Phase 1 mockup.

Three cleanups, because SaaSify ships with network dependencies and stock content:

1. **No CDN.** It loads Poppins from Google Fonts and Font Awesome from a CDN. Self-host the brand fonts instead — Outfit (headings), Inter (body), JetBrains Mono (data) per [design/brand/brand.md](../design/brand/brand.md) — and replace Font Awesome icons with a few inline SVGs.
2. **Real images.** It uses Unsplash/Pravatar placeholders loaded from the network. Swap in the mark and lockups from [design/brand/](../design/brand/), and a real product shot for the hero (the terminal before/after block in [homepage.md](homepage.md) is a good stand-in until a screenshot exists).
3. **Brand colors.** Recolor to Aubergine `#281C60` / Pale Sky `#96BED7` / Linen `#F6F2EB` from [design/tokens.json](../design/tokens.json). SaaSify's CSS uses custom properties, so this is a variables pass.

## Verify and hand off

- Open `marketing/site/index.html` with **no network** and confirm fonts, icons, and images all render — nothing should 404.
- Drive it in the project's headless Chromium (see [README](../README.md#run-the-tests) for the browser setup) and capture a screenshot at desktop and mobile widths.
- Open a PR with the screenshots in the description. **Do not merge.**

## Ask before deciding

Where the site gets hosted is the user's call. The app already deploys to GitHub Pages at `/TamedTable/` via `.github/workflows/deploy.yml`. **Do not change that workflow or the Pages layout** — if the landing page should deploy too (and at which path), ask the user with `AskUserQuestion` before touching CI.
