// packages/file-io/index.ts
function detectFormat(pathname, contentType) {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".csv"))
    return "csv";
  if (lower.endsWith(".jsonl") || lower.endsWith(".ndjson"))
    return "jsonl";
  const ct = contentType?.toLowerCase() ?? "";
  if (ct.includes("csv"))
    return "csv";
  if (ct.includes("jsonl") || ct.includes("ndjson"))
    return "jsonl";
  return null;
}
function sampleNameFromUrl(url, format) {
  const segment = url.pathname.split("/").filter(Boolean).pop() ?? "";
  if (segment)
    return segment;
  return `download.${format}`;
}
async function fetchTable(url, fetchImpl = fetch) {
  const trimmed = url.trim();
  if (!trimmed)
    throw new Error("Enter a URL.");
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("That doesn’t look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported.");
  }
  let response;
  try {
    response = await fetchImpl(parsed.toString(), { redirect: "follow" });
  } catch (e) {
    throw new Error(`Couldn’t fetch ${parsed.hostname} — network error or CORS blocked. (${e.message})`);
  }
  if (!response.ok) {
    throw new Error(`Fetch failed: HTTP ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type");
  const format = detectFormat(parsed.pathname, contentType);
  if (!format) {
    throw new Error("Could not detect format. URL must end in .csv or .jsonl.");
  }
  const text = await response.text();
  return { name: sampleNameFromUrl(parsed, format), text, format };
}
function serializeFlow(spec) {
  const source = (spec.table ? spec.table.split("/").pop() : "") || "input.csv";
  return JSON.stringify({ version: 2, source, spec }, null, 2) + `
`;
}

// packages/file-io/browser-fs.ts
var fsWindow = () => window;

class BrowserFilePort {
  hasFileSystemAccess = typeof window !== "undefined" && typeof fsWindow().showOpenFilePicker === "function";
  async pickOpen(accept) {
    if (this.hasFileSystemAccess) {
      try {
        const [handle] = await fsWindow().showOpenFilePicker({
          multiple: false,
          types: [{ description: "Tables", accept: { "text/*": accept } }]
        });
        if (!handle)
          return null;
        const file = await handle.getFile();
        return { name: file.name, text: await file.text() };
      } catch (e) {
        if (e.name === "AbortError")
          return null;
        throw e;
      }
    }
    return this.pickOpenFallback(accept);
  }
  pickOpenFallback(accept) {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept.join(",");
      input.style.display = "none";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) {
          resolve(null);
          return;
        }
        file.text().then((text) => resolve({ name: file.name, text }), reject);
      });
      document.body.appendChild(input);
      input.click();
    });
  }
  async pickSave(suggestedName, accept, content) {
    if (this.hasFileSystemAccess) {
      try {
        const handle = await fsWindow().showSaveFilePicker({
          suggestedName,
          types: [{ description: "Tables", accept: { "text/*": accept } }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return { status: "saved", name: handle.name };
      } catch (e) {
        if (e.name === "AbortError")
          return { status: "cancelled" };
        throw e;
      }
    }
    const url = URL.createObjectURL(new Blob([content], { type: "application/octet-stream" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { status: "downloaded", name: suggestedName };
  }
}

// packages/file-io/demo.ts
var $ = (id) => document.getElementById(id);
var port = new BrowserFilePort;
$("fio-fsa").textContent = port.hasFileSystemAccess ? "File System Access API: available — Open and Save use real dialogs." : "File System Access API: missing — Open uses an upload field, Save downloads.";
var current = null;
function show(picked, format) {
  current = picked;
  $("fio-name").textContent = picked.name;
  $("fio-format").textContent = format ?? detectFormat(picked.name, null) ?? "unknown";
  $("fio-preview").textContent = picked.text.split(`
`).slice(0, 20).join(`
`);
  $("fio-error").textContent = "";
  $("fio-save").disabled = false;
}
function showError(e) {
  $("fio-error").textContent = e.message;
}
$("fio-open").addEventListener("click", async () => {
  try {
    const picked = await port.pickOpen([".csv", ".jsonl"]);
    if (picked)
      show(picked);
  } catch (e) {
    showError(e);
  }
});
$("fio-fetch").addEventListener("click", async () => {
  $("fio-error").textContent = "";
  try {
    const fetched = await fetchTable($("fio-url").value);
    show(fetched, fetched.format);
  } catch (e) {
    showError(e);
  }
});
$("fio-save").addEventListener("click", async () => {
  if (!current)
    return;
  try {
    const outcome = await port.pickSave(current.name, [".csv", ".jsonl"], current.text);
    $("fio-outcome").textContent = outcome.status === "cancelled" ? "cancelled" : `${outcome.status} as ${outcome.name}`;
  } catch (e) {
    showError(e);
  }
});
var sampleSpec = {
  table: "data/people.csv",
  columns: [{ id: "name" }, { id: "age" }],
  transformations: []
};
$("out").textContent = serializeFlow(sampleSpec);
