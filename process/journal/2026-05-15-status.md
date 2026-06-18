# WoZ/SCRIBE UX overhaul + spec/impl sweep — Status Report

**Date:** 2026-05-15

Drove WoZ from a real CSV through three columns of normalization, hit ~five spec gaps along the way, and rewrote the WoZ/SCRIBE persona-switch model after two failed UX experiments. The cumulative spec change ripples into `behavior.md`, the two persona prompts, README, the CLI implementation, and four Gherkin scenarios. Gated by `bun x tsc --noEmit`, 29 unit tests, and 13 `@offline` cucumber scenarios at the end.

## Spec gaps captured by WoZ (behavior.md)

| Gap surfaced in WoZ | Spec edit |
|---|---|
| `:load` success message was unpinned ("loaded confirmation"). | Pinned to `Loaded <path> (N rows, M cols)`, no column names, followed by the table. |
| Behavior was silent on which events reprint the table. | New rule: reprint after every state-changing event (NL request, `:load`, `:undo`); never after non-state-changing slash commands or failed requests. |
| No pagination rule. | 10 rows per page (`REPL_PAGE_SIZE = 10` in code-contract); truncated edges render `...{N} more rows.` marker rows. |
| CSV whitespace ambiguous around unquoted fields. | Pinned: trim unquoted leading/trailing whitespace; preserve quoted fields verbatim. Aligned `csv-parse` config in code-contract (`trim: true`). |
| `:load @file.csv` semantics undefined. | `@` is taken as a literal filename char, not a Claude-Code-style file reference. |
| `:undo` pops only "the last transformation" — broken for the "add column X with computed value Y" two-op patch pattern. | `:undo` now pops the **entire last applied patch** — every transformation and column change introduced by the most recent user turn, as a single unit. |

No new types or signatures in code-contract; only the `csv-parse` trim option and `REPL_PAGE_SIZE` constant were pinned.

## REPL prefix change `/` → `:`

`/` is intercepted by Claude Code (and other CLI agents). The `>/` escape worked in WoZ but overloaded `>` with two meanings (REPL gate vs. SCRIBE invocation). Switching the REPL itself to `:` (sqlite/psql/vim precedent) removed the overload and let `>` become an unambiguous SCRIBE prefix.

Touched everywhere:

- **spec/behavior.md** — all `/cmd` strings → `:cmd`, "Slash commands" → "REPL commands".
- **src/packages/cli/index.ts** — dispatch keys, help text, error messages, startup banner.
- **src/packages/cli/slash.test.ts** — unit-test inputs and string assertions.
- **spec/test-cases/repl-commands.feature** — all scenarios + feature title + description.
- **spec/test-cases/cli-flags.feature** — `--help` output assertions.

The exported symbol `handleSlashCommand`, the `SlashHandler` type, the `SLASH` constant, and the filename `slash.test.ts` were **left unchanged** — internal-only, renaming cascades risk breaking test discovery, and the user-facing contract (the `:` prefix) is what matters. Flagged for a future hygiene pass.

## WoZ/SCRIBE persona-switch model

Old model: `scribe> <note>` switched persona for a session; `woz> <input>` switched back. Friction (users forget the prefix) + visual ambiguity (which block belonged to which persona).

New model — every HUMAN message is classified independently by its first char, no persistent persona:

| Prefix | Persona | Output style |
|---|---|---|
| `>` | SCRIBE (one-shot) | Markdown blockquote — each line prefixed with `> ` |
| `:cmd` | WoZ — deterministic REPL command | Fenced code block (terminal-shaped) |
| anything else | WoZ — default (patch mode for NL, deterministic for `execute`/`--flag`) | Fenced code block |

Visual symmetry: SCRIBE input and output are both `>`-prefixed; WoZ input and output both live in code-style framing.

Files touched: **ops/prompts/prompt-woz.md**, **ops/prompts/prompt-scribe.md**, **README.md** (routing table rewritten, three-row help-layers table dropped, `?` / `?help` mention removed since prompts said they weren't handled, post-commit-table-reprint rule cross-referenced).

## Two failed UX experiments (deliberately documented)

The persona-switch redesign was driven by trying — and rejecting — two other approaches first:

1. **File-based: `bin/woz` + `fswatch`/`tail -f` Monitor.** A shell script with a `>` prompt appended each line to `temp/woz-in.txt`; a `Monitor` tail watched it and woke Claude. End-to-end loop worked. Killed by: the artifact-preview pane in Claude Code doesn't auto-refresh on file change (must close/reopen), and each LLM turn is ~ten seconds + UI refresh friction = unusable.
2. **Web-based: Node server + Claude Preview MCP.** Mini HTTP server (`temp/server.js` + `temp/index.html`) served a terminal-style page with an input box; page polled `/output` every 600ms, server mirrored each `POST /input` to `temp/woz-in.txt` for the Monitor loop. Auto-refresh worked. Killed by: LLM-turn latency is structural; round-trip > 60s wall-clock made interactive use frustrating compared to inline replies in one chat thread.

Both files (`bin/woz`, `temp/server.js`, `temp/index.html`, `.claude/launch.json`) were created and used; `bin/` was deleted at the end. `temp/server.js`, `temp/index.html`, `.claude/launch.json` left in place (the launch config is one-line and a possible future surface).

A third experiment is staged for **claude.ai** (different product, different artifacts surface): `temp/terminal-woz-test.md` is a paste-ready prompt asking claude.ai to render a tic-tac-toe terminal artifact using `window.claude.complete()`. If claude.ai's artifacts can host a terminal-style UI with sub-second LLM round-trips, the same pattern generalizes back to TamedTable WoZ.

## Verification

| Check | Result |
|---|---|
| `bun x tsc --noEmit` | clean |
| `bun run test:offline` (unit + `@offline` cucumber) | 29 / 29 unit, 13 / 13 scenarios |

Live cucumber (`@headless` + `@cli` against the Anthropic API) not re-run — the `/` → `:` change is in a CLI string surface, not in any LLM-facing prompt or batch protocol, and the offline suite exercises both the parser and the Gherkin assertions end-to-end.

## Not changed (deliberately)

- **`src/packages/cli/slash.test.ts` filename** and internal symbols (`handleSlashCommand`, `SlashHandler`, `SlashCommandAction`, `SLASH` constant, `// ── Slash commands ──` divider) — purely cosmetic, renaming risks test-discovery breakage. Flagged for a hygiene-only pass.
- **`spec/test-cases/cli-flags.feature` scenario name "bare 'help' subcommand also prints usage"** — the bare `help` is a CLI-invocation flag (alongside `--help`/`-h`), not a REPL command. Unrelated to the `/` → `:` change.
- **`temp/server.js` + `temp/index.html` + `.claude/launch.json`** — staged in case the web-shell experiment is revisited; not on any production path.
