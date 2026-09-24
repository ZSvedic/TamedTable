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
- **Everything else replays.** Questions stay the recorded planner's (E1 grades changes only). Cell calls replay from the cassette; when a new plan asks the cell model something the cassette never recorded, the call goes live on the Gemini cell model and the scenario is marked as having live calls.
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

## Layout

```
mcp-e1/
├── README.md     This file: method.
├── runs/         One JSONL per run, one record per scenario (every attempt, the recorded plan, the verdict inputs).
└── report.md     Generated by bench:e1:report: summary table, then every failure.
```
