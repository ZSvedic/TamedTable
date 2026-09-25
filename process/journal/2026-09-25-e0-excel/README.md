# E0: do the Excel add-ins already cover TamedTable MCP?

A desktop agent ran [prompt-host-testing-autopilot.md](../../prompts/prompt-host-testing-autopilot.md) on 2026-09-25 against the promises in [mcp-product-plan.md](../2026-09-24-mcp-app/mcp-product-plan.md#what-the-first-release-does).

**Answer: no. Neither add-in covers every promise, so the rule "drop the MCP app if both cover everything" does not fire.** Claude for Excel comes close: it covers undo, questions and loading from a URL, and it judged every row at 93.1%. The gaps both add-ins share are no marks on changed cells and no recipe that runs outside Excel.

## Coverage

| Promise | Excel + ChatGPT (GPT-5.6 Terra) | Excel + Claude (Opus 5.5) |
|---|---|---|
| **Open** from a URL | partly: fetched it, but wrote only the 5 rows it showed and let Excel rewrite two dates ([C6](c6-url/README.md)) | covered: fetched it and wrote all 20 rows as text, with a source note ([C6](c6-url/README.md)) |
| **Open** a file or pasted text | partly: Excel opens files, but a plain open or paste rewrites dates unless loaded as Text; same for both hosts ([C4 setup](c4-recipe/README.md)) | partly: same as ChatGPT |
| **Change by rule** (sort, dedupe, normalize) | covered: phones 19/20, countries 17/20 (kept `USA`), dates 18/20, names right, dedupe exact ([C2](c2-rules/README.md), [C7](c7-dedupe/README.md)) | covered: phones 19/20, countries, dates 20/20, names right, dedupe exact ([C2](c2-rules/README.md), [C7](c7-dedupe/README.md)) |
| **Change by judgment** on every row | not covered: used title and channel signals, 63.8%; "judge every row yourself" changed 11 rows, 65.5% ([C1](c1-judgment/README.md)) | partly: judged all 1,821 rows itself, 93.1%, under the 95% bar; no row count while working ([C1](c1-judgment/README.md)) |
| **Ask**: find problems, answer without changing the table | partly: 5 of 6 anomalies (missed bill.gates@); wrote an unrequested summary into the sheet when asked a question ([C5](c5-ask/README.md)) | covered: 6 of 6 anomalies, both answers read-only ([C5](c5-ask/README.md)) |
| **See**: live grid, manual edits, changed-cell marks | partly: live Excel grid and hand edits survive, but no marks on changed cells ([C2](c2-rules/README.md), [C3](c3-undo/README.md)) | partly: same; a new column keeps the old phone beside the new one, but nothing is marked ([C2](c2-rules/README.md)) |
| **Undo** from the chat or the grid | partly: panel Undo works; "undo the country change" was reported done but never reached the sheet; Cmd+Z left rows scrambled ([C3](c3-undo/README.md)) | covered: undid a middle step from the chat, rebuilt an older state exactly, Cmd+Z undoes one change per press; no Undo button, no stored versions ([C3](c3-undo/README.md)) |
| **Take away** the result as CSV or XLSX | covered by Excel: File > Save As; the add-in says it can't attach a file ([C1](c1-judgment/README.md)) | covered by Excel: same; the add-in says it can't make a file ([C1](c1-judgment/README.md)) |
| **Take away** a recipe that replays elsewhere | partly: reapplied the cleanup without inventing phones; script is an Excel Office Script, 119/120 cells match ([C4](c4-recipe/README.md)) | partly: reapplied without inventing phones; VBA macro reproduced the result exactly; `/skillify` saves a reusable skill; nothing runs outside Excel ([C4](c4-recipe/README.md)) |
| Big file, 25,000 rows (T8, a Web promise) | covered: all rows categorised in about 1.5 minutes ([C8](c8-big/README.md)) | covered: all rows categorised in about 2 minutes, via a type-to-category lookup ([C8](c8-big/README.md)) |
| **Change by judgment** in batches, with pending cells for rows not yet done | not tested: the add-ins have no pending state; they fill every row at once | not tested: same |
| **Change by rule**: filter, split, group, pivot, SQL formulas | not tested: time went to the prompt's checks | not tested: same |
| **Take away** to the clipboard, or "Run all rows in TamedTable Web" | not tested: no TamedTable equivalent in Excel | not tested: same |
| **Delete** a table; tables expire | not tested: the table stays in the user's workbook; what the add-ins keep was not checked | not tested: same |

## How the run worked

- **Hosts:** Excel for Mac with the ChatGPT side panel (GPT-5.6 Terra) and the Claude side panel (Opus 5.5), side by side. Every check used a fresh workbook and a fresh chat, except C3 and C4, which continue C2's workbook as the prompt asks.
- **Loading:** each fixture became an `.xlsx` with every cell stored as Text, built with a short openpyxl script instead of clicking through Data > From Text/CSV. The effect is the same: no date is rewritten. The one exception is C4's extra sheet, pasted from such a workbook into a Text-formatted sheet.
- **Exports:** File > Save As > CSV UTF-8, after every step that changed data. That format saves only the active sheet.
- **Acting as the user:** prompts sent word for word, questions answered "Use your best judgment.", edit-permission prompts answered "Allow once". The only follow-up was T7's "judge every row yourself", sent to ChatGPT only, because Claude had already judged each row.
- **Memory:** switched off before the first check and back on at the end; see [c0-memory](c0-memory/README.md). It did not cover Claude's saved skills: Claude's first cleanup answer began "The normalize-contacts skill matches this request", the skill Zel saved in the earlier T2 run.
- **Timing:** read from the clock between sending a prompt and the final answer, so each is rough.

## Needs a human

- **Claude's `/skillify` draft is waiting.** It proposes an update to Zel's `normalize-contacts` skill; Apply or Dismiss it in the Claude panel of the `claude-same-cleanup` workbook. The run did not apply it.
- **Claude's C2 score had help.** Zel's saved `normalize-contacts` skill shaped the phone and country steps. To test Claude as a truly new user, turn that skill off and rerun C2.
- **Excel is still open** with the test workbooks (all copies in a scratch folder, none of Zel's files). Close them without saving.
- The phone (T10) and licence questions stay with Zel, as [analysis.md](../2026-09-25-zel-testing-t1-t2/analysis.md#next) says.
