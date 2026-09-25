# C2. Change by rule, with changed cells marked (T2)

Fixture: `spec/test-cases/customers-input.csv`, loaded as an all-text sheet. Prompts sent one at a time in one fresh side-panel chat per host: "normalize the phone numbers", "make the country names consistent", "fix the capitalization of names", "clean up the birth dates". After each, the sheet was exported with File > Save As > CSV UTF-8. Scored with [score_cleanup.py](score_cleanup.py) against `cleanup-expected.csv`: phones equal when they differ only by spaces, dashes or brackets; names checked by hand for I003, I008 and I009 (the golden leaves them lowercase).

## Scores after the last step

| Host | DOB | Country | Phone | Names (I003, I008, I009) |
|---|---|---|---|---|
| Excel + ChatGPT | 18/20 | 17/20 | 19/20 | Bob McDonald, Sarah van der Berg, David O'Neil |
| Excel + Claude | 20/20 | 20/20 | 19/20, new column | Bob McDonald, Sarah van der Berg, David O'Neil |

## Excel + ChatGPT (GPT-5.6 Terra)

- **Phones:** rewrote column F in place as `+<country code><digits>`, using each row's country. "Preserved short/incomplete source numbers without inventing missing digits", yet I006 `555-4321` became `+15554321` (the golden leaves it blank). [Answer](chatgpt-1-phone-answer.png), [sheet](chatgpt-1-phone-sheet.png), [CSV](chatgpt-1-phone.csv).
- **Countries:** UK and England became United Kingdom, The Bahamas became Bahamas, Deutschland became Germany. It kept `USA`, so 3 cells differ from the golden's `United States`; `USA` is a reasonable consistent choice. [Answer](chatgpt-2-country-answer.png), [sheet](chatgpt-2-country-sheet.png), [CSV](chatgpt-2-country.csv).
- **Names:** "Bob McDonald, Sarah van der Berg, and David O'Neil are now standardized." All three right this time (Zel's earlier run got `Mcdonald`). [Answer](chatgpt-3-names-answer.png), [CSV](chatgpt-3-names.csv).
- **Dates:** converted to real Excel dates shown as `yyyy-mm-dd`; kept `NA` and `-` (the golden blanks them, so 2 misses); read `03/04/1983` as 4 March and `03.04.1993.` as 3 April. [Answer](chatgpt-4-dates-answer.png), [sheet](chatgpt-4-dates-sheet.png), [CSV](chatgpt-4-dates.csv).
- **Changed cells marked:** no. The green corners in the phone column are Excel's own "number stored as text" hint, not a change mark. The panel shows a "Spreadsheet updated / Undo" bar after each change.

## Excel + Claude (Opus 5.5)

- **Not a fresh user.** The first answer began "The normalize-contacts skill matches this request." That is the skill Zel saved with `/skillify` in the earlier T2 run. Turning memory off does not switch saved skills off. [Answer](claude-1-phone-answer.png).
- **Phones:** following that skill, it standardized the country names in the same step, added a `Country Codes` lookup sheet and a new `Phone (E.164)` formula column G, and left column F unchanged. It asked for edit permission first (Allow once). It listed short numbers in the chat ("Too short: G3, G7 ...") but left I006 as `+15554321`. [Permission](claude-1-phone-permission.png), [CSV](claude-1-phone.csv).
- **Countries:** "You don't need to change anything. I made the country names consistent in the last step". USA became United States, so 20/20. [Answer](claude-2-country-answer.png), [CSV](claude-2-country.csv).
- **Names:** fixed 6 cells; kept "van der" lowercase on purpose and asked nothing. [Answer](claude-3-names-answer.png), [sheet](claude-3-names-sheet.png), [CSV](claude-3-names.csv).
- **Dates:** converted to real dates shown as `yyyy-mm-dd`, cleared `NA` and `-`, read `03/04/1983` month first because the row is in the US and `03.04.1993.` day first because it is in Germany. [Answer](claude-4-dates-answer.png), [sheet](claude-4-dates-sheet.png), [CSV](claude-4-dates.csv).
- **Changed cells marked:** no. No fill, colour or comment on changed cells; the E.164 column is new, so the old value stays beside it.

## Result

Both hosts clean well by rule; Claude matched the golden on every column but the one ambiguous phone. Neither marked changed cells in the grid. The Excel CSV export only saves the active sheet, so Claude's `Country Codes` sheet, which its phone formulas need, is not in its CSVs; the CSVs hold the formula results.
