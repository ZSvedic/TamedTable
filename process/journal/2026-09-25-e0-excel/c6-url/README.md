# C6. Open from a URL (T9)

A blank workbook and a fresh chat per host. Prompt: "Load this CSV and show me the first 5 rows: https://raw.githubusercontent.com/ZSvedic/TamedTable/main/spec/test-cases/customers-input.csv".

## Excel + ChatGPT (GPT-5.6 Terra)

- Fetched the URL itself ("Fetching CSV data") and wrote only the header and the first 5 rows into Sheet1: "Loaded the CSV header and first five records into Sheet1 and autofit the columns." [Answer](chatgpt-answer.png).
- Excel rewrote two dates on the way in: I001 `01-01-1990` shows as `1/1/90` and I002 `1985-05-15` as `5/15/85`. The other 15 rows are not in the workbook. [Sheet](chatgpt-sheet.png).

## Excel + Claude (Opus 5.5)

- Fetched the URL itself ("Fetched a page, ran code") and wrote the whole file into A1:F21 as text: "The cells are stored as text, so Excel won't reformat the dates or phone numbers." It showed the first 5 rows as a table in the chat, added a note on A1 with the source URL and download time, and pointed out the messy dates, names, countries and phones. [Answer](claude-answer.png), [sheet](claude-sheet.png).

## Result

Both load a table from a URL without help. Claude loads the full file without damage; ChatGPT loads only the rows it was asked to show and lets Excel rewrite two dates.
