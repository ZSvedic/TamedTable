// #IoFormats
// Shared helpers for the binary codecs (Parquet, Arrow). DuckDB and apache-arrow
// both hand back BIGINT/Int64 columns as JS `bigint`, which downstream consumers
// (JSON.stringify in the JSONL writer, the table view, test assertions) can't
// handle — mirror the engine's normalizeSqlValue: a safe-range bigint becomes a
// Number, anything larger a string.
import type { Row } from '@tamedtable/table-plan';

export function normalizeCell(v: unknown): unknown {
  if (typeof v !== 'bigint') return v;
  return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(v)
    : v.toString();
}

/** Map an array of raw row objects (DuckDB `getRowObjects` / Arrow `toJSON`) to
 *  TablePlan rows, normalizing every cell. */
export function normalizeRows(raw: Array<Record<string, unknown>>): Row[] {
  return raw.map((r) => {
    const out: Row = {};
    for (const k of Object.keys(r)) out[k] = normalizeCell(r[k]);
    return out;
  });
}

// DuckDB's happy path is ~10 MB → low-GB; warn (don't choke) past this so a
// multi-GB input fails loudly rather than silently truncating or hanging.
const LARGE_FILE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export function warnIfHuge(bytes: Uint8Array, name: string): void {
  if (bytes.length > LARGE_FILE_BYTES) {
    const gb = (bytes.length / 1024 / 1024 / 1024).toFixed(1);
    console.warn(
      `file-io: ${name} is ${gb} GB — very large files may exhaust memory or run slowly.`,
    );
  }
}
