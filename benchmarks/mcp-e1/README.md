# E1: can the chat model write good recipe steps?

In TamedTable MCP the chat app's own model (Claude, ChatGPT) writes the recipe steps that TamedTable's planner writes in Web today. E1 measures how well it does that, before anything gets built on the assumption. The question and what it decides come from the [product plan](../../process/journal/2026-09-24-mcp-app/mcp-product-plan.md#experiments); this directory holds the data and results. The runner is code, so it lives under `src/`: [`src/packages/bench/e1/`](../../src/packages/bench/e1/).

## How it works

E1 reuses the test suite. Every Gherkin scenario already says what a request should do to a table, so E1 runs those scenarios again with one change: a stand-in chat model answers every "change the table" turn instead of the recorded planner, and the scenario's own `Then` steps decide whether the result is right.

```
scenario step "When query 'sort by revenue, top 10'"
  → headless runner asks its model to change the table
  → E1's fetch wrapper catches the call
      stand-in chat model: host prompt + MCP server instructions + apply_plan tool
      sees the recipe the way MCP shows it (a show_table result), writes apply_plan
      the MCP server's check (the same schema check headless uses) refuses bad plans,
        and the model retries with the error, up to 4 attempts per request
  → the runner runs the plan as if its own planner wrote it
scenario steps "Then …" grade the result
```

- **What the stand-in sees.** A short host system prompt, then TamedTable's server instructions, then the conversation. The table is shown as a `show_table` tool result carrying the recipe, the same view headless gives its planner: columns and steps, no rows. The conversation continues across the requests of one scenario, like a chat.
- **Engine refusals.** A plan that passes the schema can still fail when it runs (a validate reading a missing column, a failed threshold). The runner sends it back as it always does; E1 hands that error to the stand-in as apply_plan's answer, and the retry counts as an attempt.
- **Everything else replays.** Questions and spoken requests stay the recorded planner's (E1 grades typed changes only: a chat app transcribes speech before any tool call). Cell calls replay from the cassette; when a new plan asks the cell model something the cassette never recorded, the call goes live on the Gemini cell model and the scenario is marked as having live calls.
- **Each scenario runs once**, on the first surface it is tagged for: web, then headless, then CLI.

## The two conditions

The plan asks whether the chat model needs TamedTable's planner knowledge, or whether the tool schema alone is enough.

| `E1_VARIANT` | Server instructions |
|---|---|
| `schema` | The short `MCP_INSTRUCTIONS` text only. The model learns the step grammar from apply_plan's JSON Schema. |
| `planner` | The same text plus the trimmed planner prompt: rules, spec shape, grammar, expression shapes and the change few-shots from `SYSTEM_PROMPT`. |

Both come from [`spec/prompt-app-edit.md`](../../spec/prompt-app-edit.md) § `MCP_INSTRUCTIONS`; the tool schema is `@tamedtable/mcp-server`'s `apply_plan`.

## Running it

All commands run from `src/`. A run makes live calls and needs `OPENAI_API_KEY` (plain model ids) or `OPENROUTER_API_KEY` (ids with a vendor prefix, such as `anthropic/claude-sonnet-5`). Cell calls that go live use `GEMINI_API_KEY`.

```
E1_MODEL=gpt-5.4-mini E1_VARIANT=schema bun run bench:e1   # one run → runs/gpt-5.4-mini-schema.jsonl
bun run bench:e1:report                                     # all runs → report.md
bun run bench:e1:report gpt-5.4-mini-schema                 # just one
```

`E1_RUN` names the run (default `<model>-<variant>`), `E1_MAX_ATTEMPTS` caps attempts per request (default 4), `TAMEDTABLE_FEATURES=sort,filter` narrows the scenarios. Don't run two at once: scenarios write their outputs under `temp/`. A re-run appends; the report keeps the last record per scenario.

## Reading the results

Each scenario that had at least one change turn gets one verdict. Scenarios with no change turn (CLI flows, UI checks) are not graded.

| Verdict | Meaning |
|---|---|
| Correct | The scenario passed. |
| Silently wrong | Every plan went through, and the data came out wrong. The failure that matters most: the user sees a result, and it is wrong. |
| Plan shape | Every plan went through, and the failing step checked the plan's shape ("the spec has 2 transformations"), not the data. A different valid plan fails it with the right rows, so read the plan. |
| Visible failure | The model gave up, answered in words, or ran out of attempts. The user sees nothing change. |
| Harness error | E1 itself failed. |

The recorded planner passes every scenario (CI replays it), so its silently-wrong rate on the same scenarios is zero. Two things make E1's count an upper bound: a live cell call can fail an exact-value check on its own, and some checks pin the recorded planner's wording. That is why [report.md](report.md) lists every failure with the plan the model wrote next to the one the recorded planner wrote. Read them before trusting a number.

"Invalid plans" counts attempts the schema or the engine refused; "retried turns" counts requests that needed more than one attempt; "prompt chars" is the host prompt, the server instructions and the tool schemas together.

## Results (2026-09-24)

**Answer: yes, hosted MCP needs TamedTable's planner knowledge, and it does not need TamedTable's planner model.** With the trimmed planner prompt in the server instructions, the two strong models (gpt-5.5, Claude Sonnet 5) wrote plans as good as the recorded planner's on the same scenarios: after reading every failure, none of theirs is a real silent error apart from one habit every model shares (below). With the tool schema alone, every model falls to roughly half right. The no-key rule holds: the prompt, not a second model, carries the knowledge.

| Model | Instructions | Correct | Silently wrong (raw) | Invalid plans | Prompt chars |
|---|---|---|---|---|---|
| gpt-5.5 | planner | 111 of 120 (93%) | 8 | 2 of 147 turns | 30,106 |
| Claude Sonnet 5 | planner | 107 of 120 (89%) | 10 | 6 of 147 turns | 30,106 |
| Claude Haiku 4.5 | planner | 106 of 120 (88%) | 12 | 10 of 143 turns | 30,106 |
| gpt-5.4-mini | planner | 98 of 120 (82%) | 21 | 5 of 144 turns | 30,106 |
| gpt-5.5 | schema | 59 of 119 (50%) | 52 | 25 of 133 turns | 8,675 |
| Claude Haiku 4.5 | schema | 58 of 120 (48%) | 49 | 60 of 132 turns | 8,675 |
| gpt-5.4-mini | schema | 54 of 120 (45%) | 54 | 62 of 131 turns | 8,675 |
| Claude Sonnet 5 | schema | 54 of 119 (45%) | 42 | 77 of 131 turns | 8,675 |

The full table, with plan-shape, visible failures and tokens, and every failure next to the recorded planner's plan, is in [report.md](report.md).

### What the raw "silently wrong" count holds

Most raw failures in the planner runs are the test suite checking the recorded planner's exact choices, not the data. Each of these fails with a plan a person would accept:

- **Pinned names.** The check expects the recorded column name: the model wrote `TicketLabel` or `Review_Summary` where the golden has `Label` or `Summary`, and nobody asked for a name.
- **A golden that contradicts the prompt.** *"split customers into men, women, and unknown"*: the prompt's rule says to use the user's labels verbatim, and every model wrote `men`/`women`. The Web golden holds `man`/`woman`, from the recorded planner breaking that rule.
- **Live cell text.** A new cell prompt goes live, and its answers ("Technology" vs "Software") differ from the recorded ones in exact-value checks.
- **Web-only checks.** *"Normalize the Country names. Which country has the most customers?"* expects the Web summary to quote the question back. In a chat app the model answers the question itself.
- **No query tool.** When a scenario has already left the tape, a follow-up question reaches the stand-in, which only has apply_plan, so it turns the question into a change.

Real errors, all from the two weaker models:

- **A cell prompt with no `{Column}` placeholder** (gpt-5.4-mini): every cell sees no input and comes back null. One plan fails seven lazy-exec scenarios.
- **Rules the prompt states and the model broke.** A `split` on `", "` for free-form addresses, which the prompt forbids (gpt-5.4-mini); an unpivot named `Quarter`/`Revenue` when the user asked for `name` and `value` (Haiku); a pivot that drops a column from its index (both).
- **Relaxing the user's limit.** Asked to reject the file if more than 20% of phones are empty, gpt-5.4-mini got "validation failed: 50% > 20%" back and raised the threshold to 60%, so the check passed. The strong models told the user instead.

One finding applies to every model: given a change and a question in one message, each one also grouped the table to answer the question, which throws the rows away. Headless's `SYSTEM_PROMPT` covers this under Questions, which the trim drops. `MCP_INSTRUCTIONS` should say to answer questions with query_table and never change the table to answer one.

### What it decides

- Ship the trimmed planner prompt as server instructions. It costs about 21,000 characters more per conversation than the schema alone, and roughly doubles the share of correct plans.
- A strong host model is as good as the Web planner. A weaker one (gpt-5.4-mini, Haiku) makes real silent errors in about 5 to 10 of 120 scenarios; the most common, a cell prompt without a placeholder, is a check the server can make before running a step.
- No paid fallback is needed, so nothing about the no-key rule or the scope needs revisiting with Zel.

### Caveats

- Credit ran out on both providers during the second pass (live-key and refusal fixes). For gpt-5.5 schema-only and the four Claude runs, scenarios the second pass could not rerun keep their first-pass record, which still carries those two harness bugs. That can only lower their scores.
- The runner's recovery budget (three tries) can end a request after the stand-in's last plan; E1 then counts that plan as committed. *"SQL scalar fills a new column"* is such a case: it reads as silently wrong but the request failed visibly.
- JavaScript steps were allowed, as in local mode. The hosted server will allow only declarative steps, so E1 should run again once the safe forms exist.

## Layout

```
mcp-e1/
├── README.md     This file: method.
├── runs/         One JSONL per run, one record per scenario (every attempt, the recorded plan, the verdict inputs).
└── report.md     Generated by bench:e1:report: summary table, then every failure.
```
