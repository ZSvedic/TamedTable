# Marketing brief

The source of truth for TamedTable's message: the tagline, who it's for, and what it does for you. Derived docs in this dir build on this, and the landing page is built on the [SaaSify template](https://github.com/prantomollick/saas-landing-page-template). Visuals live in [brand/brand.md](brand/brand.md); product details live in [spec/](../spec/).

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

- **You keep the steps.** Save them, run them again tomorrow, even turn them into a Python script.
- **Preview for cents, run for real when you're sure.** An AI step first runs on the page you are looking at — see it work on twenty rows before you spend on 100,000. One click runs the rest, with the price and time shown before you commit; replaying saved steps costs nothing at all.
- **Nothing is hidden.** You see exactly what changed, row by row, so you can trust it.
- **It speaks your language.** Ask in English, Spanish, German, French, Croatian, Chinese — by voice or text. It understands the request, not just keywords.
- **It's source-available (BUSL).** No lock-in, no proprietary format.

# New AI feature list

A reworked "What you can do" menu for the marketing brief, leading with the
killer feature: the LLM reads each row's context the way a person would, so it
does things no Excel formula or feature can. The everyday spreadsheet operations
are still here, but they no longer headline — the AI rows do.

Three columns: a category, the plain-language request a user types or says, and a
short note on the context the LLM uses to answer it.

Each category is **one showcase tour**: a recorded story that loads one sample
file and runs the category's rows on it in sequence. Every "Show me" on the
homepage replays that recorded run right in the browser, with **no API key and
no signup**. The rows below follow each tour's step order.

| Category | Say or type | Note |
|---|---|---|
| Lazy AI execution | open a 25,000-row file | Opens as a shuffled sample; work page by page |
| Lazy AI execution | *"add a Category column"* | Fills the rows on screen right away; the pager marks what's pending |
| Lazy AI execution | Run on all rows | Rows, cost, and time shown before you commit; finished rows are kept |
| Clean up | *"normalize the phone numbers"* | Dialing prefix inferred from regions |
| Clean up | *"make the country names consistent"* | Folds *USA / U.S. / United States* into one |
| Clean up | *"fix the capitalization of names"* | Handles *McDonald*, *van der Berg* |
| Clean up | *"clean up the birth dates"* | Knows *03/04* is March in the US, April in the EU |
| Enrich & extract | *"split the address into Street, City, and Zip"* | Structures whatever mess they typed |
| Enrich & extract | *"fill the country from the city column"* | Knows *Osaka → Japan* |
| Enrich & extract | *"add the industry for each company"* | Inferred from company names |
| Enrich & extract | *"extract the amount and date from the memo, refunds negative"* | Pulled from free text, refunds signed |
| Classify | *"label each ticket as billing, bug, or feature"* | Reads the ticket's meaning |
| Classify | *"classify the ticket sentiment into positive, negative and neutral"* | Reads the verdict, even in mixed tickets |
| Classify | *"sort the titles by seniority"* | Ranks senior → junior |
| Classify | *"split customers into men, women, and unknown"* | Gender inferred from first names |
| Validate | *"flag emails that look fake"* | *bill.gates@microsoft.com* probably didn't sign up |
| Validate | *"flag any impossible birth date, like Feb 30th or year 1873"* | Dates that parse can still be impossible |
| Validate | *"check the city matches the country"* | *Paris, Japan* gets a second look |
| Validate | *"flag prices that seem wrong"* | Catches the missing zero before Reddit does |
| Language | *tap the mic* | Say any command out loud, hands-free |
| Language | *"tag the language of every comment"* | Language detected per row |
| Language | *"translate the comments to English"* | From any source language |
| Language | *"add a one-line Summary for each comment"* | Even the 500-word rant |
| Language | *"normaliza los números de teléfono"* | Ask in any language, voice or text |
| Deterministic | *"remove the duplicate rows"* | Dedupe |
| Deterministic | *"join the country codes from a second table"* | Join two tables |
| Deterministic | *"show only customers in Europe"* | Filter rows — on the column the join just added |
| Deterministic | *"pivot Quarter into columns"* | Reshape tall to wide |
| Deterministic | *"sort by Q4, descending"* | Sort or top-N |
| Load, save & reuse | a file or a URL | Loads CSV, JSONL, Parquet, Arrow — web or CLI |
| Load, save & reuse | `:save clean.csv` | Save data to CSV, JSONL, Parquet, or Arrow |
| Load, save & reuse | `:save-flow tidy.flow` | Save transformations as a TamedTable script |
| Load, save & reuse | `:save-py tidy.py` | Save transformations as a Python script |
| Load, save & reuse | `:undo` / `:redo` | Undo/redo any change |
