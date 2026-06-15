# Marketing

Outward-facing copy for TamedTable: the tagline, who it's for, and the features worth leading with. Visuals live in [design/brand/brand.md](../design/brand/brand.md); product details live in [spec/](../spec/).

## Taglines

The one we're going with:

> **Talk to your data.**

More to pick from:

1. ETL for people, not programmers.
2. Spreadsheets for the rest of us.
3. A data cleaner for everyone.
4. Clean your tables by saying so.
5. Ask. Watch. Done.
6. Your words do the data work.
7. No code. Just ask.
8. Say it, see it, save it.
9. The data tool you talk to.

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

- **You keep the steps, not a pile of code.** Save them, run them again tomorrow, even export them as a Python script.
- **Big tables don't cost more.** The price per request stays the same whether you have a hundred rows or a million.
- **Nothing is hidden.** You see exactly what changed, row by row, so you can trust it.
- **It's open source.** No lock-in, no proprietary format.

## Features

Lead with these three:

- **Just say what you want** — *"normalize phone numbers,"* *"drop duplicate emails."* No formulas, no code.
- **Reusable steps** — every change is saved as a recipe you can replay on new data with no AI call, or export to Python.
- **Flat cost** — the bill per request doesn't grow with the table.

The rest:

| Feature | What you get |
|---|---|
| Web app and command line | Click to try it, script it to ship it — same engine. |
| Row-by-row changes | Watch every cell change as it happens. |
| Undo and history | Take back any change. |
| Save data or save the steps | Write out clean data, or keep the recipe for later. |
| Runs offline once saved | Replay a recipe with no AI call — fast and repeatable. |
| CSV and JSONL | The formats data teams already pass around. |

Worth saying up front: the web app can't run SQL steps and saves JSONL only (the command line does the full set), and `.xlsx`/`.parquet` aren't supported yet.
