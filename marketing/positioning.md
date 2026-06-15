# Positioning

What TamedTable is, who it's for, and why it's different — the brief every other marketing doc derives from. It owns the message, not the visuals (those are [design/brand/brand.md](../design/brand/brand.md)) and not the product details (those are [spec/rationale.md](../spec/rationale.md)).

## The one-liner

**TamedTable is ETL you drive in plain language — load a table, say what you want, and it builds a spec you can replay forever.**

## Who it's for

Two audiences, led by the first:

- **Data engineers and analysts** who write ETL today and are tired of brittle one-off scripts. They adopt the tool, trust it because the output is inspectable and replayable, and tell their teams.
- **Non-technical data owners** — ops, finance, research — who have messy CSVs and no desire to learn Pandas. They get the result by asking, not coding.

The wedge is dev-first: win the people who can judge the output, and the rest follow.

## The problem

Cleaning real-world tables is still either tedious or technical. The plain-language summary of [spec/rationale.md](../spec/rationale.md#problem):

- Every powerful tool — SQL, regex, sed, awk, Pandas — is a language you have to learn first.
- So most people fall back to Excel: easy, but inadequate and proprietary.
- AI chatbots can write the code, but non-programmers can't spot the bugs, maintain it, or manage its dependencies.

The gap: you can *describe* the transformation you want long before you can *write* it.

## What we do about it

TamedTable closes that gap. You see your data on screen and say what to do; the LLM writes a small JSON spec, and a plain runtime replays that spec against the rows. The code stays hidden; the spec stays yours.

It runs as a CLI you script and a web app you click — both on the same engine — and any saved flow replays with no LLM and no app at all.

## Why it's different

- **You keep the recipe, not the code.** Every turn produces a replayable spec, not a throwaway script you can't read. Save it, version it, run it tomorrow against new data with zero API calls.
- **Cost stays flat as data grows.** The per-turn token cost is constant no matter how big the table is — the model edits the spec, it never reads the whole table. (The wire-protocol idea behind this is in [spec/behavior.md](../spec/behavior.md#data-model).)
- **Inspectable, not a black box.** Engineers can read the spec and the per-row diffs, so they trust the result instead of guessing.
- **Same engine, three surfaces.** Prototype in the web UI, ship it as a CLI command or a standalone Python export — no rewrite.
- **Open source.** No lock-in, no proprietary format.

## Proof points

- Type *"normalize phone numbers"* and watch each cell change, with the before/after shown per row.
- Save a flow once, replay it on a new CSV with one command and no model call.
- Export the flow as a standalone Python script — the recipe outlives the tool.
