# Features

The full list of what TamedTable does, each shown with the words you'd actually type. It owns the feature copy for the website; the message it's built on is in the [marketing brief](marketing-brief.md), and proof lives in the [Gherkin scenarios](../spec/test-cases/).

Style: show-don't-tell. Every feature is a real request, not an adjective.

## Transform your data

You say it in plain words; TamedTable makes the change and shows you every row.

| What you want | What you type |
|---|---|
| Clean messy fields — phones, emails, casing | *normalize the phone numbers* |
| Drop duplicate rows | *remove duplicate emails* |
| Keep only the rows you care about | *keep customers in the USA* |
| Sort, or keep the top few | *sort by revenue, top 10* |
| Total things up by group | *total sales per region* |
| Split one column into several | *split full name into first and last* |
| Combine two tables | *add each order's customer name* |
| Reshape tall to wide | *pivot months into columns* |
| Flag the bad rows | *mark rows with a missing email* |
| Be exact with SQL | *set total = price * qty* |
| Point at other columns | *fill city from the address column* |

## Keep your work

The steps are yours — reuse them, share them, take them with you.

- **Save the clean data** — CSV or JSONL, back to your computer.
- **Save the recipe** — every step in one small file, replayed on new data with no AI call.
- **Export to Python** — hand a teammate a standalone script that needs no TamedTable.
- **Undo anything** — step back through every change.

## Work your way

- **Web app or command line** — click to explore, script to ship. Same engine underneath.
- **Speak instead of type** — tap the mic and say it.
- **Watch it happen** — every cell change shown, row by row.

## Good to know

TamedTable reads and writes **CSV** and **JSONL** today. The web app saves JSONL only and can't run SQL steps — the command line does the full set. `.xlsx` and `.parquet` aren't supported yet.
