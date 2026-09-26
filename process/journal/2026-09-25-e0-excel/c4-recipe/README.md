# C4. A recipe that replays outside the host (T5)

Same workbook and chat as [C2](../c2-rules/README.md) and [C3](../c3-undo/README.md). `customers-missing-phone.csv` was added as a new all-text sheet named `customers-missing-phone` (I006, I011 and I016 have no phone). Prompts: "Apply exactly the same cleanup to this file.", then "Give me the steps as a script I can run myself." The prompt says to run the script with `python3`; neither host gave Python, so each script ran where it can run, and the output was diffed against the add-in's own export.

## Excel + ChatGPT (GPT-5.6 Terra)

- **Same cleanup:** it asked "Should I repeat all original cleanup steps (phones, countries, names, and DOBs), or only the final retained phone cleanup?" Answered "Use your best judgment." It applied all four steps and "Left the three missing phone values blank rather than fabricating them: Emily, Chris, and Ahmed." [Question](chatgpt-1-same-cleanup-question.png), [answer](chatgpt-1-same-cleanup-answer.png), [sheet](chatgpt-1-same-cleanup-sheet.png).
- **Script:** an Excel Office Script in TypeScript, "Paste this into Excel → Automate → New Script". It needs Excel; it does not run on its own. [Text](chatgpt-2-script-answer.md), [answer](chatgpt-2-script-answer.png).
- **Replay:** run under Bun with a small stand-in for the Excel API (`run_office_script.ts`) on `customers-missing-phone.csv`. 119 of 120 cells match the add-in's export. The miss: I008 LastName `Van der Berg` from the script, `van der Berg` from the add-in.
- **Invented phones:** none, in the add-in or the script.

## Excel + Claude (Opus 5.5)

- **Same cleanup:** it asked for edit permission (Allow once), then applied "the same cleanup ... matching where the first sheet ended up (without the country change or the sort, which you undid)": new E.164 column, names, dates; countries left as they were. "F7 (Emily Davis), F12 (Chris Anderson) and F17 (Ahmed Khan) have no phone ... the E.164 cells are blank." [Permission](claude-1-same-cleanup-permission.png), [answer](claude-1-same-cleanup-answer.png), [sheet](claude-1-same-cleanup-sheet.png).
- **Script:** a VBA macro, "Open Tools → Macro → Visual Basic Editor ... run CleanContacts". It needs desktop Excel. [Text](claude-2-script-answer.md).
- **Replay:** pasted into the Visual Basic Editor of a fresh copy of `customers-missing-phone` and run once. Its output matches the add-in's export byte for byte.
- **Invented phones:** none, in the add-in or the macro.
- **`/skillify`:** sent in the same chat. It asked three questions ("How should I save this workflow? Extend normalize-contacts / New skill: clean-contacts", "Should the skill ask before overwriting names and dates in place?", "When a date could be read as day-first or month-first, what should the skill do?"), each answered "Use your best judgment." It then drafted an update to Zel's existing `normalize-contacts` skill and waited for Apply. The run did not click Apply, because that would overwrite a skill in Zel's account; see "Needs a human" in [../README.md](../README.md). The fresh-workbook test of a saved skill still happened by accident in C2: a fresh chat on a fresh workbook picked up `normalize-contacts` on its own. [Questions](claude-3-skillify-question.png), [2](claude-3-skillify-question-2.png), [3](claude-3-skillify-question-3.png), [draft](claude-3-skillify-draft.png).

## Result

Both hosts reapplied the cleanup to a new sheet without inventing phones, and both hand over a script that replays it. Neither script runs outside Excel: ChatGPT's is an Office Script, Claude's is VBA. Claude's macro reproduced the add-in's result exactly; ChatGPT's script differs in one name. Claude can also save the steps as a reusable skill, which replays in a fresh chat.
