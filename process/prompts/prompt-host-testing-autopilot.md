# Autopilot: finish the E0 host tests

You are running in the Claude desktop app on a Mac, with control of the screen. You finish the manual host tests Zel started: you act as the user in four AI hosts, record what each one actually does, and score the results with scripts. You judge nothing by eye that a script can count, and you never help a host do better.

**Do not ask the human to click anything.** If a step truly needs them (a sign-in, a payment prompt), write it under "Needs a human" in the summary and move on.

## Read first

1. `process/journal/2026-09-24-mcp-app/host-testing-plan.md`: the task wording. Its quoted prompts are the ones you send.
2. `process/journal/2026-09-25-zel-testing-t1-t2/zels-testing.md` and `analysis.md`: what is done, what is scored, and the folder format to copy.

## Setup Zel does before leaving

- Chrome with tabs signed in to chatgpt.com and claude.ai. **Memory off** in both (ChatGPT: Settings > Personalization; Claude: Settings > Capabilities), so no chat learns from an earlier test.
- Excel with the ChatGPT and Claude add-ins installed and signed in.
- The repo cloned locally and checked out on a working branch.
- Model and plan names written down for each host.

## Hosts

| Host | Where |
|---|---|
| ChatGPT web | chatgpt.com, fresh chat per task |
| Claude web | claude.ai, Chat mode (not Cowork), fresh chat per task |
| Excel + ChatGPT | Excel side panel, fresh workbook per task |
| Excel + Claude | Excel side panel, fresh workbook per task |

Opening a CSV directly in Excel rewrites dates. In Excel, load every fixture with Data > From Text/CSV, set every column to Text, then start the task. Where a task says "attach", Excel hosts use the loaded sheet and "export" means File > Save As CSV UTF-8.

## Tasks, in order

Do them in this order and stop at a pushed commit if time runs out. Fixtures live in `spec/test-cases/`, T7's labels in `benchmarks/ground-truth/`.

1. **T7, judgment on 1,821 rows**, all four hosts. The most important task: it tests the gap every other result leaves open. Keep every exported version. Score each with `python3 process/journal/2026-09-24-mcp-app/score_music.py benchmarks/ground-truth/music-labels.jsonl <csv>`.
2. **The customers chain: T2, then T3, T4 and T5 in the same chat or workbook**, all four hosts. Zel's T2 chats are not reusable, so start fresh.
   - T2: send the four cleanup prompts. After each one, export or screenshot the whole table, so T3 has the states to check against. Score the final CSV against `cleanup-expected.csv`: mismatched cells per column, phones equal when they differ only by spaces, dashes or brackets.
   - T3: in Excel, also try the host's own Undo button and record which states it can reach.
   - T4: chat hosts only.
   - T5: in Excel, `/skillify` counts as the host's recipe. Test whether the saved skill reproduces the cleanup on `customers-missing-phone.csv` without inventing phones.
3. **T6, find problems**, all four hosts. Count which of the six planted anomalies each host names.
4. **T2 dedupe**, chat hosts only.
5. **One T1 check** in ChatGPT web: open the spreadsheet panel of a generated CSV, type into a cell, and record whether the value changes and whether the chat sees it.

Skip T8, T9 and T10.

## How to act as the user

- Send each quoted prompt word for word, one at a time. Wait until the host finishes before the next one.
- Send a follow-up only where the plan gives one (T7's "judge every row yourself"). If the host asks a question, answer "Use your best judgment." and record the question.
- Never correct, hint or retry. A wrong result is the data.
- Time each prompt from send to finished answer, in seconds.
- Record the method: code, the model's own judgment, Excel formulas, or a mix. Quote the host's own words where it says.

## Output

Write to `process/journal/<today>-e0-autopilot/`, one folder per task, the way Zel did:

```
t7-music/
  README.md          one bullet list per host: what happened, method, seconds, score
  chatgpt-web-v1.csv
  claude-excel-v1.csv
  claude-web-rows.png
```

Every claim in a README needs a screenshot, an exported file or a copied line of host text behind it. Name files `<host>-<what>.<ext>`. Add a top-level `README.md` with one table: a row per task, a column per host, a short result in each cell, and links to the task folders.

## Rules

- Change nothing outside that folder. Do not edit `host-testing-plan.md` or Zel's folder.
- Commit each finished task separately and push to the working branch. Do not open a pull request.
- Write the way `spec/writing-style.md` asks: plain words, active voice, no em dashes.

## Closing summary in the chat

1. The top-level table.
2. For T7: did any host judge all 1,821 rows, and at what score? Above 95% is TamedTable level.
3. For T3 and T5: which hosts kept real versions and a working recipe, and which rebuilt them from memory.
4. The single most surprising thing you saw, and anything under "Needs a human".
