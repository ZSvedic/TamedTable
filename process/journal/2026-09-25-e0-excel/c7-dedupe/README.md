# C7. Dedupe (T2, second part)

A fresh all-text workbook of `dedupe-input.csv` (10 rows) and a fresh chat per host. Prompt: "Remove duplicate rows by Email." Expected: 6 rows, IDs 1, 2, 4, 6, 7, 9 (`spec/test-cases/dedupe-expected.jsonl`).

## Excel + ChatGPT (GPT-5.6 Terra)

- "Removed 4 duplicate records based on Email, keeping the first occurrence of each address. The cleaned list now has 6 unique contacts." No question, no permission prompt. [Answer](chatgpt-answer.png), [sheet](chatgpt-sheet.png).
- **Result: 6 rows, IDs 1, 2, 4, 6, 7, 9.** Matches the expected rows exactly. [CSV](chatgpt-dedupe.csv).

## Excel + Claude (Opus 5.5)

- Asked for permission first; the prompt listed "Potential data loss: Delete range ..." for each removed row (Allow once). Then: "I removed 4 rows with a repeated email and kept the first row for each email. The rows removed were IDs 3 and 8 (alice), 5 (bob) and 10 (eve)." [Permission](claude-permission.png), [answer](claude-answer.png), [sheet](claude-sheet.png).
- **Result: 6 rows, IDs 1, 2, 4, 6, 7, 9.** Matches the expected rows exactly, and matches ChatGPT's export byte for byte. [CSV](claude-dedupe.csv).

## Result

Both dedupe correctly by rule. Claude names the removed rows and warns before deleting; ChatGPT gives only the count. Neither marks anything in the grid, which is expected for deleted rows.
