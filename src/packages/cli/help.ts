// The two usage screens: CLI_USAGE_TEXT for `--help`/`-h`/`help`, HELP_TEXT
// for the REPL's `:help`. See behavior.md §CLI/Discovery.

export const CLI_USAGE_TEXT = `tamedtable — work tables in your terminal with natural-language requests.

Usage:
  tamedtable <input>                 Open <input> in the interactive REPL.
                                     <input> is a .csv or .jsonl file.
                                     Once inside, type :help for commands.
  tamedtable execute <flow>          Replay a saved .flow against an input.
                                     No LLM call; no API key needed.
    --input  <file>                  Source .csv or .jsonl. Overrides the
                                     source path recorded in <flow>.
    --output <file>                  Destination .jsonl. Required.
  tamedtable --help, -h, help        Show this usage screen.
  tamedtable --version, -v           Print the version and exit.

The REPL needs ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or
OPENROUTER_API_KEY in env.
`;

export const HELP_TEXT = `TamedTable — interactive table editor. Natural-language requests edit the
spec; results stream in. The table reprints after any state or viewport
change.

State / data commands:
  :load <path>       Load CSV/JSONL/Parquet/Arrow as new input. Resets
                     transformations, viewport, cache.
  :save <path>       Write current rows (CSV/JSONL/Parquet/Arrow by ext).
  :save-flow <path>  Write current spec as a .flow file.
  :save-py <path>    Write current flow as a standalone Python script.
  :reorder <cols>    Reorder columns (comma/space separated); sets the table
                     view and CSV/JSONL output column order.
  :undo              Pop the last applied patch.
  :redo              Replay the last :undo'd patch.
  :history           Print the patch journal.

View / navigation:
  :show [rows|cols start|prev|next|end|{N}]
                     Move viewport on the named axis, or jump to row/col N.
                     Bare :show reprints the current viewport.
  :viewport [<R>|auto] [<C>|auto]
                     Pin viewport page size; auto re-fits to terminal.
                     Bare :viewport prints current size and source.
  :find {<substring>|/<regex>/}
                     Case-insensitive search; viewport snaps to the first
                     match and the reprint wraps it in *asterisks*.

Inspection / session:
  :schema            Print the current column list.
  :help              Show this usage screen.
  :exit              Quit (also: bare "exit").

Anything not starting with ":" is sent to the spec editor as a natural-
language request — e.g. "normalize phone numbers", "sort by DOB desc".
Requests are additive; use :undo to revert the last one.

Ctrl-C: cancel in-flight request, or quit when idle. Requires
ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or
OPENROUTER_API_KEY in env.
`;
