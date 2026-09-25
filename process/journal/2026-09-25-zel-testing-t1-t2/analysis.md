# E0 so far: what T1 and T2 tell us

This note scores Zel's T1 and T2 run against the fixtures and says what it means for the [product plan](../2026-09-24-mcp-app/mcp-product-plan.md). It does not repeat Zel's notes: read [zels-testing.md](zels-testing.md) first.

## Scores

Each exported CSV compared cell by cell with `spec/test-cases/cleanup-expected.csv`. Phones count as equal when they differ only by spaces, dashes or brackets.

| Host | Country | Phone | Names (I003, I008, I009) | DOB |
|---|---|---|---|---|
| ChatGPT web | 20/20 | 19/20 | Mcdonald, Van Der Berg, O'neil | not asked |
| Claude web | 20/20 | 19/20 | McDonald, van der Berg, O'Neil | not asked |
| Excel + ChatGPT | 20/20 | 19/20, 2 flagged | Mcdonald, Van Der Berg, O'Neil | 17/20 |
| Excel + Claude | 20/20 | 19/20, new column | McDonald, van der Berg, O'Neil | ruined by Excel |

- **The one phone miss is the same everywhere.** I006 `555-4321` has no area code. The golden leaves it blank. Three hosts wrote `+15554321`; Excel + ChatGPT left it and flagged it. Flagging is the better behaviour.
- **Excel + ChatGPT did dates on its own suggestion.** The 3 misses are `NA` and `-`, which it kept for review (the golden blanks them), and I013, which it left unparsed.
- **Excel damaged the data before any AI touched it.** Opening the CSV turned `1990-01-01` into `1/1/90` and dropped I013's leading quote. The Excel + Claude export carries those two-digit years.
- **The golden leaves names lowercase**, so the names column is judged by hand: Claude got all three right in both places, ChatGPT got none right in chat and one in Excel.

## What this already decides

1. **Rule cleanup is commodity.** Four hosts, four good results on countries and phones. TamedTable cannot sell "cleans your phone numbers" against ChatGPT or Claude. Its case has to rest on what T3, T5 and T7 test: undo, reuse and judgment on every row.
2. **Chat hosts have no live grid.** Claude web's artifact is editable but disconnected from the chat, and Claude web kept showing the old table after a change. That stale view is the prototype's lost-edit problem, and the server-held table in the plan fixes it.
3. **The Excel add-ins are the real competitor, and the plan does not name them.** They already have a live grid, a one-click Undo per change, highlighted cells for review, a reusable skill (`/skillify`) and Python export. That covers most of the rationale's list of "what they lack". What they have not shown yet is judgment on all 1,821 rows (T7) and a recipe that replays outside Excel.
4. **T9 is answered.** Both chat hosts loaded the fixture from its raw GitHub URL in T1.

## Open

- ChatGPT web shows a spreadsheet panel with a formula bar ([screenshot](chats-after-normalize-phones.png)). Zel found the table read-only; check whether typing in that panel edits the cell.
- Not run yet: the date step and dedupe in T2, then T3, T4, T5, T6 and T7. T7 matters most, because judgment on every row is the gap left after point 3.

## Next

Run the rest with a desktop agent, using [prompt-host-testing-autopilot.md](../../prompts/prompt-host-testing-autopilot.md), in Zel's format: one folder per task with screenshots, exported files and a markdown file that links to them. Add Excel + ChatGPT and Excel + Claude as hosts for T3, T5, T6 and T7. Skip T10 (phone): a desktop agent cannot run it.
