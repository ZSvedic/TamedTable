/**
 * @file The App half: renders the table, edits it in place, and probes the
 * things the iframe sandbox may or may not allow (file picker, download,
 * cross-origin fetch, opening a link). Every probe has a server-side fallback
 * next to it, so the UI stays useful either way.
 *
 * The server holds the table under an id, and the view knows that id. An edit
 * made in the grid is painted at once and written back under the same id, so
 * the next thing typed in the chat works from what is on screen.
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/client";
import "./app.css";

type TableData = {
  tableId: string;
  columns: string[];
  rows: string[][];
  source: string;
  csv: string;
};

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const gridEl = el<HTMLDivElement>("grid");
const sourceEl = el<HTMLSpanElement>("source");
const sizeEl = el<HTMLSpanElement>("size");
const logEl = el<HTMLPreElement>("log");
const pathEl = el<HTMLInputElement>("path");
const urlEl = el<HTMLInputElement>("url");
const fileEl = el<HTMLInputElement>("file");
const mainEl = document.querySelector(".main") as HTMLElement;

let current: TableData | null = null;

function log(message: string): void {
  logEl.textContent = `${new Date().toLocaleTimeString()}  ${message}\n${logEl.textContent}`;
  void app.sendLog({ level: "info", data: message });
}

function toCsv(t: Pick<TableData, "columns" | "rows">): string {
  return [t.columns.join(","), ...t.rows.map((r) => r.join(","))].join("\n") + "\n";
}

function readTable(result: CallToolResult): TableData | null {
  const data = result.structuredContent as TableData | undefined;
  return data && Array.isArray(data.columns) ? data : null;
}

/**
 * Paints a local change straight away, then writes it back to the server under
 * the same table id. The write is what the chat will read; the repaint is only
 * so the grid does not wait for a round trip.
 */
async function update(next: Pick<TableData, "columns" | "rows" | "source">): Promise<void> {
  if (!current) return;
  const csv = toCsv(next);
  const tableId = current.tableId;
  render({ ...next, tableId, csv });
  await call("put-table", { tableId, csv, source: next.source });
  // Belt and braces: the id in the model's context, never the rows.
  await app.updateModelContext({
    content: [
      {
        type: "text",
        text: `The user edited the table in the view. It is table ${tableId}, now ${next.rows.length} rows. Pass that tableId to edit-table; do not rebuild the table from an earlier result.`,
      },
    ],
  });
}

function render(data: TableData): void {
  current = data;
  sourceEl.textContent = data.source;
  sizeEl.textContent = `${data.rows.length} rows`;
  sourceEl.title = `tableId ${data.tableId}`;

  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  for (const column of data.columns) {
    const th = document.createElement("th");
    th.textContent = column;
    head.appendChild(th);
  }
  const body = table.createTBody();
  data.rows.forEach((row, rowIndex) => {
    const tr = body.insertRow();
    row.forEach((cell, colIndex) => {
      const input = document.createElement("input");
      input.value = cell;
      input.addEventListener("change", () => {
        const rows = data.rows.map((r, i) =>
          i === rowIndex ? r.map((c, j) => (j === colIndex ? input.value : c)) : r,
        );
        void update({ columns: data.columns, rows, source: data.source });
        log(`Set row ${rowIndex}, ${data.columns[colIndex]}. The chat has the new table.`);
      });
      tr.insertCell().appendChild(input);
    });
  });

  gridEl.replaceChildren(table);
}

/** Calls a server tool and repaints if the answer carries a table. */
async function call(name: string, args: Record<string, unknown> = {}): Promise<void> {
  try {
    const result = await app.callServerTool({ name, arguments: args });
    const data = readTable(result);
    if (data) render(data);
    const text = result.content?.[0];
    if (result.isError && text?.type === "text") log(text.text);
  } catch (e) {
    log(`${name} threw: ${String(e)}`);
  }
}

// --- Probes: the sandbox-dependent half of the experiment --------------------

el("pick-file").addEventListener("click", () => {
  // A hidden <input type="file"> needs the sandbox to allow the picker. If
  // nothing opens, the fallback is "Open (server)".
  log("Opening the native file picker…");
  fileEl.click();
});

fileEl.addEventListener("change", async () => {
  const file = fileEl.files?.[0];
  if (!file) {
    log("File picker returned nothing.");
    return;
  }
  // The bytes exist only inside the iframe, so parse them here and hand the
  // result to the model. Nothing has to reach the server at all.
  const text = await file.text();
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  const columns = lines[0]!.split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((l) => {
    const cells = l.split(",").map((c) => c.trim());
    return columns.map((_, i) => cells[i] ?? "");
  });
  log(`Picker gave ${file.name}: ${rows.length} rows.`);
  await update({ columns, rows, source: file.name });
});

el("download").addEventListener("click", () => {
  // Blob download needs `allow-downloads` on the iframe sandbox.
  try {
    if (!current) return;
    const url = URL.createObjectURL(new Blob([current.csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "table.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    log("Download click dispatched. If no file appeared, the sandbox blocked it.");
  } catch (e) {
    log(`Download blocked: ${String(e)}`);
  }
});

el("open-link").addEventListener("click", async () => {
  // Second try at getting a file out: hand the host a data: URL and let it
  // open it. Hosts are free to refuse non-http(s) schemes.
  if (!current) return;
  const { isError } = await app.openLink({
    url: `data:text/csv;charset=utf-8,${encodeURIComponent(current.csv)}`,
  });
  log(`openLink with a data: URL was ${isError ? "refused" : "accepted"} by the host.`);
});

el("fetch-url").addEventListener("click", async () => {
  // A bare fetch from the iframe needs the origin in the resource's
  // `_meta.ui.csp.connectDomains` *and* CORS on the far end. This resource
  // declares no CSP domains, so this probe is expected to fail.
  try {
    const response = await fetch(urlEl.value);
    log(`In-iframe fetch succeeded: ${response.status}, ${(await response.text()).length} bytes.`);
  } catch (e) {
    log(`In-iframe fetch blocked: ${String(e)}. Use "Open (server)" instead.`);
  }
});

// --- Server-side paths -------------------------------------------------------

el("add-row").addEventListener("click", () => {
  if (!current) return;
  void update({
    columns: current.columns,
    rows: [...current.rows, current.columns.map(() => "")],
    source: current.source,
  });
});

el("open-path").addEventListener("click", () => void call("open-table", { source: pathEl.value }));
el("open-url").addEventListener("click", () => void call("open-table", { source: urlEl.value }));
el("save-path").addEventListener("click", () => {
  if (!current) return;
  void call("save-table", { tableId: current.tableId, path: pathEl.value });
});

el("ask-chat").addEventListener("click", async () => {
  if (!current) return;
  const { isError } = await app.sendMessage({
    role: "user",
    content: [{ type: "text", text: "Tidy this table up with edit-table." }],
  });
  log(`Chat message ${isError ? "rejected" : "accepted"}.`);
});

// --- Lifecycle ---------------------------------------------------------------

function applyHostContext(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    mainEl.style.padding = `${ctx.safeAreaInsets.top}px ${ctx.safeAreaInsets.right}px ${ctx.safeAreaInsets.bottom}px ${ctx.safeAreaInsets.left}px`;
  }
}

const app = new App({ name: "TinyTable", version: "0.2.0" });

// The only way the view learns what to show. Every table tool carries this
// resource, so a chat-driven edit paints a fresh view with the new rows.
app.ontoolresult = (result) => {
  const data = readTable(result);
  if (data) render(data);
};
app.onhostcontextchanged = applyHostContext;
app.onerror = (e) => log(`App error: ${String(e)}`);
app.onteardown = async () => ({});

await app.connect();
const ctx = app.getHostContext();
if (ctx) applyHostContext(ctx);
