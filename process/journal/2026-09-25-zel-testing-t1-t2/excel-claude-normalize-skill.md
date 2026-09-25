---
name: normalize-contacts
description: Standardize country names to full English names and convert phone numbers to E.164 international format using a Country Codes lookup sheet and a single fill-down formula.
---

## When to use
Customer/contact lists with messy country and phone columns. Triggers: "normalize the phone numbers", "make the country names consistent", "clean up contacts", "E.164 format", "standardize countries".

## Inputs
- `sheet` — the contact sheet (default: active sheet)
- `country column` / `phone column` — detect from headers (e.g. "Country", "Phone"); ask only if ambiguous

## Goal
The country column uses one full English name per country, a `Country Codes` sheet maps each of those names to its dial code, and a new `Phone (E.164)` column right of the data fills from one formula with no errors. The chat reply lists numbers whose length looks wrong for their country.

## Steps

### 1. Read and profile
Use `get_cell_ranges` to read the used range. List the distinct country values and phone formats.
**Done when:** you know the country/phone column letters, the row count, and every distinct country spelling.

### 2. Standardize country names (in place, no confirmation)
Map every variant to its full English short name: USA/US/United States of America → United States; UK/England/Scotland/Wales/Great Britain → United Kingdom; The Bahamas → Bahamas; Deutschland → Germany; and so on. Trim whitespace. Overwrite the column in place with `execute_office_js`.
**Rule:** use full English names (not ISO codes), and overwrite in place without asking first.
**Done when:** a read-back shows one spelling per country. In the reply, list the old → new mappings and point out any merges the user may want reversed (e.g. England → United Kingdom).

### 3. Build the Country Codes sheet
Create (or refresh) a sheet named `Country Codes`: A1 `Country`, B1 `Dial Code`, then one row per canonical country from step 2. Store dial codes as text (`@` format), in blue font as inputs. Bold the header and autofit.
**Done when:** every canonical country in the data has a row.
**Produces:** the lookup range (e.g. `'Country Codes'!$A$2:$B$N`).

### 4. Add the E.164 formula column
Put the header `Phone (E.164)` (bold) in the first empty column. Write the seed formula in row 2, then autofill it down (adjust the column letters and lookup range):
```
=LET(raw,TRIM(F2),ch,MID(raw,SEQUENCE(LEN(raw)),1),d,CONCAT(IF(ISNUMBER(--ch),ch,"")),cc,XLOOKUP(TRIM(E2),'Country Codes'!$A$2:$A$N,'Country Codes'!$B$2:$B$N,"?"),IF(LEFT(raw,1)="+","+"&d,IF(LEFT(d,2)="00","+"&MID(d,3,99),"+"&cc&IF(LEFT(d,1)="0",MID(d,2,99),d))))
```
How it works: an existing `+` is kept and only the digits are retained; a leading `00` becomes `+`; otherwise the country's dial code is added in front and a leading trunk `0` is dropped. Keep the original phone column unchanged.
**Done when:** a read-back of the column shows no errors and no `+?` (a `+?` means the country is missing from the lookup, so add it).

### 5. Flag suspicious lengths
Compare each result's digit count to what's expected (for example NANP/+1 = 11 digits, UK +44 = 12, Germany +49 = 11–13, China mobile +86 = 13). Don't change these values. List the rows that look wrong in chat.
**Done when:** the reply names which rows look complete and which look truncated.

### 6. Report
Keep it short: which columns changed or were added, the country mappings, and the rows flagged for length. Say which ranges you read back to verify.