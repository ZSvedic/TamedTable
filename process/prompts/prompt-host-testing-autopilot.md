# Autopilot: do the Excel add-ins already cover TamedTable MCP?

You are running in the Claude desktop app on a Mac, with control of the screen. You test the ChatGPT and Claude add-ins inside Excel against everything TamedTable MCP plans to offer, and mark each promise covered, partly covered or not covered. If both add-ins cover everything, Zel drops the MCP app, so a wrong "covered" costs as much as a wrong "not covered".

**Do not ask the human to click anything.** If a step truly needs them (a sign-in, a payment prompt), write it under "Needs a human" in the summary and move on.

## Read first

1. `process/journal/2026-09-24-mcp-app/mcp-product-plan.md`, section "What the first release does": the promises you test.
2. `process/journal/2026-09-24-mcp-app/host-testing-plan.md`: the task wording. Its quoted prompts are the ones you send.
3. `process/journal/2026-09-25-zel-testing-t1-t2/zels-testing.md` and `analysis.md`: what Zel already found, and the folder format to copy.

## Hosts and setup

The two hosts are **Excel + ChatGPT** and **Excel + Claude**, each in the Excel side panel. Start a fresh workbook and a fresh side-panel chat for every task. Write down the model each panel shows.

Opening a CSV directly in Excel rewrites dates (`1990-01-01` becomes `1/1/90`). Load every fixture with Data > From Text/CSV and set every column to Text. "Attach" means the loaded sheet; "export" means File > Save As > CSV UTF-8. Fixtures live in `spec/test-cases/`, T7's labels in `benchmarks/ground-truth/`.

Work on branch `claude/confident-goodall-2ys4ws`. Run `git pull` before you start.

## Step 0: memory off

A host that remembers an earlier task is no longer a new user, and its reuse or undo can look better than it is. In Chrome, before any task:

- chatgpt.com: Settings > Personalization > Memory. Note both toggles, then turn off "Reference saved memories" and "Reference chat history".
- claude.ai: Settings > Memory (or Capabilities). Note both toggles, then turn off "Search and reference chats" and "Generate memory from chat history".

Only flip toggles. Never click delete, clear, reset or "manage memories". Take a screenshot of each page before and after. The last step of the run puts every toggle back the way you found it, even if you stop early.

## Checks, in order

Each check tests one promise from the plan. Stop at a pushed commit if time runs out.

1. **Judgment on every row (T7).** Keep every exported version. Score each with `python3 process/journal/2026-09-24-mcp-app/score_music.py benchmarks/ground-truth/music-labels.jsonl <csv>`. Record whether it judged rows or used rules, how many rows it covered, whether it showed progress, and seconds taken. Above 95% is TamedTable level.
2. **Change by rule, with changed cells marked (T2).** Send the four cleanup prompts one at a time. After each, export the sheet and screenshot it. Record whether changed cells are marked. Score the final CSV against `cleanup-expected.csv`: mismatched cells per column, phones equal when they differ only by spaces, dashes or brackets.
3. **Undo any step (T3),** in the same workbook. Send "undo the country change" (not the last step), then "show me the table as it was right after the phone step". Compare both with the exports from check 2. Then type a new value into one cell by hand, ask for one more change, undo that change, and record whether your hand edit survived. Try the panel's Undo button and Excel's Ctrl+Z too.
4. **A recipe that replays outside the host (T5),** in the same workbook. Load `customers-missing-phone.csv` and send "Apply exactly the same cleanup to this file." Then send "Give me the steps as a script I can run myself." Run the script with `python3` on `customers-missing-phone.csv` and diff its output against the add-in's. Record whether either invents phones. In Excel + Claude, also try `/skillify` in a fresh workbook.
5. **Find problems and answer questions without changing the table (T6).** Count which of the six planted anomalies each host names. Then load `customers-input.csv` and ask "How many customers are in each country?" Record whether the sheet changed.
6. **Open from a URL (T9).** Send "Load this CSV and show me the first 5 rows: https://raw.githubusercontent.com/ZSvedic/TamedTable/main/spec/test-cases/customers-input.csv".
7. **Dedupe (T2 second part)** on `dedupe-input.csv`. The expected result has 6 rows out of 10.
8. **Big file (T8),** only if time is left: `showcase-lazy-input.csv`, 25,000 rows.

How to act as the user: send each quoted prompt word for word and wait for the answer. Send a follow-up only where the plan gives one (T7's "judge every row yourself"). If the host asks a question, answer "Use your best judgment." and record the question. Never correct, hint or retry: a wrong result is the data.

## Output

Write to `process/journal/<today>-e0-excel/`, one folder per check, the way Zel did:

```
README.md              the coverage table and the answer
c1-judgment/
  README.md            one bullet list per host: what happened, method, seconds, score
  chatgpt-v1.csv
  claude-v1.csv
  claude-progress.png
```

Every claim needs a screenshot, an exported file or a copied line of host text behind it. The top-level `README.md` holds one table: a row per promise from the plan, a column per host, each cell "covered", "partly" or "not covered" with a one-line reason and a link to the evidence. Add rows for the promises you could not test, marked "not tested", with the reason.

## Rules

- Change nothing outside that folder.
- Commit each finished check separately and push to `claude/confident-goodall-2ys4ws`. Do not open or merge a pull request.
- Write the way `spec/writing-style.md` asks: plain words, active voice, no em dashes.

## Closing summary in the chat

1. The coverage table.
2. One sentence: which promises, if any, neither add-in covers.
3. Confirmation that every memory toggle is back as you found it, with the after screenshots.
4. Anything under "Needs a human".
