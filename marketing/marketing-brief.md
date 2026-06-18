# Marketing brief

The source of truth for TamedTable's message: the tagline, who it's for, and what it does for you. Everything else in this dir — [homepage.md](homepage.md), [features.md](features.md) — derives from this, and the landing page is built on the [SaaSify template](https://github.com/prantomollick/saas-landing-page-template). Visuals live in [brand/brand.md](brand/brand.md); product details live in [spec/](../spec/).

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

You see your data on screen and say what to do — in plain language, English or
your own. It makes the change, shows you every row before and after, and saves
the steps so you can run them again later — on new data, with no AI call. Use it
as a web app you click or a command you script; both run on the same engine.

## Why it's different

- **You keep the steps, not a pile of code.** Save them, run them again tomorrow, even turn them into a Python script.
- **Asking stays cheap.** Describing a change costs the same whether your table has a hundred rows or a million, and replaying saved steps costs nothing at all.
- **Nothing is hidden.** You see exactly what changed, row by row, so you can trust it.
- **It speaks your language.** Ask in English, Spanish, German, French, Croatian, Chinese — by voice or text. It understands the request, not just keywords.
- **It's open source.** No lock-in, no proprietary format.

## What you can do with it

Every row links to the scenario that proves it works — "play it" replays a
recorded run right in the browser, with **no API key and no signup**:

| What you can do | In your words | See it |
|---|---|---|
| Speak instead of type | tap the mic | [voice.feature](../spec/test-cases/voice.feature) |
| Ask in your own language | *"normaliza los números de teléfono"* | [multilingual.feature](../spec/test-cases/multilingual.feature) |
| Clean up messy fields — phone numbers, emails, casing | *"normalize the phone numbers"* | [datanorm.feature](../spec/test-cases/datanorm.feature) |
| Drop duplicate rows | *"remove duplicate emails"* | [play it](https://zsvedic.github.io/TamedTable/app/?feature=dedupe.feature&scenario=Drop+duplicates+by+Email) |
| Keep only the rows you care about | *"keep customers in the USA"* | [play it](https://zsvedic.github.io/TamedTable/app/?feature=filter.feature&scenario=Filter+by+Country) |
| Sort, or keep just the top few | *"sort by revenue, top 10"* | [sort.feature](../spec/test-cases/sort.feature) |
| Total things up by group | *"total sales per region"* | [play it](https://zsvedic.github.io/TamedTable/app/?feature=aggregate.feature&scenario=Count+customers+per+country) |
| Split one column into several | *"split full name into first and last"* | [play it](https://zsvedic.github.io/TamedTable/app/?feature=colsplit.feature&scenario=Split+FullName+into+FirstName+and+LastName+on+space) |
| Combine two tables | *"add each order's customer name"* | [play it](https://zsvedic.github.io/TamedTable/app/?feature=join.feature&scenario=Left+join+enriches+each+customer+with+ISO+and+Region) |
| Reshape between tall and wide | *"pivot months into columns"* | [play it](https://zsvedic.github.io/TamedTable/app/?feature=pivot.feature&scenario=One+column+per+distinct+on-value%2C+default+agg+first) |
| Flag the bad rows | *"mark rows with a missing email"* | [play it](https://zsvedic.github.io/TamedTable/app/?feature=validate.feature&scenario=Flag+rows+with+empty+Phone) |
| Drop to SQL when you want it exact | *"set total = price * qty"* | [sql.feature](../spec/test-cases/sql.feature) |
| Point at other columns in a request | *"fill city from the address column"* | [placeholders.feature](../spec/test-cases/placeholders.feature) |
| Open a CSV or JSONL | open a file or paste a URL | [web.feature](../spec/test-cases/web.feature) |
| Save your cleaned data as CSV or JSONL | `:save clean.csv` | [convert.feature](../spec/test-cases/convert.feature) |
| Save the recipe and replay it later | `:save-flow tidy.flow` | [repl-commands.feature](../spec/test-cases/repl-commands.feature) |
| Hand it off as a Python script | `:save-py tidy.py` | [save-py.feature](../spec/test-cases/save-py.feature) |
| Take back any change | `:undo` / `:redo` | [repl-commands.feature](../spec/test-cases/repl-commands.feature) |
| Work in a browser or on the command line | same engine, your choice | [web.feature](../spec/test-cases/web.feature) |
