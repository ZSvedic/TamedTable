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
| Clean up | *"clean up the birth dates"* | ISO dates inferred from country formats |
| Enrich | *"fill the country from the city column"* | Knows *Paris → France*, *Osaka → Japan* |
| Enrich | *"add a continent column"* | Inferred from countries |
| Enrich | *"add the industry for each company"* | Inferred from company names |
| Classify | *"label each ticket as billing, bug, or feature"* | Reads the ticket's meaning |
| Classify | *"score the sentiment of every review"* | Positive, neutral, or negative |
| Classify | *"sort the titles by seniority"* | Ranks junior → senior |
| Classify | *"split customers into men and women"* | Gender inferred from first names |
| Extract | *"split the address into its parts"* | Into Street, City, and ZIP columns |
| Extract | *"split the full names"* | Into First, Middle, and Last columns |
| Extract | *"extract the amount and date from the memo"* | Pulled from free text |
| Validate | *"flag any impossible birth date"* | Judges plausibility, not a range |
| Validate | *"check the city matches the country"* | Flags mismatched rows |
| Language | *"translate the comments to English"* | From any source language |
| Language | *"summarize each review in one line"* | Long text into a sentence |
| Language | *"tag the language of every comment"* | Language detected per row |
| Language | *"normaliza los números de teléfono"* | Ask in any language, voice or text |
| Everyday | *"keep only customers in the USA"* | Filter rows |
| Everyday | *"sort by revenue, top 10"* | Sort or top-N |
| Everyday | *"remove duplicate emails"* | Dedupe |
| Everyday | *"pivot months into columns"* | Reshape tall to wide |
| Everyday | *"add each order's customer name"* | Join two tables |
| Save & reuse | `:save clean.csv` | Save data to CSV or JSONL |
| Save & reuse | `:save-flow tidy.flow` | Save transformations as a TamedTable script |
| Save & reuse | `:save-py tidy.py` | Save transformations as a Python script |
| Save & reuse | `:undo` / `:redo` | Undo/redo any change |
| Open & run | a file or a URL | Browser or command line |
