# Homepage copy

The words for the landing page, section by section, for whoever designs the page next. It owns the copy and the order of sections; it does not own layout or visuals — those come from the chosen template and the [brand tokens](../design/brand/brand.md). Everything here comes from the [marketing brief](marketing-brief.md).

Style follows [testdome.com](https://www.testdome.com): confident one-line headlines, terse benefit copy, and every feature block paired with an illustration of that exact screen. Show the work, don't describe it.

## The base template

Build the page on **SaaSify** — a pure HTML/CSS/vanilla-JS SaaS landing template, no framework, no build step: <https://github.com/prantomollick/saas-landing-page-template>. MIT licensed (no attribution required). It already has the section shape we want — hero, features grid, testimonials, pricing, CTA, footer.

Three cleanups before it ships, so it renders offline and matches the brand:

- **Drop the CDN dependencies.** Self-host the font (it pulls Poppins from Google Fonts) — use the brand fonts (Outfit, Inter, JetBrains Mono) instead — and replace the Font Awesome CDN with a few inline SVG icons.
- **Replace the placeholder images.** It ships stock Unsplash/Pravatar images loaded from the network; swap in real product shots (or the mark from [design/brand/](../design/brand/)).
- **Restyle with the brand tokens.** Recolor to Aubergine / Pale Sky / Linen from [design/tokens.json](../design/tokens.json); the template's CSS uses custom properties, so this is a variables pass, not a rewrite.

## Hero

> # Talk to your data.
> Load a spreadsheet, say what you want, and watch it happen. No formulas, no code.
>
> `[ Try it now ]`

## Trust line

No customer logos — TamedTable is open source. Use an honest band instead:

> Open source · try the live demos with no key · runs on your own API key · works in the browser or on the command line

## Demo

A 60-second screencast, captioned **TamedTable in 60 seconds**. Until that exists, show this real run as the hero image:

```
> normalize the phone numbers

 Email              Phone           Country
 alice@example.com  +15551234567    usa     ← was 555-123-4567
 bob@example.com    +15559876543    usa     ← was (555) 987-6543
```

One line in. Every row changed in front of you.

## Every common data job, in plain English

Three columns:

- **Transform** — Normalize, dedupe, filter, join, pivot, and more — by typing (or speaking) what you want, in your own language.
- **Reuse** — Every change saves as steps you replay on new data, or export as a Python script.
- **Trust** — You see every row change. Nothing is hidden, and it's fully open source.

## Feature highlights

Two or three blocks, each a benefit headline + a lead feature + an illustration. The full tour lives on the [features page](features.md).

**Clean messy data by asking.** Type *"normalize the phone numbers"* or *"remove duplicate emails"* and watch the rows update.
*Illustration: the table mid-change, before/after badges on the edited cells.*

**Keep the recipe, not the code.** Save your steps to one small file and replay them next week on new data — no AI call.
*Illustration: a saved `.flow` file replaying against a fresh CSV.*

## Enjoy the benefits

Three columns:

- **No more throwaway scripts.** Describe the change once; keep the recipe forever.
- **Costs stay flat.** One request costs the same on a hundred rows or a million.
- **Trust every change.** Watch each row update, and undo anything.

## How it works

1. **Open** a CSV or JSONL — from your computer or a URL.
2. **Say** what you want, in plain English.
3. **Watch** every row change, and undo anything.
4. **Keep** the data or the steps — replay later with no AI call.

## Call to action

> ## Try it in two minutes
> Open source. Runs on your own API key.
>
> `[ Open the web app ]`  `[ View on GitHub ]`

## Footer

Wordmark, links (Features, GitHub, Docs), open-source license. Footer line: *Say it, see it, save it.*
