# C3. Undo any step (T3)

Same workbook and chat as [C2](../c2-rules/README.md). Prompts: "undo the country change" (not the last step), then "show me the table as it was right after the phone step". Then a hand edit (I002 FirstName `Jane` to `Janet`), one more change ("sort the table by last name"), "undo that change", and a check that the hand edit survived. Last, the panel's own Undo and Excel's Cmd+Z.

## Excel + ChatGPT (GPT-5.6 Terra)

- **"undo the country change":** it answered "Reverted the country standardization changes on the active sheet: United Kingdom → UK / England, Bahamas → The Bahamas, Germany → Deutschland". The sheet did not change. The CSV exported right after still has the standard names and matches the dates-step export byte for byte. In its next turn it said "I found the later cleanup changes. Restoring the original names, DOB text, and country labels now". [Answer](chatgpt-1-undo-country-answer.png), [CSV](chatgpt-undo-country.csv).
- **"show me the table as it was right after the phone step":** it did not show a table. It rewrote the sheet back to that state, overwriting the name, date and country steps. The result matches the phone-step export byte for byte, so it rebuilt the state correctly. [Answer](chatgpt-2-after-phone-answer.png), [CSV](chatgpt-after-phone.csv).
- **Panel Undo button** ("Spreadsheet updated / Undo"): one click put back the whole last turn. The sheet matched the dates-step export again, which also confirms the country revert never landed. [Sheet](chatgpt-3-panel-undo-sheet.png), [CSV](chatgpt-panel-undo.csv).
- **Hand edit, sort, "undo that change":** the sort took over 2 minutes ("The native sort timed out"). The undo restored ID order. The hand edit `Janet` survived. [Answer](chatgpt-4-undo-sort-answer.png), [sheet](chatgpt-4-undo-sort-sheet.png).
- **Excel Cmd+Z:** it steps through ChatGPT's internal writes, not whole changes. One press left I016's birth date as `33948` (Alice's date as a raw number); a second press brought back the last-name order with birth dates attached to the wrong people (I016 Ahmed Khan got Michael Miller's `1988-11-30`). Two Cmd+Y presses restored the table. [After one press](chatgpt-5-cmdz-1-sheet.png), [after two](chatgpt-5-cmdz-2-sheet.png).

## Excel + Claude (Opus 5.5)

- **"undo the country change":** it asked a question first: "Which country change should I undo? 1 Only England → United Kingdom, 2 All country changes". Answered "Use your best judgment." It then restored the original spellings for the whole country step, kept names and dates, and added the old spellings to its `Country Codes` sheet so the phone formulas still work. It asked for edit permission (Allow once). The export differs from the dates-step export only in the 7 country cells that the golden changes. [Question](claude-1-undo-country-question.png), [answer](claude-1-undo-country-answer.png), [CSV](claude-undo-country.csv).
- **"show me the table as it was right after the phone step":** it showed a table in the chat, "rebuilt from my notes of that point. It's shown here only; I didn't change the workbook." All 140 cells match the real phone-step export. It kept no version; it recreated the state from the conversation. [Text](claude-2-after-phone.md), [answer](claude-2-after-phone-answer.png).
- **Panel Undo button:** none. The Claude panel has no per-change Undo control.
- **Hand edit, sort, "undo that change":** the undo re-sorted by ID ("the same as sorting by ID"), a new forward change rather than a restore. The hand edit `Janet` survived. [Answer](claude-3-undo-sort-answer.png), [sheet](claude-3-undo-sort-sheet.png).
- **Excel Cmd+Z:** each press undid one whole change: first the re-sort by ID, then the sort, then the hand edit (`Janet` back to `Jane`). A fourth press changed nothing visible. [After one](claude-4-cmdz-1-sheet.png), [after two](claude-4-cmdz-2-sheet.png), [after four](claude-4-cmdz-4-sheet.png).

## Result

Both hosts can undo a middle step by asking, but neither keeps versions: they re-derive the old state from the chat. ChatGPT reported a country undo that never reached the sheet. ChatGPT's panel Undo reverts the last turn cleanly, while Excel's Cmd+Z can leave ChatGPT's changes half undone and scramble rows. Claude has no Undo button; Cmd+Z worked cleanly on its changes. Hand edits survived an undo in both.
