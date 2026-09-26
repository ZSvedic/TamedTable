# Decision: drop TamedTable MCP

Zel decided on 2026-09-26 not to build TamedTable MCP as planned in [mcp-product-plan.md](2026-09-24-mcp-app/mcp-product-plan.md). The ChatGPT and Claude add-ins for Excel already cover its main use cases, and the gaps they have left are the kind their makers will close.

## What the evidence was

Two rounds of testing, both in this journal:

- [Zel's T1 and T2 run](2026-09-25-zel-testing-t1-t2/zels-testing.md) and its [analysis](2026-09-25-zel-testing-t1-t2/analysis.md): rule cleanup is commodity, and the Excel add-ins are the real competitor.
- [The E0 Excel autopilot run](2026-09-25-e0-excel/README.md): each promise of the plan checked in Excel + ChatGPT (GPT-5.6 Terra) and Excel + Claude (Opus 5.5). Neither covered everything, but Claude came close: it loaded a URL, cleaned by rule, answered questions without touching the table, undid a middle step, saved a reusable skill, and judged all 1,821 videos at 93.1%.

## Why the remaining gaps do not justify a product

The E0 run left four things TamedTable did better. None holds up:

- **Accuracy when judging every row.** ChatGPT ran on GPT-5.6 Terra, the model a 20-euro plan allows, not the strongest one. Claude already reached 93.1% against TamedTable's 95%+. Stronger models will close the gap.
- **Undo.** ChatGPT's undo bugs (a reported undo that never reached the sheet, Cmd+Z that scrambled rows) look like fixable early-version bugs. Claude's undo already works. Undo alone is too small to be a product.
- **Marks on changed cells.** Excel was built for people, so it has no marks for agent edits yet. Microsoft or the add-in makers can add coloured marks for agent changes at any time.
- **Distribution.** The add-ins run inside the grid people already use. An MCP app inside a chat would have to beat that as well as match the features.

## What is left, and where it belongs

One gap does not depend on the competitors catching up: a cleanup that runs as a repeatable job, with no person and no spreadsheet, for example every week on a new export, from a script, a server or CI. Both add-ins hand over scripts that only run inside Excel (an Office Script and a VBA macro, see [C4](2026-09-25-e0-excel/c4-recipe/README.md)).

That need belongs to the TamedTable CLI and Web app and their `.flow` recipe, not to an app inside ChatGPT or Claude. Whether people would pay for it is a separate question that these tests do not answer.

Two smaller gaps also do not need an MCP app: files past Excel's limit of about 1 million rows, which code tools such as Claude Code already handle, and people without Excel, whose competitor is Gemini in Google Sheets (not tested).

## Limits of the evidence

- One run per host, one day, one set of fixtures.
- Claude's cleanup had help from a skill Zel saved earlier with `/skillify`; memory off does not switch saved skills off.
- ChatGPT's panel Undo button appeared after some changes and not others; the trigger was not found.
