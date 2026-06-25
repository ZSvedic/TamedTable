// #DuckDB
// Browser adapter for `@duckdb/node-api`. The Vite build aliases the engine's
// `@duckdb/node-api` import to this file (see vite.config.ts), so the same
// `{sql}` code path in @tamedtable/headless runs in the browser on
// duckdb-wasm. It exposes the slice of the node-api surface the engine calls:
// `DuckDBInstance.create → connect → run / runAndReadAll(...).getRowObjects()`.
//
// The multi-MB wasm payload is pulled through a dynamic `import()` of
// ./duckdb-wasm-impl.ts, which Vite code-splits into its own chunk. Nothing
// here statically imports duckdb-wasm, so the CSV/JSON golden path — which
// never constructs a connection — never loads it. Spec:
// spec/code-contract.md § {sql} expression shape.

/** One result set, as the engine reads it: a plain row-object per row, with
 *  BIGINT columns left as `bigint` (the engine's normalizeSqlValue coerces). */
export interface DuckDBReader {
  getRowObjects(): Record<string, unknown>[];
}

/** The connection surface the engine uses (`@duckdb/node-api`'s `DuckDBConnection`). */
export interface DuckDBConnection {
  run(sql: string): Promise<void>;
  runAndReadAll(sql: string): Promise<DuckDBReader>;
  interrupt(): void;
}

/** What ./duckdb-wasm-impl.ts returns from createWasmInstance — kept as an
 *  interface so this module names no duckdb-wasm type and stays in the eager
 *  bundle. */
export interface WasmInstance {
  connect(): Promise<DuckDBConnection>;
}

/** Mirror of `@duckdb/node-api`'s `DuckDBInstance`: a class (value + type) so
 *  the engine's `DuckDBInstance.create()` call and its
 *  `duckInstance: DuckDBInstance` field both resolve against the alias. */
export class DuckDBInstance {
  private constructor(private readonly impl: WasmInstance) {}

  /** Lazily instantiate duckdb-wasm. The `path` argument (`:memory:` in the
   *  browser) is ignored — the wasm build is always in-memory. */
  static async create(_path?: string): Promise<DuckDBInstance> {
    const { createWasmInstance } = await import('./duckdb-wasm-impl.ts');
    return new DuckDBInstance(await createWasmInstance());
  }

  connect(): Promise<DuckDBConnection> {
    return this.impl.connect();
  }
}
