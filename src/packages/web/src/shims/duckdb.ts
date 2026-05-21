// Browser stub for `@duckdb/node-api`, a native Node addon. The engine only
// touches DuckDB lazily, for {sql} transformations — outside the V4 web
// golden path. Reaching this stub produces a clear, recoverable error that
// surfaces as a toast.

export type DuckDBConnection = unknown;

export const DuckDBInstance = {
  async create(): Promise<never> {
    throw new Error('SQL transformations are not available in the TamedTable web build.');
  },
};
