/**
 * @file The MCP server half of the prototype: six tools and one UI resource.
 *
 * The App is the pair (tool, resource): every tool that should paint the table
 * in the chat carries `_meta.ui.resourceUri` pointing at the single HTML
 * resource registered at the bottom.
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

/** Every tool answers with the same shape, so the App has one code path. */
const tableOutput = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  version: z.number(),
  source: z.string(),
});

function tableResult(note: string): CallToolResult {
  const t = table.getTable();
  const preview = table.toCsv(t).split("\n").slice(0, 6).join("\n");
  return {
    // Text content is the fallback for hosts that cannot render the UI, and
    // what the model reads to answer questions about the table.
    content: [{ type: "text", text: `${note}\n\n${preview}` }],
    structuredContent: {
      columns: t.columns,
      rows: t.rows,
      version: t.version,
      source: t.source,
    },
  };
}

function errorResult(e: unknown): CallToolResult {
  return { isError: true, content: [{ type: "text", text: `Error: ${String(e)}` }] };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "TinyTable MCP App", version: "0.1.0" });

  const withUi = { ui: { resourceUri: RESOURCE_URI } };
  /** Hidden from the model: the App calls these itself. */
  const appOnly = { ui: { resourceUri: RESOURCE_URI, visibility: ["app"] as const } };

  registerAppTool(
    server,
    "show-table",
    {
      title: "Show table",
      description: "Display the current table in an interactive view.",
      inputSchema: z.object({}),
      outputSchema: tableOutput,
      _meta: withUi,
    },
    async () => tableResult("Showing the current table."),
  );

  // The chat-driven edit path. The user types "sort by country" in the parent
  // chat, the model picks an op, the server mutates, the open App polls and
  // repaints.
  registerAppTool(
    server,
    "edit-table",
    {
      title: "Edit table",
      description:
        "Change the table: set a cell, add or delete a row, rename a column, sort, or filter. " +
        "Row numbers are zero-based and refer to the rows as currently displayed.",
      inputSchema: z.object({
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
    async (args) => {
      try {
        const { op, row, column, value, values, to, direction } = args;
        const need = <T>(v: T | undefined, what: string): T => {
          if (v === undefined) throw new Error(`"${op}" needs ${what}.`);
          return v;
        };
        switch (op) {
          case "set-cell":
            table.setCell(need(row, "row"), need(column, "column"), need(value, "value"));
            break;
          case "add-row":
            table.addRow(need(values, "values"));
            break;
          case "delete-row":
            table.deleteRow(need(row, "row"));
            break;
          case "rename-column":
            table.renameColumn(need(column, "column"), need(to, "to"));
            break;
          case "sort":
            table.sortByColumn(need(column, "column"), direction ?? "asc");
            break;
          case "filter":
            table.filterRows(need(column, "column"), need(value, "value"));
            break;
        }
        return tableResult(`Applied ${op}.`);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // One tool for both file sources. The fetch and the disk read both happen in
  // the server process, which is why they work at all: see LEARNINGS.md.
  registerAppTool(
    server,
    "open-table",
    {
      title: "Open table",
      description:
        "Load a CSV into the table, either from a local file path or from an http(s) URL.",
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
          csv = await fs.readFile(path.resolve(source), "utf-8");
        }
        table.replaceTable(csv, source);
        return tableResult(`Loaded ${source}.`);
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
      description: "Write the current table to a local CSV file.",
      inputSchema: z.object({ path: z.string().describe("Local file path to write.") }),
      outputSchema: z.object({ savedTo: z.string(), bytes: z.number() }),
      _meta: withUi,
    },
    async ({ path: target }) => {
      try {
        const resolved = path.resolve(target);
        const csv = table.toCsv();
        await fs.writeFile(resolved, csv, "utf-8");
        return {
          content: [{ type: "text", text: `Saved ${csv.length} bytes to ${resolved}.` }],
          structuredContent: { savedTo: resolved, bytes: csv.length },
        };
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // App-only tools. The model never sees these; only the iframe calls them.
  registerAppTool(
    server,
    "get-table",
    {
      title: "Get table",
      description: "Return the current table. Used by the view to poll for changes.",
      inputSchema: z.object({}),
      outputSchema: tableOutput,
      _meta: appOnly,
    },
    async () => tableResult("Current table."),
  );

  registerAppTool(
    server,
    "load-csv",
    {
      title: "Load CSV text",
      description:
        "Replace the table with CSV text. Used when the view already holds the bytes, " +
        "for example after the in-iframe file picker.",
      inputSchema: z.object({ csv: z.string(), source: z.string() }),
      outputSchema: tableOutput,
      _meta: appOnly,
    },
    async ({ csv, source }) => {
      try {
        table.replaceTable(csv, source);
        return tableResult(`Loaded ${source} from the view.`);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  registerAppTool(
    server,
    "set-cell",
    {
      title: "Set cell",
      description: "Set one cell, from an edit made directly in the view.",
      inputSchema: z.object({ row: z.number(), column: z.string(), value: z.string() }),
      outputSchema: tableOutput,
      _meta: appOnly,
    },
    async ({ row, column, value }) => {
      try {
        table.setCell(row, column, value);
        return tableResult("Cell updated from the view.");
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
      return {
        contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    },
  );

  return server;
}
