# I/O Phase 0 — cleanup before formats land

A refactor that has to happen before [io-roadmap.md](io-roadmap.md) Phase 1. It
moves every format codec into `file-io` behind a load-on-demand registry and
makes `core` depend on `file-io`, not the reverse. It changes no user-visible
behavior — CSV and JSONL load and save exactly as today — it only moves where
the code lives so new formats plug in as one file each.

## Why now

Today the format logic is fused into `core` and reached through a fake
filesystem:

- `loadCsv`/`loadJsonl`/`writeRows` (`core/index.ts`) take a **path**, read it
  with `node:fs`, then parse. Byte-acquisition and format-codec are one unit.
- The browser can't call a path-based loader, so the web app keeps an in-memory
  `Map<path, text>` (`web/src/shims/fs-promises.ts`) and writes picked text into
  it by path just so `core`'s loader runs unchanged.
- `file-io` only produces `{ name, text, format }` and never touches rows.

So a parser that needs no filesystem is reached through a filesystem shim, and
the package named `file-io` doesn't own file IO. Phase 1 also breaks the current
seam outright: Parquet, Arrow, Avro are **binary**, but `PickedFile` is
text-only — and those formats are read through [DuckDB-Wasm](io-roadmap.md), not
bespoke parsers, so the registry must hand a codec raw **bytes**, not text.

## Target shape (option D)

`file-io` owns every codec in a registry; `core` calls into it. The cycle that
blocks this — `file-io` needs the `TablePlan` type from `core`, `core` would need
codecs from `file-io` — is cut by moving the model out of `core` into a new
zero-dependency base package both can import.

```
@tamedtable/table-plan  (new)  Row, TablePlan, Expr, TablePlanSchema, validateTablePlan, FormatCodec
        ▲      ▲
        │      └────────────── @tamedtable/file-io   codec registry, dialogs, fetch
        │                              ▲
        └────────── @tamedtable/core ──┘   engine; byte-acquisition (node:fs) only
```

A clean DAG: `core → file-io → table-plan`, `core → table-plan`. No cycle.

### FormatCodec

One stateless object per format, lazy-loaded where the engine is heavy:

```
interface FormatCodec {
  id: string                 // "csv", "jsonl", "parquet", …
  extensions: string[]       // [".csv"]
  contentTypes: string[]     // ["csv"]
  parse(bytes, name)   → { rows: Row[]; columns: string[] }
  serialize(rows, columns) → Uint8Array
  load?: () => Promise<…>    // dynamic import() of the parser / engine
}
```

Two codec families share this one interface:

- **Pure-JS** — `csv` / `jsonl`, using `csv-parse` and native `JSON.parse`. The
  golden path; never pulls wasm.
- **DuckDB-backed** — Parquet / Arrow / Avro / Excel, delegating `parse` to a
  shared DuckDB reader (`registerFileBuffer` → `read_parquet`/…). These all
  share one lazy `load?()` that pulls duckdb-wasm. See
  [io-roadmap.md](io-roadmap.md).

New format = one codec file + one registry entry. `detectFormat` becomes a
lookup over the registry instead of a hand-written `if` ladder.

**Scope line:** Phase 0 is behavior-preserving plumbing — it builds the registry,
the `Uint8Array` seam, and the pure-JS codecs, and it is parser-agnostic.
*Wiring duckdb-wasm into the browser and registering the DuckDB-backed codecs is
Phase 1* (it adds a dependency and re-enables web `{sql}`, both user-visible).

## Steps

Each step follows the [workflow rule](../../../CLAUDE.md#workflow-rule--changing-a-component):
spec → Gherkin → step defs → red → green. **Land all five steps in a single
PR** — they build on each other; commit per step for a clean history, but don't
cut a PR between them. `cd src && bun run test` must be green before opening it.
Steps 1–2 are pure moves (behavior held constant); the package-API surface
shift is recorded in `spec/code-contract.md`.

1. **Extract `@tamedtable/table-plan`.** Move `Row`, `Expr`, `Transformation`,
   their schemas, `TablePlan`, `TablePlanSchema`, `validateTablePlan` out of
   `core` into the new package. `core` **re-exports** them, so all 26 existing
   `from '@tamedtable/core'` imports keep working untouched. `file-io` repoints
   its `TablePlan` import to `@tamedtable/table-plan` and drops its `core`
   dependency. This alone breaks the cycle structurally.

2. **Move codecs into `file-io`, `core` consumes them.** `core`'s
   `loadCsv`/`writeRows` keep their path signatures and `node:fs`, but delegate
   parse/serialize to `file-io`'s registry. The `csv-parse`/`csv-stringify`
   dependencies move from `core` to `file-io`. Now `core → file-io`. Codecs
   lazy-load.

3. **Delete the web fs-shim.** Add a rows-based load seam to the headless
   `Runner` (`loadParsed(rows, spec)` beside `loadInput(path)`); the web app
   parses through `file-io` and loads rows directly. Removes
   `web/src/shims/fs-promises.ts` and the path round-trip in `controller-files.ts`.

4. **Widen the seam to `Uint8Array`.** `PickedFile`/`FetchedTable` carry bytes;
   text codecs decode internally. This is what lets Phase 1's binary formats in.

5. **Per-format spec files.** Split this package's `behavior.md`: the top level
   owns the shared contract (codec interface, registry, detection, dialogs);
   `formats/csv.md` and `formats/jsonl.md` own per-format quirks. Update the
   stale "does not own engine IO (`loadCsv`/`writeRows` live in core)" line in
   `behavior.md` — after step 2 it's false.

After the PR lands, every roadmap format is a pure registry addition: a codec
file, a `formats/<name>.md`, a registry row.

## Base package name — settled

`@tamedtable/table-plan`, exporting `TablePlan` (the declarative table
definition formerly named `Spec`), `TablePlanSchema`, and `validateTablePlan`.
The type was renamed away from `Spec` to end the clash with the `spec/` docs
tree; `table-plan` follows the type. The on-disk `.flow` format is unchanged —
its wire key stays `spec`, so existing flows keep loading.
