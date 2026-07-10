// #DuckDB #SqlExpr
// The runner's DuckDB session — lazy connection, relation registration, and
// {sql} scalar/aggregate evaluation with interruptible cancellation. One
// SqlSession per runner; the runner loop (index.ts) owns the instance.

import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import type { Row, Transformation } from '@tamedtable/core';
import { CANCELLED, abortIf, isCancelled } from './engine.ts';

// #CancelOp
// SQL cancel give-up: if `conn.interrupt()` hasn't taken effect this long
// after the abort, signal cancelled anyway (inside the 2-second cancel budget,
// spec/code-contract.md § {sql}) and let the query drain in the background —
// `lingeringSql` blocks the next request until it settles.
const SQL_CANCEL_GIVE_UP_MS = 1500;

// DuckDB returns BIGINT columns as JS bigints. Downstream consumers (JSON.stringify
// in writeJsonl, the cell-update onChunk listener, test assertions) can't handle
// bigints, so coerce to Number when it fits safely and to a string otherwise.
function normalizeSqlValue(v: unknown): unknown {
  if (typeof v !== 'bigint') return v;
  return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(v)
    : v.toString();
}

export class SqlSession {
  // DuckDB is initialised lazily on first {sql} use. The relation `t` is
  // re-registered before each SQL-touching transformation so SQL always sees
  // the latest committed rows.
  private duckInstance: DuckDBInstance | undefined;
  private duckConn: DuckDBConnection | undefined;
  // A cancelled SQL query that ignored `conn.interrupt()` — still executing
  // after the give-up window. Set until it settles; blocks the next request.
  private lingeringSql: Promise<unknown> | undefined;

  /** True while a cancelled query is still draining in the background. */
  hasLingeringSql(): boolean {
    return this.lingeringSql !== undefined;
  }

  /** Drops the `t` relation so SQL transformations see a freshly-loaded
   *  source. No-op before the first {sql} use. */
  async resetTable(): Promise<void> {
    if (this.duckConn) {
      try { await this.duckConn.run('DROP TABLE IF EXISTS t'); } catch {}
    }
  }

  /** Lazily creates the in-process DuckDB connection. */
  private async duck(): Promise<DuckDBConnection> {
    if (this.duckConn) return this.duckConn;
    const dbPath = process.env.TAMEDTABLE_DUCKDB_PATH ?? ':memory:';
    const threads = process.env.TAMEDTABLE_DUCKDB_THREADS ?? '4';
    this.duckInstance = await DuckDBInstance.create(dbPath);
    this.duckConn = await this.duckInstance.connect();
    await this.duckConn.run(`SET threads = ${Number(threads) || 4}`);
    return this.duckConn;
  }

  /** Registers `rows` as a DuckDB relation of the given name (`t` for the
   *  current table, `g` for a group's slice). Drops any prior registration
   *  so {sql} always sees the latest rows. */
  private async registerRelation(name: string, rows: Row[]): Promise<void> {
    const conn = await this.duck();
    // DuckDB's `DROP X IF EXISTS y` still errors if y exists as a different
    // kind (e.g. dropping a VIEW when y is a TABLE). Try both and swallow
    // the type-mismatch error — only one DROP can succeed but that's fine.
    try { await conn.run(`DROP TABLE IF EXISTS ${name}`); } catch {}
    try { await conn.run(`DROP VIEW IF EXISTS ${name}`); } catch {}
    if (rows.length === 0) {
      await conn.run(`CREATE TABLE ${name} (dummy INTEGER)`);
      await conn.run(`DELETE FROM ${name}`);
      return;
    }
    // Discover column names in first-seen insertion order across rows.
    const cols: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) for (const k of Object.keys(row)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
    // All columns ingest as VARCHAR; SQL fragments cast to numeric/date as
    // needed. Identifiers are NOT quoted in DDL so DuckDB stores them
    // case-insensitively, matching the LLM's `lower(Country)` style usage
    // (quoted identifiers would force exact-case matches and break that).
    const colDefs = cols.map((c) => `${c} VARCHAR`).join(', ');
    await conn.run(`CREATE TABLE ${name} (${colDefs})`);
    const sqlValue = (v: unknown) => {
      if (v === null || v === undefined) return 'NULL';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `'${s.replace(/'/g, "''")}'`;
    };
    // INSERT in batches to keep SQL statement size reasonable.
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const valuesSql = slice.map((row) =>
        '(' + cols.map((c) => sqlValue(row[c])).join(', ') + ')'
      ).join(', ');
      await conn.run(`INSERT INTO ${name} VALUES ${valuesSql}`);
    }
  }

  /** Runs a DuckDB query, calling `conn.interrupt()` if the signal aborts
   *  while the query is in flight (SQL cancellation). An interrupted query
   *  rejects; this surfaces it as the runner's standard cancelled error so
   *  the request loop rolls back the half-applied transformation. If the
   *  query ignores the interrupt, give up after `SQL_CANCEL_GIVE_UP_MS`:
   *  signal cancelled anyway and park the still-running query on
   *  `lingeringSql`, which `request()` checks so the next request waits for
   *  the drain rather than racing a half-dead query. */
  private async runInterruptibleSql<T>(run: () => Promise<T>, signal: AbortSignal | undefined): Promise<T> {
    if (!signal) return run();
    abortIf(signal);
    const onAbort = () => { try { this.duckConn?.interrupt(); } catch { /* best effort */ } };
    signal.addEventListener('abort', onAbort, { once: true });
    const pending = run();
    let giveUpTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await new Promise<T>((resolve, reject) => {
        const giveUp = () => {
          giveUpTimer = setTimeout(() => {
            this.lingeringSql = pending.catch(() => { /* drain only */ }).finally(() => { this.lingeringSql = undefined; });
            reject(new Error(CANCELLED));
          }, SQL_CANCEL_GIVE_UP_MS);
        };
        if (signal.aborted) giveUp();
        else signal.addEventListener('abort', giveUp, { once: true });
        pending.then(resolve, reject).finally(() => {
          clearTimeout(giveUpTimer);
          signal.removeEventListener('abort', giveUp);
        });
      });
    } catch (e) {
      if (signal.aborted) throw new Error(CANCELLED);
      throw e;
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }

  // #SqlExpr
  /** Evaluates a {sql} scalar/predicate per row; returns one result per row
   *  in input order. The SQL fragment is wrapped in SELECT … FROM t. */
  async evalSqlScalar(rows: Row[], sqlFragment: string, signal?: AbortSignal): Promise<unknown[]> {
    if (rows.length === 0) return [];
    try {
      await this.registerRelation('t', rows);
      const conn = await this.duck();
      const reader = await this.runInterruptibleSql(
        () => conn.runAndReadAll(`SELECT (${sqlFragment}) AS r FROM t`),
        signal
      );
      return reader.getRowObjects().map((r) => normalizeSqlValue((r as { r: unknown }).r));
    } catch (e) {
      if (isCancelled(e) || signal?.aborted) throw new Error(CANCELLED);
      throw new Error(`SQL evaluation failed: ${(e as Error).message}`);
    }
  }

  /** Evaluates a {sql} aggregate over one group's row slice — the slice is
   *  registered as relation `g` and the fragment wrapped in SELECT … FROM g.
   *  The slice is also registered as `t` so an aggregate fragment that
   *  references the table by name still resolves — natural for an empty-`by`
   *  group, where the group's slice is the whole table. */
  async evalSqlAgg(slice: Row[], sqlFragment: string, signal?: AbortSignal): Promise<unknown> {
    try {
      await this.registerRelation('g', slice);
      await this.registerRelation('t', slice);
      const conn = await this.duck();
      const reader = await this.runInterruptibleSql(
        () => conn.runAndReadAll(`SELECT (${sqlFragment}) AS r FROM g`),
        signal
      );
      const out = reader.getRowObjects();
      return out.length > 0 ? normalizeSqlValue((out[0] as { r: unknown }).r) : null;
    } catch (e) {
      if (isCancelled(e) || signal?.aborted) throw new Error(CANCELLED);
      throw new Error(`SQL evaluation failed: ${(e as Error).message}`);
    }
  }

  async applyMutateSql(
    rows: Row[],
    t: Extract<Transformation, { kind: 'mutate' }> & { value: { sql: string } },
    signal?: AbortSignal
  ): Promise<Row[]> {
    const cols = Array.isArray(t.columns) ? t.columns : [t.columns];
    const results = await this.evalSqlScalar(rows, t.value.sql, signal);
    return rows.map((row, i) => {
      const out: Row = { ...row };
      const v = results[i];
      for (const c of cols) out[c] = v ?? null;
      return out;
    });
  }

  async applyFilterSql(
    rows: Row[],
    t: Extract<Transformation, { kind: 'filter' }> & { pred: { sql: string } },
    signal?: AbortSignal
  ): Promise<Row[]> {
    const results = await this.evalSqlScalar(rows, t.pred.sql, signal);
    return rows.filter((_, i) => Boolean(results[i]));
  }
}
