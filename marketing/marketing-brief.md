# Marketing brief

The source of truth for TamedTable's message: the tagline, who it's for, and what it does for you. Everything else in this dir — [homepage.md](homepage.md), [features.md](features.md) — derives from this. Visuals live in [design/brand/brand.md](../design/brand/brand.md); product details live in [spec/](../spec/).

## Taglines

> **Talk to your data.**

Alternates:

- Say it, see it, save it.
- The data tool you talk to.

## Who it's for

Two groups, and we lead with the first:

- **Data engineers and analysts** who are tired of writing one-off cleanup scripts. They can read the result, trust it, and bring their team along.
- **Ops, finance, and research folks** with messy spreadsheets and no wish to learn Python.

Win the people who can judge the output, and the rest follow.

## The problem

Cleaning real data is still either tedious or technical. Every powerful tool — SQL, regex, Pandas — is a language you have to learn first. So most people fall back to Excel: easy, but limited. AI can write the code, but if you're not a programmer you can't check it, fix it, or keep it running.

You can *describe* the change you want long before you can *write* it.

## What TamedTable does

You see your data on screen and say what to do. It makes the change, shows you every row before and after, and saves the steps so you can run them again later — on new data, with no AI call. Use it as a web app you click or a command you script; both run on the same engine.

## Why it's different

- **You keep the steps, not a pile of code.** Save them, run them again tomorrow, even turn them into a Python script.
- **Asking stays cheap.** Describing a change costs the same whether your table has a hundred rows or a million, and replaying saved steps costs nothing at all.
- **Nothing is hidden.** You see exactly what changed, row by row, so you can trust it.
- **It's open source.** No lock-in, no proprietary format.

## What you can do with it

Every row links to the scenario that proves it works:

| What you can do | In your words | See it |
|---|---|---|
| Speak instead of type | tap the mic | [voice.feature](../spec/test-cases/voice.feature) |
| Clean up messy fields — phone numbers, emails, casing | *"normalize the phone numbers"* | [datanorm.feature](../spec/test-cases/datanorm.feature) |
| Drop duplicate rows | *"remove duplicate emails"* | [dedupe.feature](../spec/test-cases/dedupe.feature) |
| Keep only the rows you care about | *"keep customers in the USA"* | [filter.feature](../spec/test-cases/filter.feature) |
| Sort, or keep just the top few | *"sort by revenue, top 10"* | [sort.feature](../spec/test-cases/sort.feature) |
| Total things up by group | *"total sales per region"* | [aggregate.feature](../spec/test-cases/aggregate.feature) |
| Split one column into several | *"split full name into first and last"* | [colsplit.feature](../spec/test-cases/colsplit.feature) |
| Combine two tables | *"add each order's customer name"* | [join.feature](../spec/test-cases/join.feature) |
| Reshape between tall and wide | *"pivot months into columns"* | [pivot.feature](../spec/test-cases/pivot.feature) |
| Flag the bad rows | *"mark rows with a missing email"* | [validate.feature](../spec/test-cases/validate.feature) |
| Drop to SQL when you want it exact | *"set total = price * qty"* | [sql.feature](../spec/test-cases/sql.feature) |
| Point at other columns in a request | *"fill city from the address column"* | [placeholders.feature](../spec/test-cases/placeholders.feature) |
| Save your cleaned data | `:save clean.csv` | [convert.feature](../spec/test-cases/convert.feature) |
| Save the recipe and replay it later | `:save-flow tidy.flow` | [repl-commands.feature](../spec/test-cases/repl-commands.feature) |
| Hand it off as a Python script | `:save-py tidy.py` | [save-py.feature](../spec/test-cases/save-py.feature) |
| Take back any change | `:undo` / `:redo` | [repl-commands.feature](../spec/test-cases/repl-commands.feature) |
| Work in a browser or on the command line | same engine, your choice | [web.feature](../spec/test-cases/web.feature) |

## Files it reads and writes

TamedTable loads and saves **CSV** and **JSONL** — the two formats data teams already pass around. Open a file from your computer or from a URL, work on it, then save the cleaned rows back out.

Worth saying up front: the web app saves JSONL only and can't run SQL steps (the command line does the full set), and `.xlsx`/`.parquet` aren't supported yet.
