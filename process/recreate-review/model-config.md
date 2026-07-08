# model-config — keep the code, adopt the recreate's tests

Compares `src/packages/model-config` here (61 KB) with the recreate's (42 KB).
This is the one package where the recreate genuinely improved something: its
feature file.

## Analysis

Worth adopting from the recreate:

- **Test scenarios.** Its feature file covers things `spec/behavior.md` already
  promises but the original never tests: the legacy `tamedtable.apiKey` key
  migration, the per-provider default model table, per-Mtok prices shown in the
  chooser, cross-provider model coercion, choices surviving a reload, the
  env-var hint under the key field.
- **`models.json` layout.** It stores a per-model `temperature` flag in the
  data; the original hardcodes a model-name prefix list in code.

Worse in the recreate, not to be copied: a plain-DOM chooser where the spec
requires the React component, the live-LLM and voice demo files deleted, and
one behavior drift — `TAMEDTABLE_MODEL` set to another provider's model is
trusted as-is, while the original coerces it to the provider default like any
stored model.

## Questions for you

- [ ] `TAMEDTABLE_MODEL` names a model from a different provider than the one
      selected: coerce to the provider default (original, current) or trust the
      env var (recreate)? Answer:

## Plan

1. Copy the recreate's added scenarios into
   `spec/packages/model-config/model-config.feature` and write step defs. They
   describe behavior the original already has, so they should pass right away —
   any red one is a real bug, report it.
2. Move the temperature flag into `models.json` and delete the prefix list.
   Pure refactor, suite stays green.
3. Write the env-var answer into `spec/code-contract.md` plus one scenario. If
   the answer is "trust the env var", that is a behavior change: red first.
