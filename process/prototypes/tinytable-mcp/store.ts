/**
 * @file Tables the server is holding, keyed by id.
 *
 * Not a session store: the id travels in tool arguments, so the model's calls
 * and the view's calls find the same table even when they arrive on different
 * MCP sessions. See LEARNINGS.md for the version of this that did not.
 */
import { randomUUID } from "node:crypto";
import type { TableData } from "./table.js";

/** A spike, not a database: oldest entries fall out once the map is full. */
const LIMIT = 200;
const tables = new Map<string, TableData>();

export function put(id: string, table: TableData): string {
  tables.delete(id);
  tables.set(id, table);
  while (tables.size > LIMIT) {
    const oldest = tables.keys().next().value;
    if (oldest === undefined) break;
    tables.delete(oldest);
  }
  return id;
}

export function create(table: TableData): string {
  return put(randomUUID(), table);
}

export function get(id: string): TableData | undefined {
  return tables.get(id);
}
