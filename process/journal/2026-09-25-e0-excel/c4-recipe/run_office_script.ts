// Runs an Excel Office Script against a CSV, with a minimal stand-in for the ExcelScript API
// (getActiveWorksheet, getUsedRange, getValues, setValues, getRangeByIndexes, getCell, setNumberFormat).
// Prints the sheet as Excel would export it to CSV: numbers with a yyyy-mm-dd format become dates.
import { readFileSync } from "fs";
import { main } from "./script.ts";

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const values: any[][] = parseCsv(readFileSync(process.argv[2], "utf8"));
const fmt: string[][] = values.map(r => r.map(() => "@"));
const range = (r0: number, c0: number, nr: number, nc: number) => ({
  getValues: () => values.slice(r0, r0 + nr).map(r => r.slice(c0, c0 + nc)),
  setValues: (v: any[][]) => v.forEach((row, i) => row.forEach((x, j) => (values[r0 + i][c0 + j] = x))),
  setNumberFormat: (f: string) => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) fmt[r0 + i][c0 + j] = f; },
});
const sheet = {
  getUsedRange: () => range(0, 0, values.length, values[0].length),
  getRangeByIndexes: range,
  getCell: (r: number, c: number) => range(r, c, 1, 1),
};
main({ getActiveWorksheet: () => sheet } as any);
const show = (v: any, f: string) => {
  if (typeof v === "number" && f === "yyyy-mm-dd") return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
console.log(values.map((r, i) => r.map((v, j) => show(v, fmt[i][j])).join(",")).join("\n"));
