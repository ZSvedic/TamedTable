# Website copy

Ready-to-paste landing-page text, assembled from the three docs before it. It owns the words on the page and their order; it does not own layout, color, or fonts — those come from [design/brand/brand.md](../design/brand/brand.md) and [design/tokens.json](../design/tokens.json).

A whole-page sketch before the section-by-section copy:

```
[ nav: logo · Features · How it works · GitHub ]
[ HERO:  tagline + subhead + two CTAs + product shot ]
[ HOW IT WORKS:  three steps — ask, watch, keep ]
[ FEATURES:  the headline three, then the grid ]
[ FOR YOU:  two columns — engineers / data owners ]
[ CTA band:  quickstart command + Open source ]
[ footer:  lockup · links · license ]
```

## Hero

> # Talk to your data. Keep the recipe.
> TamedTable is ETL you drive in plain language. Load a table, say what you want, and it builds a spec you can replay forever — no code to write, no black box, no lock-in.
>
> `[ Try the web app ]`  `[ View on GitHub ]`

Lift the tagline from [taglines.md](taglines.md); swap it per campaign without touching the rest.

## How it works

Three steps, in order — this is the whole product in fifteen seconds:

1. **Ask.** Load a CSV or JSONL and type a request — *"normalize phone numbers,"* *"drop duplicate emails."*
2. **Watch.** Cells change in front of you, with the before/after shown per row. Undo anything.
3. **Keep.** Save the cleaned data, or save the flow — a small recipe that replays on new data with no model call, or exports to a standalone Python script.

## Features

Open with the headline three from [features.md](features.md) — plain-language transformations, a replayable recipe, flat cost as data grows — then the feature grid below them. Don't restate the table here; render it from [features.md](features.md) so it stays in sync.

## For you

Two columns, dev-first:

- **For data engineers** — Stop writing throwaway scripts. Every transformation is an inspectable, version-able spec you can read, replay, and export to Python. Web to prototype, CLI to ship, same engine.
- **For data owners** — Clean your spreadsheets by saying what you want. No Python, no formulas, no waiting on the data team. See every change as it happens and undo with one click.

## CTA band

> ## Try it in two minutes
> Open source, runs on your own Anthropic key.
>
> ```
> cd src && bun install
> bun src/packages/cli/index.ts your-data.csv
> ```
>
> `[ Read the docs ]`  `[ Star on GitHub ]`

## Footer

Two-row lockup from [design/brand/brand.md](../design/brand/brand.md#lockup-variants), nav links, and the open-source license. Tagline alternate for the footer: *"Your data, your words, your recipe."*
