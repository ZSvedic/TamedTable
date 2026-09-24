# How well do chat hosts work with tables on their own?

This checklist measures what ChatGPT and Claude can do with CSV files and code execution before you install TamedTable. It does not test the proposed MCP app or choose its architecture.

## Example

Open a new ChatGPT chat, attach `customers-input.csv` and say “normalize the phone numbers.” Note whether it shows an interactive table, how it made the change, and whether the 20 results match `cleanup-expected.csv`.

## What the answers decide

- **T1, T3:** do the hosts lack a live, editable grid with undo?
- **T2, T6:** how good are they at everyday cleanup and data questions?
- **T4, T5:** can you get the result out, and reuse the same steps on a new file or in a new chat?
- **T7, T8:** at 1,821 and 25,000 rows, do they judge every row, or quietly switch to keyword rules or a sample?
- **T9:** can they load a table from a URL?

## Before you start

Run Stage 1 in ChatGPT and Claude, using the plan you already pay for. Note the model and plan name. Start a fresh chat for each task unless it says to return to an earlier chat. Send the quoted prompts as written and time each task roughly. Record what the host actually did, including any code or confirmation requests.

The CSV fixtures live under `spec/test-cases/` in the [TamedTable repository](https://github.com/ZSvedic/TamedTable). The T7 labels live under `benchmarks/ground-truth/`. If a host lacks code execution, record that fact and continue. Gemini and the larger 25,000-row file wait for Stage 2.

## Stage 1: ChatGPT, then Claude

**T1. See and edit.** Attach `customers-input.csv`. Say “Show me this table.” Then “Sort the table by country.” Then “Rename the Phone column to Phone number.” If possible, click to change one cell. Otherwise say “Set the country of customer I003 to United Kingdom.” Ask “What is the country of customer I003?” Note whether the table is live, whether you can inspect every row and whether edits persist.

**T2. Clean.** In a new chat with `customers-input.csv`, say these one at a time: “normalize the phone numbers”; “make the country names consistent”; “fix the capitalization of names”; “clean up the birth dates”. Export the final CSV and compare it with `cleanup-expected.csv`; count mismatched cells and note any reasonable alternative formats. In another new chat, attach `dedupe-input.csv` and say “Remove duplicate rows by Email.” The fixture's expected result has 6 rows from 10. Note whether the host used code, judgment or both, and whether it marked changed cells.

**T3. Undo.** Return to the T2 customers chat. Say “undo the country change”, then “show me the table as it was right after the phone step”. Check both results against the exported or visible intermediate states. Note whether the host kept versions or tried to recreate them from memory.

**T4. Export and reopen.** In that chat, say “Give me the result as a CSV file.” Download it, open a fresh chat, attach it and say “Show me this table.” Check the filename, ease of download and whether the rows match the state you exported.

**T5. Reuse.** Return to the T2 customers chat, attach `customers-missing-phone.csv` and say “Apply exactly the same cleanup to this file.” Then say “Show me the steps as a recipe I can reuse in another chat or run myself.” Paste the recipe into a fresh chat with `customers-input.csv`. Check whether it reproduces the original cleanup and whether it handles the missing phones without inventing values.

**T6. Find problems.** In a fresh chat, attach `showcase-validate-input.csv` and ask “What is wrong with this dataset?” Check for six planted anomalies: two suspect email addresses (bill.gates@microsoft.com, asdf@asdf.com), a very old birth date (1873-01-01), an invalid February date (2024-02-30), Paris assigned to Japan and a desk lamp priced at 3.99. An unusual value needs a warning, not an invented correction.

**T7. Judge 1,821 videos.** In a fresh chat, attach `performance-liked-videos.csv`. Ask “Show me this dataset and summarize its columns.” Then “Sort by duration, longest first.” Then “Add a boolean column Music that is true for music videos. Give me the full result as a CSV file.” If it used a simple keyword rule, add “Please judge every row yourself instead of using rules.” Record whether you could browse the whole file, how many rows it processed, whether it showed progress and whether it stopped to ask. Score each exported version with the companion script. Keep the first version; a later correction should not erase the first result.

**T9. Load a URL.** In a fresh chat, say “Load this CSV and show me the first 5 rows: https://raw.githubusercontent.com/ZSvedic/TamedTable/main/spec/test-cases/customers-input.csv”. Note whether it loaded the URL or used another source.

Stop and compare the two hosts before Stage 2. T1 and T3 test the grid and undo; T4 and T5 test export and repeatability; T7 tests full-file judgment. Do not decide MCP architecture from one anecdote.

## Stage 2: only if Stage 1 leaves a question open

Run T8 if T7 warrants a larger file. Gemini is a competitor baseline here; do not assume it can host this MCP app.

**T8. 25,000 rows.** Attach `showcase-lazy-input.csv` and say “Add a Category column: kitchen, electronics, clothing, sports, or other. Give me the full result as a CSV file.” Note completion, method, minutes and 10 random rows. Check whether all 25,000 rows remain in the export.

**T10. Phone.** Open the T2 chat on your phone. Note whether the table is usable and whether you can download its CSV.

## Score T7

Run the companion scorer on each CSV. It scores the 116 hand-labelled videos with a known answer and counts a missing, blank or duplicated answer as wrong, so answering only the easy rows cannot score well. It also prints how many rows are missing, blank or duplicated. Random guessing scores about 50%. TamedTable's own benchmark reports 96.7%, counted slightly differently, so treat anything above 95% as TamedTable level.

```bash
python3 score_music.py benchmarks/ground-truth/music-labels.jsonl music-output.csv
```

## Report back

Use one row per task and host. Attach both T7 CSVs, the T2 CSVs and a T1 screenshot. Add a short note when a result surprised you.

| Task | Host and model | Worked? | Method | Minutes | Correctness / coverage | Good | Bad or surprising |
|---|---|---|---|---:|---|---|---|
| T1 | ChatGPT | | | | | | |
| T1 | Claude | | | | | | |
