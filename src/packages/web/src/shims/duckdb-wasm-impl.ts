// #DuckDB
// The real duckdb-wasm wiring, kept out of the eager bundle: ./duckdb.ts pulls
// this module through a dynamic `import()`, so Vite splits duckdb-wasm and its
// wasm/worker assets into a lazy chunk fetched only on the first `{sql}` use.
//
// The wasm assets are imported with `?url` so they are served same-origin from
// the build output, no CDN, so the offline test/preview builds work. We ship
// the MVP and EH bundles and let `selectBundle` pick by browser support; the
// EH bundle (Chromium and every modern browser) needs no cross-origin
// isolation, so the app requires no COOP/COEP headers.
import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import type { DuckDBConnection, DuckDBReader, WasmInstance } from './duckdb.ts';

const BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
  eh: { mainModule: ehWasm, mainWorker: ehWorker },
};

// One wasm instance (and worker) per page, created on first use. Each
// DuckDBInstance.create() reuses it and opens its own connection, the in-memory
// database is shared, but the engine drops and re-creates its `t`/`g` relations
// before every query, so a fresh connection always sees current state.
let dbPromise: Promise<duckdb.AsyncDuckDB> | undefined;

/** The shared wasm instance. Exported so the Parquet engine
 *  (./parquet-engine.ts) reads file buffers through the same DuckDB the {sql}
 *  path uses: one wasm worker per page. */
export function getDb(): Promise<duckdb.AsyncDuckDB> {
  return (dbPromise ??= (async () => {
    const bundle = await duckdb.selectBundle(BUNDLES);
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return db;
  })());
}

class WasmConnection implements DuckDBConnection {
  constructor(private readonly conn: duckdb.AsyncDuckDBConnection) {}

  async run(sql: string): Promise<void> {
    // The wasm build is single-threaded, so `SET threads = N` (the engine
    // issues it from TAMEDTABLE_DUCKDB_THREADS at init) is meaningless here and
    // some builds reject it: skip it rather than fail the connection.
    if (/^\s*SET\s+threads\b/i.test(sql)) return;
    await this.conn.query(sql);
  }

  async runAndReadAll(sql: string): Promise<DuckDBReader> {
    const table = await this.conn.query(sql);
    // Arrow → plain objects. Int64/UInt64 columns arrive as `bigint`, matching
    // node-api, so the engine's normalizeSqlValue handles them unchanged.
    const rows = table
      .toArray()
      .map((r) => (r as { toJSON(): Record<string, unknown> }).toJSON());
    return { getRowObjects: () => rows };
  }

  interrupt(): void {
    // Best-effort. The SQL-cancellation scenarios run on Node only; this keeps
    // the engine's cancel handler a safe call in the browser.
    try {
      void this.conn.cancelSent();
    } catch {
      /* best effort: the query may not be in a cancellable pending state */
    }
  }
}

class WasmInstanceImpl implements WasmInstance {
  constructor(private readonly db: duckdb.AsyncDuckDB) {}

  async connect(): Promise<DuckDBConnection> {
    return new WasmConnection(await this.db.connect());
  }
}

export async function createWasmInstance(): Promise<WasmInstance> {
  return new WasmInstanceImpl(await getDb());
}
