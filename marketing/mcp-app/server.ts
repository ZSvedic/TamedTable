/**
 * @file The MCP server half: four tools and one UI resource.
 *
 * The server holds no table. Every tool takes the current CSV and returns a new
 * one, because the model's tool calls and the view's tool calls do not
 * necessarily share a session. See LEARNINGS.md.
 */
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  McpServer,
  type CallToolResult,
  type ReadResourceResult,
} from "@modelcontextprotocol/server";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import * as table from "./table.js";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const RESOURCE_URI = "ui://tinytable/table.html";

/** Every tool answers with the same shape, so the view has one code path. */
const tableOutput = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  source: z.string(),
  csv: z.string(),
});

const csvArg = z
  .string()
  .describe(
    "The table to work on, as CSV with a header row. Copy it from the `csv` " +
      "field of the previous result. Omit it only for the built-in sample.",
  );

function tableResult(t: table.TableData, note: string): CallToolResult {
  const csv = table.toCsv(t);
  return {
    // The model reads this, and passes the CSV straight back on the next edit,
    // so it has to be the whole table rather than a preview.
    content: [{ type: "text", text: `${note}\n\n${csv}` }],
    structuredContent: { columns: t.columns, rows: t.rows, source: t.source, csv },
  };
}

function errorResult(e: unknown): CallToolResult {
  const message = e instanceof Error ? e.message : String(e);
  return { isError: true, content: [{ type: "text", text: `Error: ${message}` }] };
}

function read(csv: string | undefined, source: string | undefined): table.TableData {
  return table.parseCsv(csv ?? table.SAMPLE_CSV, source ?? (csv ? "chat" : "sample"));
}

/**
 * One server, no state. `localFiles` is on for stdio, where the server runs on
 * the user's own machine, and off for the public deployment, where reading and
 * writing the host's disk would be somebody else's disk.
 */
export function createServer({ localFiles }: { localFiles: boolean }): McpServer {
  const server = new McpServer({ name: "TinyTable MCP App", version: "0.2.0" });

  const withUi = { ui: { resourceUri: RESOURCE_URI } };

  registerAppTool(
    server,
    "show-table",
    {
      title: "Show table",
      description:
        "Display a table in an interactive view. Pass the CSV you already have; " +
        "with no CSV it shows the built-in sample.",
      inputSchema: z.object({
        csv: csvArg.optional(),
        source: z.string().optional().describe("A label for where the table came from."),
      }),
      outputSchema: tableOutput,
      _meta: withUi,
    },
    async ({ csv, source }) => {
      try {
        return tableResult(read(csv, source), "Showing the table.");
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  registerAppTool(
    server,
    "edit-table",
    {
      title: "Edit table",
      description:
        "Change a table and show the result: set a cell, add or delete a row, " +
        "rename a column, sort, or filter. Always pass the current CSV. Row " +
        "numbers are zero-based and refer to the rows as displayed.",
      inputSchema: z.object({
        csv: csvArg.optional(),
        source: z.string().optional().describe("A label for where the table came from."),
        op: z.enum(["set-cell", "add-row", "delete-row", "rename-column", "sort", "filter"]),
        row: z.number().optional().describe("Zero-based row index for set-cell and delete-row."),
        column: z.string().optional().describe("Column name for set-cell, sort, and filter."),
        value: z.string().optional().describe("New value for set-cell, or the substring for filter."),
        values: z.array(z.string()).optional().describe("Cell values, in column order, for add-row."),
        to: z.string().optional().describe("New column name for rename-column."),
        direction: z.enum(["asc", "desc"]).optional().describe("Sort direction; defaults to asc."),
      }),
      outputSchema: tableOutput,
      _meta: withUi,
    },
    async ({ csv, source, op, row, column, value, values, to, direction }) => {
      try {
        const before = read(csv, source);
        const need = <T>(v: T | undefined, what: string): T => {
          if (v === undefined) throw new Error(`"${op}" needs ${what}.`);
          return v;
        };
        let after: table.TableData;
        switch (op) {
          case "set-cell":
            after = table.setCell(before, need(row, "row"), need(column, "column"), need(value, "value"));
            break;
          case "add-row":
            after = table.addRow(before, need(values, "values"));
            break;
          case "delete-row":
            after = table.deleteRow(before, need(row, "row"));
            break;
          case "rename-column":
            after = table.renameColumn(before, need(column, "column"), need(to, "to"));
            break;
          case "sort":
            after = table.sortByColumn(before, need(column, "column"), direction ?? "asc");
            break;
          case "filter":
            after = table.filterRows(before, need(column, "column"), need(value, "value"));
            break;
        }
        return tableResult(after, `Applied ${op}.`);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // The fetch and the disk read both happen in the server process, which is why
  // they work at all: see LEARNINGS.md.
  registerAppTool(
    server,
    "open-table",
    {
      title: "Open table",
      description:
        "Load a CSV into the view, either from a local file path or from an http(s) URL.",
      inputSchema: z.object({
        source: z.string().describe("A local file path, or an http(s) URL to a CSV file."),
      }),
      outputSchema: tableOutput,
      _meta: withUi,
    },
    async ({ source }) => {
      try {
        let csv: string;
        if (/^https?:\/\//i.test(source)) {
          const response = await fetch(source);
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          csv = await response.text();
        } else {
          if (!localFiles) {
            throw new Error(
              "This server reads local files only when it runs on your own machine. " +
                "Give it an http(s) URL instead.",
            );
          }
          csv = await fs.readFile(path.resolve(source), "utf-8");
        }
        return tableResult(table.parseCsv(csv, source), `Loaded ${source}.`);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  registerAppTool(
    server,
    "save-table",
    {
      title: "Save table",
      description: "Write a CSV to a local file.",
      inputSchema: z.object({
        csv: csvArg,
        path: z.string().describe("Local file path to write."),
      }),
      outputSchema: tableOutput,
      _meta: withUi,
    },
    async ({ csv, path: target }) => {
      try {
        if (!localFiles) {
          throw new Error("This server writes local files only when it runs on your own machine.");
        }
        const resolved = path.resolve(target);
        await fs.writeFile(resolved, csv, "utf-8");
        // Echo the table back so the view the host paints after a save shows
        // what was saved, rather than an empty grid.
        return tableResult(table.parseCsv(csv, resolved), `Saved ${csv.length} bytes to ${resolved}.`);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  registerAppResource(
    server,
    "TinyTable view",
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
      return { contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html }] };
    },
  );

  return server;
}
