# New AI feature list

A reworked "What you can do" menu for the marketing brief, leading with the
killer feature: the LLM reads each row's context the way a person would, so it
does things no Excel formula or feature can. The everyday spreadsheet operations
are still here, but they no longer headline — the AI rows do.

Three columns: a category, the plain-language request a user types or says, and a
short note on the context the LLM uses to answer it.

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
