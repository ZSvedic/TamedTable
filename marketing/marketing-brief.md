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

- **You keep the steps, not a pile of code.** Save them, run them again tomorrow, even turn them into a Python script.
- **Asking stays cheap.** Describing a change costs the same whether your table has a hundred rows or a million, and replaying saved steps costs nothing at all.
- **Nothing is hidden.** You see exactly what changed, row by row, so you can trust it.
- **It speaks your language.** Ask in English, Spanish, German, French, Croatian, Chinese — by voice or text. It understands the request, not just keywords.
- **It's open source.** No lock-in, no proprietary format.

# New AI feature list

A reworked "What you can do" menu for the marketing brief, leading with the
killer feature: the LLM reads each row's context the way a person would, so it
does things no Excel formula or feature can. The everyday spreadsheet operations
are still here, but they no longer headline — the AI rows do.

Three columns: a category, the plain-language request a user types or says, and a
short note on the context the LLM uses to answer it.

Every row links to the scenario that proves it works — "play it" replays a
recorded run right in the browser, with **no API key and no signup**:

| Category | Say or type | Note |
|---|---|---|
| Clean up | *"normalize the phone numbers"* | Dialing prefix inferred from regions |
| Clean up | *"make the country names consistent"* | Folds *USA / U.S. / United States* into one |
| Clean up | *"fix the capitalization of names"* | Handles *McDonald*, *van der Berg* |
| Clean up | *"clean up the birth dates"* | Knows *03/04* is March in the US, April in the EU |
| Enrich & extract | *"split the address into its parts"* | Structures whatever mess they typed |
| Enrich & extract | *"fill the country from the city column"* | Knows *Osaka → Japan* |
| Enrich & extract | *"add the industry for each company"* | Inferred from company names |
| Enrich & extract | *"extract the amount and date from the memo"* | Pulled from free text |
| Classify | *"label each ticket as billing, bug, or feature"* | Reads the ticket's meaning |
| Classify | *"score the sentiment of every review"* | Positive, neutral, or negative |
| Classify | *"sort the titles by seniority"* | Ranks junior → senior |
| Classify | *"split customers into men, women, and unknown"* | Gender inferred from first names |
| Validate | *"flag emails that look fake"* | *bill.gates@microsoft.com* probably didn't sign up |
| Validate | *"flag any impossible birth date"* | Flags both *1873* and *Feb 30th* |
| Validate | *"check the city matches the country"* | *Paris, Japan* gets a second look |
| Validate | *"flag prices that seem wrong"* | Catches the missing zero before Reddit does |
| Language | *tap the mic* | Say any command out loud, hands-free |
| Language | *"summarize each review in one line"* | Even the 500-word rant |
| Language | *"translate the comments to English"* | From any source language |
| Language | *"tag the language of every comment"* | Language detected per row |
| Language | *"normaliza los números de teléfono"* | Ask in any language, voice or text |
| Deterministic | *"keep only customers in the USA"* | Filter rows |
| Deterministic | *"sort by revenue, top 10"* | Sort or top-N |
| Deterministic | *"remove duplicate emails"* | Dedupe |
| Deterministic | *"pivot months into columns"* | Reshape tall to wide |
| Deterministic | *"add each order's customer name"* | Join two tables |
| Load, save & reuse | a file or a URL | Loads CSV or JSONL, web or CLI |
| Load, save & reuse | `:save clean.csv` | Save data to CSV or JSONL |
| Load, save & reuse | `:save-flow tidy.flow` | Save transformations as a TamedTable script |
| Load, save & reuse | `:save-py tidy.py` | Save transformations as a Python script |
| Load, save & reuse | `:undo` / `:redo` | Undo/redo any change |
