/**
 * @file The App half: renders the table, edits cells, and probes the four
 * things the iframe sandbox may or may not allow (file picker, download,
 * cross-origin fetch, opening a link). Every probe has a server-side
 * fallback next to it, so the UI stays useful either way.
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

type TableData = { columns: string[]; rows: string[][]; version: number; source: string };

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const gridEl = el<HTMLDivElement>("grid");
const sourceEl = el<HTMLSpanElement>("source");
const versionEl = el<HTMLSpanElement>("version");
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

function readTable(result: CallToolResult): TableData | null {
  const data = result.structuredContent as TableData | undefined;
  return data && Array.isArray(data.columns) ? data : null;
}

function render(data: TableData): void {
  current = data;
  sourceEl.textContent = data.source;
  versionEl.textContent = `v${data.version}`;

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
      // An in-view edit goes back through an app-only tool, so the server
      // stays the single source of truth for both the view and the model.
      input.addEventListener("change", () => {
        void call("set-cell", {
          row: rowIndex,
          column: data.columns[colIndex],
          value: input.value,
        });
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
    if (result.isError) {
      log(`${name} failed: ${JSON.stringify(result.content)}`);
    }
  } catch (e) {
    log(`${name} threw: ${String(e)}`);
  }
}

// --- Probes: the sandbox-dependent half of the experiment --------------------

el("pick-file").addEventListener("click", () => {
  // A hidden <input type="file"> needs the sandbox to allow the picker and to
  // treat the click as user-activated. If nothing opens, the fallback is the
  // "Open (server)" button, which reads the path in the server process.
  log("Opening the native file picker…");
  fileEl.click();
});

fileEl.addEventListener("change", async () => {
  const file = fileEl.files?.[0];
  if (!file) {
    log("File picker returned nothing.");
    return;
  }
  // The bytes exist only inside the iframe, so hand them to the server as
  // text through an app-only tool.
  const csv = await file.text();
  log(`Picker gave ${file.name} (${csv.length} bytes); sending it to the server.`);
  await call("load-csv", { csv, source: file.name });
});

el("download").addEventListener("click", () => {
  // Blob download needs `allow-downloads` on the iframe sandbox.
  try {
    if (!current) return;
    const csv = [current.columns.join(","), ...current.rows.map((r) => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
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
  const csv = [current.columns.join(","), ...current.rows.map((r) => r.join(","))].join("\n");
  const { isError } = await app.openLink({
    url: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`,
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

// --- Server-side paths: these are the ones that work -------------------------

el("refresh").addEventListener("click", () => void call("get-table"));
el("add-row").addEventListener("click", () => void call("edit-table", { op: "add-row", values: [] }));
el("open-path").addEventListener("click", () => void call("open-table", { source: pathEl.value }));
el("save-path").addEventListener("click", () => void call("save-table", { path: pathEl.value }));
el("open-url").addEventListener("click", () => void call("open-table", { source: urlEl.value }));

el("ask-chat").addEventListener("click", async () => {
  if (!current) return;
  // Hand the model the current state, then a short prompt. The model answers
  // by calling edit-table, and the poll below picks the change up.
  await app.updateModelContext({
    content: [
      {
        type: "text",
        text: `---\nsource: ${current.source}\nversion: ${current.version}\n---\n\nThe user is looking at this table:\n\n${[current.columns.join(","), ...current.rows.map((r) => r.join(","))].join("\n")}`,
      },
    ],
  });
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

const app = new App({ name: "TinyTable", version: "0.1.0" });

app.ontoolresult = (result) => {
  const data = readTable(result);
  if (data) render(data);
};
app.onhostcontextchanged = applyHostContext;
app.onerror = (e) => log(`App error: ${String(e)}`);
app.onteardown = async () => {
  clearInterval(poll);
  return {};
};

// A chat-driven edit runs in a *different* turn than this view, and nothing
// pushes it here, so poll for the version counter instead.
let poll: ReturnType<typeof setInterval>;

await app.connect();
const ctx = app.getHostContext();
if (ctx) applyHostContext(ctx);
await call("get-table");
poll = setInterval(() => {
  if (document.visibilityState === "visible") void call("get-table");
}, 2000);
