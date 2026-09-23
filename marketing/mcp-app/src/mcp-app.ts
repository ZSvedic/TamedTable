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
const sourceInputEl = el<HTMLInputElement>("source-input");
const fileEl = el<HTMLInputElement>("file");
const mainEl = document.querySelector(".main") as HTMLElement;
const fullscreenEl = el<HTMLButtonElement>("fullscreen");

let current: TableData | null = null;

function log(message: string): void {
  logEl.textContent = `${new Date().toLocaleTimeString()}  ${message}\n${logEl.textContent}`;
  void app.sendLog({ level: "info", data: message });
}

function parseCsv(text: string): { columns: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error("The CSV is empty.");
  const columns = lines[0]!.split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((l) => {
    const cells = l.split(",").map((c) => c.trim());
    return columns.map((_, i) => cells[i] ?? "");
  });
  return { columns, rows };
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
async function update(
  next: Pick<TableData, "columns" | "rows" | "source">,
  repaint = false,
): Promise<void> {
  if (!current) return;
  const csv = toCsv(next);
  const tableId = current.tableId;
  // A cell edit must not repaint: the grid already shows what the user typed,
  // and rebuilding it would destroy the input they have just tabbed into. A
  // whole new table has nothing on screen to preserve, so it does.
  if (repaint) {
    render({ ...next, tableId, csv });
  } else {
    current = { ...next, tableId, csv };
    sourceEl.textContent = next.source;
    sizeEl.textContent = `${next.rows.length} rows`;
  }
  await call("put-table", { tableId, csv, source: next.source }, true);
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
        // Read `current`, not the `data` this row was rendered from. An edit no
        // longer repaints the grid, so the closure's copy goes stale the moment
        // a second cell is touched, and edits would overwrite each other.
        const live = current;
        if (!live) return;
        const rows = live.rows.map((r, i) =>
          i === rowIndex ? r.map((c, j) => (j === colIndex ? input.value : c)) : r,
        );
        void update({ columns: live.columns, rows, source: live.source });
        log(`Set row ${rowIndex}, ${live.columns[colIndex]}. The chat has the new table.`);
      });
      tr.insertCell().appendChild(input);
    });
  });

  gridEl.replaceChildren(table);
}

/**
 * Calls a server tool, recovering when the server has forgotten the table.
 *
 * Two host differences show up here. Claude returns a failed tool call as a
 * result with `isError`; ChatGPT throws it. And a free-tier host puts the
 * process to sleep, so the tables it was holding go with it. The view still
 * has the rows, so on either kind of "no table with that id", hand them back
 * under the same id and try once more.
 *
 * Everything that talks to the server goes through here, so no button has to
 * remember that a table can go missing.
 */
async function callTool(
  name: string,
  args: Record<string, unknown> = {},
  retry = true,
): Promise<CallToolResult | null> {
  const lost = (message: string) => /No table with id/.test(message);

  const resend = async (): Promise<CallToolResult | null> => {
    if (!retry || !current || name === "put-table") return null;
    log("The server no longer has this table. Sending it back.");
    await callTool(
      "put-table",
      { tableId: current.tableId, csv: current.csv, source: current.source },
      false,
    );
    return callTool(name, args, false);
  };

  try {
    const result = await app.callServerTool({ name, arguments: args });
    const text = result.content?.[0];
    if (result.isError && text?.type === "text") {
      if (lost(text.text)) return (await resend()) ?? null;
      log(text.text);
      return null;
    }
    return result;
  } catch (e) {
    const message = String(e);
    if (lost(message)) return (await resend()) ?? null;
    log(`${name} failed: ${message}`);
    return null;
  }
}

/**
 * Calls a tool and repaints from its answer.
 *
 * `silent` skips the repaint. A `put-table` answer is an echo of what is
 * already on screen, and rebuilding the grid for it steals focus from
 * whichever cell the user has moved to.
 */
async function call(name: string, args: Record<string, unknown> = {}, silent = false): Promise<void> {
  const result = await callTool(name, args);
  if (!result || silent) return;
  const data = readTable(result);
  if (data) render(data);
}

// --- Edit ---------------------------------------------------------------------

el("add-row").addEventListener("click", () => {
  if (!current) return;
  // A new row needs a repaint; there is no focused cell to lose.
  void update(
    {
      columns: current.columns,
      rows: [...current.rows, current.columns.map(() => "")],
      source: current.source,
    },
    true,
  );
});

// --- Load a CSV: the ways that work in every host -----------------------------

// The server fetches the URL or reads the path. It runs outside the browser, so
// no host CSP or sandbox applies.
el("open").addEventListener("click", () => void call("open-table", { source: sourceInputEl.value }));

el("pick-file").addEventListener("click", () => {
  log("Opening the file picker…");
  fileEl.click();
});

fileEl.addEventListener("change", async () => {
  const file = fileEl.files?.[0];
  if (!file) {
    log("The file picker returned nothing.");
    return;
  }
  // The bytes exist only inside the iframe, so parse them here and write the
  // rows to the server under the current id.
  const text = await file.text();
  // Clear it, or picking the same file twice fires no second change event.
  fileEl.value = "";
  const { columns, rows } = parseCsv(text);
  log(`Picked ${file.name}: ${rows.length} rows.`);
  await update({ columns, rows, source: file.name }, true);
});

// --- Save a CSV: the ways that work in every host -----------------------------

el("copy").addEventListener("click", async () => {
  if (!current) return;
  // No server, no host, no permissions to ask for: the clipboard is the one
  // way out of the sandbox that needs nothing but a user gesture.
  try {
    await navigator.clipboard.writeText(current.csv);
    log(`Copied ${current.rows.length} rows to the clipboard.`);
  } catch {
    // Neither Claude nor ChatGPT grants clipboard-write to the iframe, so the
    // modern call fails and this older one does the copy.
    // Selecting the textarea moves focus to it, and removing it drops focus on
    // the body. Hand it back, or a keyboard user lands at the top of the view.
    const back = document.activeElement as HTMLElement | null;
    const area = document.createElement("textarea");
    area.value = current.csv;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    back?.focus();
    log(
      ok
        ? `Copied ${current.rows.length} rows (the host blocks the clipboard API, so the older copy command did it).`
        : "Copy failed: the host blocks both clipboard paths.",
    );
  }
});

el("save-link").addEventListener("click", async () => {
  if (!current) return;
  // The iframe cannot hand over a file, but the host can open a link, and a
  // link whose response carries Content-Disposition: attachment is a save.
  const result = await callTool("download-link", { tableId: current.tableId });
  const { url } = (result?.structuredContent as { url?: string }) ?? {};
  if (!url) {
    log("Save file failed: the server sent no link.");
    return;
  }
  // Both hosts put a confirmation in front of the link, and the answer says
  // little: ChatGPT accepts before the user has confirmed, and Claude may never
  // answer at all. So log the request now and the host's answer if it comes.
  log(`Asked the chat app to open ${url}. Confirm in its dialog.`);
  void app.openLink({ url }).then(({ isError }) =>
    log(isError ? "The chat app refused the link." : "The chat app passed the link on."),
  );
});

el("save-path").addEventListener("click", () => {
  if (!current) return;
  void call("save-table", { tableId: current.tableId, path: sourceInputEl.value });
});

// --- Sandbox tests: each is meant to fail somewhere ---------------------------

el("fetch-here").addEventListener("click", async () => {
  // A fetch from the iframe needs the origin in the host's CSP (built from
  // `_meta.ui.csp.connectDomains`, which this app leaves empty) and CORS on the
  // far end. Claude always enforces the CSP; ChatGPT lets developer-mode apps
  // run without it. On success, load the rows rather than just count bytes.
  const url = sourceInputEl.value;
  try {
    const response = await fetch(url);
    const text = await response.text();
    log(`Fetch in page worked: ${response.status}, ${text.length} bytes. The host's CSP let it through.`);
    await update({ ...parseCsv(text), source: url }, true);
  } catch (e) {
    log(`Fetch in page blocked by the host's CSP (${String(e)}). "Open" does the same through the server.`);
  }
});

el("download").addEventListener("click", () => {
  // Blob download needs `allow-downloads` on the iframe sandbox. When it is
  // missing the browser drops the click silently, so the page cannot tell.
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
    log("Blob download clicked. No file means the iframe sandbox dropped it (no allow-downloads); the page cannot tell.");
  } catch (e) {
    log(`Blob download failed: ${String(e)}`);
  }
});

el("data-link").addEventListener("click", async () => {
  // Hand the host a data: URL that holds the whole file. Hosts are free to
  // refuse schemes other than http(s).
  if (!current) return;
  const { isError } = await app.openLink({
    url: `data:text/csv;charset=utf-8,${encodeURIComponent(current.csv)}`,
  });
  log(
    isError
      ? "data: link refused by the chat app."
      : "data: link passed on by the chat app. Confirm in its dialog.",
  );
});

el("ask-chat").addEventListener("click", async () => {
  if (!current) return;
  const { isError } = await app.sendMessage({
    role: "user",
    content: [{ type: "text", text: "Tidy this table up with edit-table." }],
  });
  log(`Chat message ${isError ? "rejected" : "accepted"}.`);
});

// --- Display mode ------------------------------------------------------------

/**
 * Shows the button only when the host offers fullscreen, and makes its label
 * and the layout follow the mode the host says we are in. The host has the last
 * word: it can refuse a request, or leave fullscreen on its own (Esc, its own
 * close button), and both arrive here as a context change.
 */
function applyDisplayMode(ctx: McpUiHostContext): void {
  if (ctx.availableDisplayModes) {
    fullscreenEl.hidden = !ctx.availableDisplayModes.includes("fullscreen");
  }
  if (ctx.displayMode) {
    const full = ctx.displayMode === "fullscreen";
    mainEl.classList.toggle("fullscreen", full);
    fullscreenEl.textContent = full ? "Exit fullscreen" : "Fullscreen";
  }
}

fullscreenEl.addEventListener("click", async () => {
  const ctx = app.getHostContext();
  const next = ctx?.displayMode === "fullscreen" ? "inline" : "fullscreen";
  try {
    const { mode } = await app.requestDisplayMode({ mode: next });
    applyDisplayMode({ displayMode: mode });
    log(`Asked for ${next}, the host gave ${mode}.`);
  } catch (e) {
    log(`Display mode ${next} failed: ${String(e)}`);
  }
});

// --- Lifecycle ---------------------------------------------------------------

function applyHostContext(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  applyDisplayMode(ctx);
  if (ctx.safeAreaInsets) {
    mainEl.style.padding = `${ctx.safeAreaInsets.top}px ${ctx.safeAreaInsets.right}px ${ctx.safeAreaInsets.bottom}px ${ctx.safeAreaInsets.left}px`;
  }
}

const app = new App(
  { name: "TinyTable", version: "0.3.0" },
  { availableDisplayModes: ["inline", "fullscreen"] },
);

// The only way the view learns what to show. Every table tool carries this
// resource, so a chat-driven edit paints a fresh view with the new rows.
app.ontoolresult = (result) => {
  const data = readTable(result);
  if (!data) return;
  render(data);
  void refresh(data.tableId);
};

/**
 * A host can hand the view an old result. ChatGPT reloads the view when a
 * setting changes and replays the tool result it first painted, which can be
 * several edits behind the table the server holds under the same id. Ask the
 * server for its copy and show that if it differs.
 *
 * Read only: no retry, so no re-send. After a restart the server has nothing,
 * and every view on the page loads at once; if each handed back its own rows,
 * the oldest view could win and overwrite the newest edit.
 */
async function refresh(tableId: string): Promise<void> {
  const result = await callTool("show-table", { tableId }, false);
  const data = result && readTable(result);
  if (!data || data.tableId !== current?.tableId || data.csv === current.csv) return;
  render(data);
  log("The host replayed an older result. Showing the server's copy.");
}
app.onhostcontextchanged = applyHostContext;
app.onerror = (e) => log(`App error: ${String(e)}`);
app.onteardown = async () => ({});

await app.connect();
const ctx = app.getHostContext();
if (ctx) {
  applyHostContext(ctx);
  log(`Host display mode ${ctx.displayMode ?? "unknown"}, offers ${ctx.availableDisplayModes?.join(", ") ?? "nothing"}.`);
}
