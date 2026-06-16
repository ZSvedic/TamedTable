# Features

The full feature tour for the website, modeled on [testdome.com/screening](https://www.testdome.com/screening): each block leads with a benefit, names a few capabilities, and pairs with an illustration of that screen. It owns the feature copy; the message it's built on is in the [marketing brief](marketing-brief.md), and proof lives in the [Gherkin scenarios](../spec/test-cases/).

Show, don't tell — every capability is the actual phrase you'd type.

## Hero

> # Everything you need to clean data
> Talk to your table. The work shows on screen, and the steps are yours to keep.

## Transform your data

Say what you want; TamedTable makes the change and shows every row.

- **Clean messy fields** — *"normalize the phone numbers"* fixes phones, emails, and casing in one pass.
- Ask in your own language — *"normaliza los números de teléfono"* works as well as the English.
- Drop duplicates — *"remove duplicate emails"*
- Keep the rows you want — *"keep customers in the USA"*
- Sort or take the top few — *"sort by revenue, top 10"*
- Total things up by group — *"total sales per region"*
- Split one column into several — *"split full name into first and last"*
- Combine two tables — *"add each order's customer name"*
- Reshape tall to wide — *"pivot months into columns"*
- Flag the bad rows — *"mark rows with a missing email"*
- Be exact with SQL — *"set total = price * qty"*

*Illustration: the table with one column changing, before/after badges on the edited cells.*

## Keep your work

The steps are yours — reuse them, share them, take them with you.

- **Save the recipe** — every step in one small file, replayed on new data with no AI call.
- Save the clean data — CSV or JSONL, back to your computer.
- Export to Python — hand a teammate a standalone script that needs no TamedTable.
- Undo anything — step back through every change.

*Illustration: a saved `.flow` file replaying against a fresh CSV, no chat needed.*

## Work your way

- **Web app or command line** — click to explore, script to ship. Same engine underneath.
- Speak instead of type — tap the mic and say it.
- Watch it happen — every cell change shown, row by row.

*Illustration: the web table beside the same command running in a terminal.*

## How it works

1. **Open** a CSV or JSONL — from your computer or a URL.
2. **Say** what you want, in plain English.
3. **Watch** every row change, and undo anything.
4. **Keep** the data or the steps — replay later with no AI call.

## Good to know

TamedTable reads and writes **CSV** and **JSONL** today. The web app saves JSONL only and can't run SQL steps — the command line does the full set. `.xlsx` and `.parquet` aren't supported yet.

## Call to action

> ## Want to try it?
> `[ Open the web app ]`  `[ View on GitHub ]`
